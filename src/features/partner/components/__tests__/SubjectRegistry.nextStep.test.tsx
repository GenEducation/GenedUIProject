import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { makeSource, sourcesFixture } from "@/test/msw/handlers/sources";
import { visualsFixture } from "@/test/msw/handlers/visuals";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";

vi.mock("framer-motion", async () => (await import("../visuals/__tests__/framerPassthrough")).framerPassthrough());
vi.mock("../IngestedPdfViewer", () => ({ IngestedPdfViewer: () => null }));

import { SubjectRegistry } from "../SubjectRegistry";

const noQuestions = makeSource({
  source_id: "synthetic-no-questions",
  state: "invalid",
  detail: "the bundle failed validation; see the report",
  has_report: true,
  chapter: { ordinal: 2, title: "SYNTHETIC no questions", first_pdf_page: 1, last_pdf_page: 1 },
  progress: {
    stage: "submit", step: 8, steps: 9, done: 1, total: 1, percent: 100, updated_at: "2026-10-13T10:27:00Z",
    counts: { pages: 1, questions: 0, questions_removed: 3, violations: 1, model_calls: 0 },
    findings: { single_component_share: 1, plan_gate_order: 1 },
  },
  outcome: {
    next_step: "upload_pages_with_questions",
    findings: [
      { check: "plan_gate_order", count: 1, owner: "gened" },
      { check: "single_component_share", count: 1, owner: "partner" },
    ],
    can_run_again: false,
    run_again_blocked: "same_result",
  },
});

beforeEach(() => {
  visualsFixture.reset();
  sourcesFixture.reset(() => [noQuestions]);
  usePartnerStore.setState({ subjects: [], subjectFilters: {}, subjectPagination: { total_count: 0, limit: 20, offset: 0 } });
});

describe("SubjectRegistry — the next step after a run", () => {
  it("offers an upload prefilled from the chapter, never a re-run that would end the same way", async () => {
    const onUpload = vi.fn();
    render(<SubjectRegistry onUploadClick={onUpload} />);
    await screen.findByText("SYNTHETIC no questions");
    expect(screen.getByText("Upload pages that include the exercises")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Run ingestion again/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Upload again" }));
    expect(onUpload).toHaveBeenCalledWith(expect.objectContaining({ source_id: "synthetic-no-questions" }));
  });

  it("explains the failed checks and who can fix each in the ingestion path", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC no questions");
    fireEvent.click(screen.getByRole("button", { name: /Show ingestion path/ }));
    const next = screen.getByRole("note", { name: "What to do next" });
    const checks = within(next).getByRole("list", { name: "Checks that did not pass" });
    expect(within(checks).getByText(/Too few questions GenEd can check · you can fix this/)).toBeInTheDocument();
    expect(within(checks).getByText(/A GenEd check did not pass · GenEd will look at this/)).toBeInTheDocument();
    const steps = screen.getByRole("list", { name: "Ingestion steps" });
    expect(within(steps).getByText(/Skipped: the chapter did not pass its checks/)).toBeInTheDocument();
  });
});

describe("SubjectRegistry — a published chapter", () => {
  it("shows Live and no review button once published", async () => {
    sourcesFixture.reset(() => [
      makeSource({
        source_id: "synthetic-published",
        state: "ready",
        chapter: { ordinal: 3, title: "SYNTHETIC published", first_pdf_page: 1, last_pdf_page: 1 },
        release: { batch_id: "b-1", state: "published", staged_at: "2026-10-13T10:31:00Z", published_at: "2026-10-13T10:40:00Z" },
      }),
    ]);
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    expect(await screen.findByText("Live")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review & publish/ })).not.toBeInTheDocument();
  });
});
