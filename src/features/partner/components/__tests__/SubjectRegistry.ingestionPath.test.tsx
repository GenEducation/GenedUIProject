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
    }),
  ]);
  usePartnerStore.setState({ subjects: [], subjectFilters: {}, subjectPagination: { total_count: 0, limit: 20, offset: 0 } });
});

describe("SubjectRegistry — ingestion path", () => {
  it("opens what, how and where for a chapter", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC path chapter");
    expect(screen.queryByRole("region", { name: /ingestion path/ })).toBeNull();

    const toggle = screen.getByRole("button", { name: /Show ingestion path/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("region", { name: "SYNTHETIC path chapter: ingestion path" });

    expect(within(panel).getByText("SYNTHETIC-upload.pdf")).toBeInTheDocument();
    expect(within(panel).getByText("PDF pages 3–38 (36)")).toBeInTheDocument();
    const steps = within(panel).getByRole("list", { name: "Ingestion steps" });
    expect(within(steps).getByText("1 unreadable")).toBeInTheDocument();
    expect(within(steps).getByText("41 questions")).toBeInTheDocument();
    expect(within(panel).getByText(/120 AI requests so far/)).toBeInTheDocument();
    expect(within(panel).getByText(/Took 38 min/)).toBeInTheDocument();
    const where = within(panel).getByRole("list", { name: "Where the result goes" });
    expect(within(where).getByText(/Waiting for your review/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Hide ingestion path/ }));
    expect(screen.queryByRole("region", { name: /ingestion path/ })).toBeNull();
  });
});
