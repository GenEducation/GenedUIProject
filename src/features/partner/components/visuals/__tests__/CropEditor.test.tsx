import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { server } from "@/test/msw/server";
import { makeCrop, makeVisual, visualsFixture, SYNTHETIC_SOURCE } from "@/test/msw/handlers/visuals";
import type { Subject } from "@/features/partner/store/usePartnerStore";

vi.mock("framer-motion", async () => (await import("./framerPassthrough")).framerPassthrough());

import { VisualsModal } from "../VisualsModal";

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
  has_report: false,
  questions: 0,
  created_at: "2026-01-01T00:00:00Z",
};

type Seen = { method: string; url: URL; body?: unknown };
let seen: Seen[] = [];

beforeEach(() => {
  seen = [];
  localStorage.setItem("gened_auth_token", "token-synthetic");
  server.events.on("request:start", async ({ request }) => {
    const body = request.method === "POST" ? await request.clone().json() : undefined;
    seen.push({ method: request.method, url: new URL(request.url), body });
  });
});

afterEach(() => server.events.removeAllListeners());

const crops = () => seen.filter((r) => r.method === "POST" && r.url.pathname.endsWith("/crop"));

/** jsdom lays nothing out: give the page frame a size so pointer positions map onto the page. */
function sizePage() {
  const page = screen.getByTestId("crop-page");
  page.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 600, right: 400, bottom: 600, x: 0, y: 0, toJSON: () => ({}) });
  return page;
}

async function openEditor() {
  render(<VisualsModal subject={row} onClose={vi.fn()} onChanged={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Open SYNTHETIC shape 1" }));
  fireEvent.click(await screen.findByRole("button", { name: "Adjust crop" }));
  await screen.findByAltText("Textbook page 12");
}

describe("CropEditor", () => {
  it("opens a textbook crop (no spec) and offers Adjust crop only for a figure", async () => {
    visualsFixture.reset(() => [makeCrop(), makeVisual()]);
    render(<VisualsModal subject={row} onClose={vi.fn()} onChanged={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Open SYNTHETIC shape 1" }));
    expect(await screen.findByRole("button", { name: "Adjust crop" })).toBeInTheDocument();
    expect(screen.queryByText("The picture should show")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "All visuals" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open SYNTHETIC shape 2" }));
    await screen.findByText("From the textbook");
    expect(screen.queryByRole("button", { name: "Adjust crop" })).toBeNull();
  });

  it("starts on the figure's crop, nudges it with the arrow keys and saves the boxes", async () => {
    visualsFixture.reset(() => [makeCrop()]);
    await openEditor();
    const box = screen.getByRole("button", { name: /^Box 1/ });
    expect(box.style.top).toBe("10%");
    expect(box.style.width).toBe("80%");

    fireEvent.keyDown(box, { key: "ArrowRight" });
    fireEvent.keyDown(box, { key: "ArrowDown", shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Save crop" }));

    await waitFor(() => expect(crops()).toHaveLength(1));
    expect(crops()[0].body).toEqual({ content_hash: "hash-vis-1", boxes: [{ page: 12, box: [125, 105, 525, 905] }] });
    // The new crop opens, pending; the one it replaced was rejected as re-cropped.
    expect(await screen.findByRole("button", { name: "Adjust crop" })).toBeInTheDocument();
    expect(visualsFixture.get("vis-1")!.state).toBe("rejected");
    expect(visualsFixture.get("vis-2")!.parent_id).toBe("vis-1");
  });

  it("draws a second box on the page and joins both, in order", async () => {
    visualsFixture.reset(() => [makeCrop()]);
    await openEditor();
    const page = sizePage();
    fireEvent.pointerDown(page, { clientX: 40, clientY: 360, pointerId: 1 });
    fireEvent.pointerMove(page, { clientX: 360, clientY: 540, pointerId: 1 });
    fireEvent.pointerUp(page, { clientX: 360, clientY: 540, pointerId: 1 });

    expect(within(screen.getByRole("list", { name: "Boxes" })).getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Save crop" }));
    await waitFor(() => expect(crops()).toHaveLength(1));
    expect(crops()[0].body).toEqual({
      content_hash: "hash-vis-1",
      boxes: [
        { page: 12, box: [100, 100, 500, 900] },
        { page: 12, box: [600, 100, 900, 900] },
      ],
    });
  });

  it("moves a box by dragging it and resets to the figure's crop", async () => {
    visualsFixture.reset(() => [makeCrop()]);
    await openEditor();
    const page = sizePage();
    const box = screen.getByRole("button", { name: /^Box 1/ });
    fireEvent.pointerDown(box, { clientX: 200, clientY: 120, pointerId: 1 });
    fireEvent.pointerMove(page, { clientX: 220, clientY: 180, pointerId: 1 });
    fireEvent.pointerUp(page, { pointerId: 1 });
    expect(box.style.top).toBe("20%");
    expect(box.style.left).toBe("15%");

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("button", { name: /^Box 1/ }).style.top).toBe("10%");
  });

  it("removes boxes, and cannot save none", async () => {
    visualsFixture.reset(() => [makeCrop()]);
    await openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Add a box" }));
    expect(screen.getAllByRole("button", { name: /^Remove box/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Remove box 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove box 1" }));
    expect(screen.getByRole("button", { name: "Save crop" })).toBeDisabled();
  });

  it("says so when the figure's pages were never recorded", async () => {
    visualsFixture.reset(() => [makeCrop({}, null)]);
    render(<VisualsModal subject={row} onClose={vi.fn()} onChanged={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Open SYNTHETIC shape 1" }));
    fireEvent.click(await screen.findByRole("button", { name: "Adjust crop" }));
    expect(await screen.findByText("This figure's textbook pages are not available yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to the visual" }));
    expect(await screen.findByRole("button", { name: "Adjust crop" })).toBeInTheDocument();
  });
});
