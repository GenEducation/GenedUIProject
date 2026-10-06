import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { makeVisual, visualsFixture, SYNTHETIC_SOURCE } from "@/test/msw/handlers/visuals";
import type { Subject } from "@/features/partner/store/usePartnerStore";
import type { VisualDetail } from "@/features/partner/types/visuals";

vi.mock("framer-motion", async () => (await import("./framerPassthrough")).framerPassthrough());

import { VisualsModal } from "../VisualsModal";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

const row: Subject = {
  id: SYNTHETIC_SOURCE,
  source_id: SYNTHETIC_SOURCE,
  title: "SYNTHETIC chapter document",
  book_title: "SYNTHETIC Book",
  chapter_ordinal: 1,
  subject: "Mathematics",
  grade: 6,
  board: "CBSE",
  publisher: "synthetic_press",
  state: "ready",
  detail: null,
  created_at: "2026-01-01T00:00:00Z",
};

type Seen = { method: string; url: URL; body?: unknown };
let seen: Seen[] = [];

beforeEach(() => {
  visualsFixture.reset();
  seen = [];
  localStorage.setItem("gened_auth_token", "token-synthetic");
  server.events.on("request:start", async ({ request }) => {
    const body = request.method === "POST" ? await request.clone().json() : undefined;
    seen.push({ method: request.method, url: new URL(request.url), body });
  });
});

afterEach(() => server.events.removeAllListeners());

const gets = (path: string) => seen.filter((r) => r.method === "GET" && r.url.pathname.endsWith(path));
const posts = (path: string) => seen.filter((r) => r.method === "POST" && r.url.pathname.endsWith(path));

function open(subject: Subject = row) {
  const onChanged = vi.fn();
  render(<VisualsModal subject={subject} onClose={vi.fn()} onChanged={onChanged} />);
  return { onChanged };
}

describe("VisualsModal — list", () => {
  it("shows pending cards with the AI flagged and New version chips", async () => {
    open();
    expect(await screen.findByRole("button", { name: "Open SYNTHETIC shape 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open SYNTHETIC shape 2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open SYNTHETIC shape 3" })).not.toBeInTheDocument();

    const flagged = screen.getByRole("button", { name: "Open SYNTHETIC shape 1" });
    expect(within(flagged).getByText("AI flagged")).toBeInTheDocument();
    expect(within(flagged).queryByText("New version")).not.toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "Open SYNTHETIC shape 2" })).getByText("New version")).toBeInTheDocument();

    // Scoped by source_id, not by subject/grade.
    expect(gets("/v1/visuals/candidates")[0].url.searchParams.get("source_id")).toBe(SYNTHETIC_SOURCE);
  });

  it("shows the empty state when nothing is waiting", async () => {
    visualsFixture.reset(() => []);
    open();
    expect(await screen.findByText("No visuals waiting for review.")).toBeInTheDocument();
  });

  it("switches to the Accepted tab", async () => {
    open();
    await screen.findByRole("button", { name: "Open SYNTHETIC shape 1" });
    fireEvent.click(screen.getByRole("tab", { name: /Accepted/ }));
    expect(await screen.findByRole("button", { name: "Open SYNTHETIC shape 3" })).toBeInTheDocument();
  });

  it("shows a placeholder for a null image_url", async () => {
    visualsFixture.reset(() => [makeVisual({ image_url: null })]);
    open();
    await screen.findByRole("button", { name: "Open SYNTHETIC shape 1" });
    expect(screen.getByTestId("visual-image-placeholder")).toBeInTheDocument();
  });

  it("refetches the list once when an image fails (expired signature), and never loops", async () => {
    visualsFixture.reset(() => [makeVisual()]);
    open();
    await screen.findByRole("button", { name: "Open SYNTHETIC shape 1" });
    const listCalls = () => gets("/v1/visuals/candidates").filter((r) => r.url.searchParams.get("state") === "pending").length;
    const before = listCalls();

    // The refetch hands back a freshly signed URL.
    visualsFixture.get("vis-1")!.image_url = "/v1/visual-images/vis-1?exp=2&sig=fresh";
    fireEvent.error(screen.getByAltText("SYNTHETIC shape 1"));
    expect(screen.getByTestId("visual-image-placeholder")).toBeInTheDocument();
    await waitFor(() => expect(listCalls()).toBe(before + 1));

    const fresh = await screen.findByAltText("SYNTHETIC shape 1");
    expect(fresh.getAttribute("src")).toContain("sig=fresh");

    // That one fails too: placeholder, and no second refetch.
    fireEvent.error(fresh);
    expect(await screen.findByTestId("visual-image-placeholder")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(listCalls()).toBe(before + 1);
  });
});

