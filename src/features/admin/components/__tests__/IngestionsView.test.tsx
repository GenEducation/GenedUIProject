import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

/**
 * The Ingestions screen is the only one whose two backends serve different
 * shapes, so the `ingestions` group has to switch the view and not only the
 * host. These tests are about that switch — and about the rollback property it
 * exists to keep: group off ⇒ old view ⇒ MVP.
 *
 * The env has to be re-read per test, so each one re-imports the module tree
 * after stubbing, as `adminApiRouting.test.ts` does.
 */

const listIngestions = vi.hoisted(() => vi.fn());
const listSourceIngestions = vi.hoisted(() => vi.fn());
vi.mock("../../adminService", () => ({ listIngestions, listSourceIngestions }));

const NEW = "https://new.example";

async function renderView(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const { IngestionsView } = await import("../IngestionsView");
  return render(<IngestionsView />);
}

const SOURCE = {
  source_id: "src-1",
  partner_id: "p-1",
  partner_org: "Alpha School",
  board: "CBSE",
  publisher: "Synthetic Press",
  subject: "Mathematics",
  grade: 6,
  book_title: "Book One",
  edition_label: "2026",
  chapter: { ordinal: 2, title: "Fractions", first_pdf_page: 1, last_pdf_page: 3 },
  pdf_file_name: "ch2.pdf",
  page_count: 3,
  state: "running",
  detail: null,
  questions: 4,
  progress: { stage: "read_pages", step: 2, steps: 9, done: 1, total: 3, percent: 22.5, updated_at: "" },
  outcome: { next_step: "wait", can_run_again: false },
  queued_at: null,
  started_at: null,
  finished_at: null,
  created_at: "",
  updated_at: "",
};

beforeEach(() => {
  vi.resetModules();
  listIngestions.mockResolvedValue([]);
  listSourceIngestions.mockResolvedValue({ items: [SOURCE], total_count: 1, limit: 200, offset: 0 });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  listIngestions.mockReset();
  listSourceIngestions.mockReset();
});

describe("IngestionsView", () => {
  it("shows the MVP's screen while the group is off", async () => {
    await renderView({ NEXT_PUBLIC_ADMIN_API_URL: NEW, NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts" });

    await waitFor(() => expect(listIngestions).toHaveBeenCalled());
    expect(listSourceIngestions).not.toHaveBeenCalled();
  });

  it("shows the rebuilt screen once the group is on", async () => {
    await renderView({ NEXT_PUBLIC_ADMIN_API_URL: NEW, NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "ingestions" });

    await waitFor(() => expect(listSourceIngestions).toHaveBeenCalled());
    expect(listIngestions).not.toHaveBeenCalled();
  });

  it("stays on the MVP's screen when there is no new backend to call", async () => {
    // The group named without a URL to send it to is a misconfiguration, and
    // the safe reading of one is "nothing moved".
    await renderView({ NEXT_PUBLIC_ADMIN_API_URL: "", NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "ingestions" });

    await waitFor(() => expect(listIngestions).toHaveBeenCalled());
    expect(listSourceIngestions).not.toHaveBeenCalled();
  });

  it("shows a chapter with its partner, its run state and how far it has got", async () => {
    await renderView({ NEXT_PUBLIC_ADMIN_API_URL: NEW, NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "ingestions" });

    expect(await screen.findByText(/Book One · 2\. Fractions/)).toBeInTheDocument();
    expect(screen.getByText("Alpha School")).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
    expect(screen.getByText(/23% · read pages \(2\/9\)/)).toBeInTheDocument();
    // The decisions waiting on a human: the one actionable number here.
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("names a chapter whose partner account is gone rather than leaving it blank", async () => {
    // A blank cell reads as "no partner", which on the MVP's screen meant a
    // GenEd-wide document. This backend has no such thing.
    listSourceIngestions.mockResolvedValue({
      items: [{ ...SOURCE, partner_org: null }],
      total_count: 1,
      limit: 200,
      offset: 0,
    });

    await renderView({ NEXT_PUBLIC_ADMIN_API_URL: NEW, NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "ingestions" });

    expect(await screen.findByText("Unknown partner")).toBeInTheDocument();
  });
});
