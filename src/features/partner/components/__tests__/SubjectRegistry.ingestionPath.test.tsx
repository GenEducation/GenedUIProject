import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { makeSource, sourcesFixture } from "@/test/msw/handlers/sources";
import { visualsFixture } from "@/test/msw/handlers/visuals";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";

vi.mock("framer-motion", async () => (await import("../visuals/__tests__/framerPassthrough")).framerPassthrough());
vi.mock("../IngestedPdfViewer", () => ({ IngestedPdfViewer: () => null }));

import { SubjectRegistry } from "../SubjectRegistry";

beforeEach(() => {
  visualsFixture.reset();
  sourcesFixture.reset(() => [
    makeSource({
      source_id: "synthetic-path",
      state: "ready",
      pdf_file_name: "SYNTHETIC-upload.pdf",
      chapter: { ordinal: 4, title: "SYNTHETIC path chapter", first_pdf_page: 3, last_pdf_page: 38 },
      started_at: "2026-10-13T09:02:00Z",
      finished_at: "2026-10-13T09:40:00Z",
      progress: {
        stage: "submit", step: 9, steps: 9, done: 1, total: 1, percent: 100, updated_at: "2026-10-13T09:40:00Z",
        counts: { pages: 36, unreadable_pages: 1, questions: 41, violations: 0, model_calls: 120 },
      },
      release: { batch_id: "synthetic-batch", state: "ready", staged_at: "2026-10-13T09:41:00Z", published_at: null },
      outcome: { next_step: "review_release", findings: [], can_run_again: true, run_again_blocked: null },
    }),
  ]);
  usePartnerStore.setState({ subjects: [], subjectFilters: {}, subjectPagination: { total_count: 0, limit: 20, offset: 0 } });
});

describe("SubjectRegistry — ingestion path", () => {
  it("opens what it needs, the run, what it found and where it goes", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC path chapter");
    expect(screen.queryByRole("region", { name: /ingestion path/ })).toBeNull();

    const toggle = screen.getByRole("button", { name: /Run details/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("region", { name: "SYNTHETIC path chapter: ingestion path" });

    // What it needs first, the run in phases with what each produced, and the upload in one line.
    expect(within(panel).getByRole("note", { name: "What to do next" })).toHaveTextContent("Ready for your review");
    const phases = within(panel).getByRole("list", { name: "Run phases" });
    expect(within(phases).getByText("36 pages · 1 unreadable")).toBeInTheDocument();
    expect(within(within(panel).getByRole("list", { name: "Needs your attention" })).getByText("1 page couldn't be read")).toBeInTheDocument();
    expect(within(panel).getByText("SYNTHETIC-upload.pdf")).toBeInTheDocument();
    expect(within(panel).getByText("PDF pages 3–38 (36)")).toBeInTheDocument();

    // Every stage, who does it and what it produced, one click away.
    expect(within(panel).queryByRole("group", { name: "Ingestion steps" })).toBeNull();
    fireEvent.click(within(panel).getByRole("button", { name: /Show all 9 steps/ }));
    const steps = within(panel).getByRole("group", { name: "Ingestion steps" });
    expect(within(steps).getByText("1 unreadable")).toBeInTheDocument();
    expect(within(steps).getByText("41 questions")).toBeInTheDocument();
    expect(within(panel).getByText(/120 AI requests so far/)).toBeInTheDocument();
    expect(within(panel).getByText(/Took 38 min/)).toBeInTheDocument();
    const where = within(panel).getByRole("list", { name: "Where the result goes" });
    expect(within(where).getByText(/Waiting for your review/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Hide run details/ }));
    expect(screen.queryByRole("region", { name: /ingestion path/ })).toBeNull();
  });
});