describe("VisualsModal — detail and decisions", () => {
  async function openDetail(name = "SYNTHETIC shape 2") {
    const ctx = open();
    fireEvent.click(await screen.findByRole("button", { name: `Open ${name}` }));
    await screen.findByText("From the textbook");
    return ctx;
  }

  it("shows the textbook passages it was drawn from, the checklist and the AI flags", async () => {
    await openDetail("SYNTHETIC shape 1");
    expect(screen.getByText("SYNTHETIC passage one.")).toBeVisible();
    // p2 isn't in source_refs: tucked under "Other passages".
    expect(screen.getByText(/Other passages from this concept \(1\)/)).toBeInTheDocument();
    expect(screen.getByText("SYNTHETIC checklist item")).toBeInTheDocument();
    expect(screen.getByText("The AI reviewer flagged:")).toBeInTheDocument();
    expect(screen.getByText("SYNTHETIC problem: label overlaps")).toBeInTheDocument();
  });

  it("accepts with {content_hash, decision} and moves to the next pending visual", async () => {
    const { onChanged } = await openDetail("SYNTHETIC shape 2");
    fireEvent.click(screen.getByRole("button", { name: /Accept/ }));

    await waitFor(() => expect(posts("/decision")).toHaveLength(1));
    expect(posts("/decision")[0].body).toEqual({ content_hash: "hash-vis-2", decision: "accept" });
    expect(visualsFixture.get("vis-2")!.state).toBe("accepted");
    expect(onChanged).toHaveBeenCalled();

    // Advanced to the other pending one.
    expect(await screen.findByText("SYNTHETIC concept 1")).toBeInTheDocument();
  });

  it("accepts with the A key", async () => {
    await openDetail("SYNTHETIC shape 2");
    fireEvent.keyDown(document, { key: "a" });
    await waitFor(() => expect(posts("/decision")).toHaveLength(1));
  });

  it("needs a reason to reject, and asks for a new version by default", async () => {
    await openDetail("SYNTHETIC shape 2");
    fireEvent.click(screen.getByRole("button", { name: /^Reject/ }));

    const submit = screen.getByRole("button", { name: "Reject & remake" });
    expect(submit).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Make a new version" })).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Too busy" }));
    fireEvent.change(screen.getByLabelText(/Note/), { target: { value: "SYNTHETIC note" } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(posts("/decision")).toHaveLength(1));
    expect(posts("/decision")[0].body).toEqual({
      content_hash: "hash-vis-2",
      decision: "reject",
      reason_codes: ["cluttered"],
      note: "SYNTHETIC note",
      regenerate: true,
    });
  });

  it("rejects without a new version when the toggle is off", async () => {
    await openDetail("SYNTHETIC shape 2");
    fireEvent.click(screen.getByRole("button", { name: /^Reject/ }));
    fireEvent.click(screen.getByRole("button", { name: "Wrong or misleading" }));
    fireEvent.click(screen.getByRole("switch", { name: "Make a new version" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(posts("/decision")).toHaveLength(1));
    expect(posts("/decision")[0].body).toMatchObject({ regenerate: false, note: null });
  });

  it("on a 409 shows the message, reloads the visual and keeps the session", async () => {
    server.use(
      http.post(`${BASE}/v1/visuals/candidates/:id/decision`, () =>
        HttpResponse.json({ error_code: "VIS_409", message: "SYNTHETIC: someone already decided this." }, { status: 409 }),
      ),
    );
    await openDetail("SYNTHETIC shape 2");
    const readsBefore = gets("/candidates/vis-2").length;

    fireEvent.click(screen.getByRole("button", { name: /Accept/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("SYNTHETIC: someone already decided this.");
    await waitFor(() => expect(gets("/candidates/vis-2").length).toBe(readsBefore + 1));
    expect(localStorage.getItem("gened_auth_token")).toBe("token-synthetic");
  });
});

describe("VisualsModal — new versions", () => {
  const rejected = (regeneration: VisualDetail["regeneration"]) =>
    makeVisual({
      id: "vis-r",
      state: "rejected",
      decision: { decision: "reject", reason_codes: ["unclear"], note: "SYNTHETIC note", actor_role: "PARTNER", decided_at: "2026-01-02T00:00:00Z" },
      regeneration,
    });

  async function openRejected() {
    open();
    fireEvent.click(await screen.findByRole("tab", { name: /Rejected/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Open SYNTHETIC shape/ }));
    await screen.findByText("From the textbook");
  }

  it("links to the new version once it is done", async () => {
    visualsFixture.reset(() => [
      rejected({ id: "r1", state: "done", attempts: 1, result_candidate_id: "vis-new", error: null, created_at: "2026-01-02T00:00:00Z", finished_at: "2026-01-02T00:01:00Z" }),
      makeVisual({ id: "vis-new", parent_id: "vis-r" }),
    ]);
    await openRejected();
    fireEvent.click(screen.getByRole("button", { name: "Review the new version" }));
    await waitFor(() => expect(gets("/candidates/vis-new").length).toBe(1));
  });

  it("shows the failure and Try again posts to /regenerate with the original reasons", async () => {
    visualsFixture.reset(() => [
      rejected({ id: "r1", state: "failed", attempts: 1, result_candidate_id: null, error: "SYNTHETIC render error", created_at: "2026-01-02T00:00:00Z", finished_at: "2026-01-02T00:01:00Z" }),
    ]);
    await openRejected();
    expect(screen.getByText("SYNTHETIC render error")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(posts("/regenerate")).toHaveLength(1));
    expect(posts("/regenerate")[0].body).toEqual({ reason_codes: ["unclear"], note: "SYNTHETIC note" });
    expect(await screen.findByText("Making a new version…")).toBeInTheDocument();
  });
});
