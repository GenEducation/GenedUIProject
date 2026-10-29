import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    fireEvent.click(screen.getByRole("button", { name: /Run details/ }));
    const next = screen.getByRole("note", { name: "What to do next" });
    const checks = within(next).getByRole("list", { name: "Checks that did not pass" });
    expect(within(checks).getByText(/Too few questions GenEd can check · you can fix this/)).toBeInTheDocument();
    expect(within(checks).getByText(/A GenEd check did not pass · GenEd will look at this/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Show all \d steps/ }));
    const steps = screen.getByRole("group", { name: "Ingestion steps" });
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
    expect(await screen.findByText("Live for students")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review & publish/ })).not.toBeInTheDocument();
  });

  it("offers Retry on a lost running run the server says to run again, and starts it", async () => {
    const lost = makeSource({
      source_id: "synthetic-lost-run",
      state: "running",
      chapter: { ordinal: 3, title: "SYNTHETIC lost run", first_pdf_page: 1, last_pdf_page: 1 },
      started_at: "2026-10-13T09:00:00Z",
      progress: { stage: "questions", step: 5, steps: 9, done: 0, total: 0, percent: 50, updated_at: "2026-10-13T09:05:00Z" },
      outcome: { next_step: "run_again", findings: [], can_run_again: true, run_again_blocked: null },
    });
    sourcesFixture.reset(() => [lost]);
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC lost run");
    expect(screen.getByText(/^No update since /)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry ingestion" }));
    expect(await screen.findByText("Waiting in line to start")).toBeInTheDocument();
  });

  it("offers no run button on a running run the server has not given up on", async () => {
    const live = makeSource({
      source_id: "synthetic-live-run",
      state: "running",
      chapter: { ordinal: 4, title: "SYNTHETIC live run", first_pdf_page: 1, last_pdf_page: 1 },
      progress: { stage: "questions", step: 5, steps: 9, done: 0, total: 0, percent: 50, updated_at: new Date().toISOString() },
      outcome: { next_step: "wait", findings: [], can_run_again: false, run_again_blocked: "already_running" },
    });
    sourcesFixture.reset(() => [live]);
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC live run");
    expect(screen.queryByRole("button", { name: /Retry ingestion|Run ingestion again/ })).toBeNull();
    expect(screen.queryByText(/^No update since /)).toBeNull();
  });

  it("offers Review & publish only when the server's next step is review_release", async () => {
    const base = { state: "ready" as const, has_report: true, release: null };
    const toReview = makeSource({
      ...base, source_id: "synthetic-to-review",
      chapter: { ordinal: 5, title: "SYNTHETIC to review", first_pdf_page: 1, last_pdf_page: 1 },
      outcome: { next_step: "review_release", findings: [], can_run_again: true, run_again_blocked: null },
    });
    const toVisuals = makeSource({
      ...base, source_id: "synthetic-to-visuals",
      chapter: { ordinal: 6, title: "SYNTHETIC to visuals", first_pdf_page: 1, last_pdf_page: 1 },
      outcome: { next_step: "contact_gened", findings: [], can_run_again: false, run_again_blocked: "same_result" },
    });
    sourcesFixture.reset(() => [toReview, toVisuals]);
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC to review");
    expect(screen.getAllByRole("button", { name: /Review & publish/ })).toHaveLength(1);
    const row = document.querySelector('[data-source-row="synthetic-to-visuals"]') as HTMLElement;
    expect(within(row).queryByRole("button", { name: /Review & publish/ })).toBeNull();
  });
});

describe("SubjectRegistry — the filter bar", () => {
  it("applies the filters on Enter, from the search box or a dropdown", async () => {
    const user = userEvent.setup();
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC no questions");
    await user.click(screen.getByRole("button", { name: /Filters/ }));

    await user.type(screen.getByPlaceholderText("Book or chapter title..."), "nothing matches{Enter}");
    await waitFor(() => expect(usePartnerStore.getState().subjectFilters).toEqual({ search: "nothing matches" }));
    await waitFor(() => expect(screen.queryByText("SYNTHETIC no questions")).toBeNull());

    await user.clear(screen.getByPlaceholderText("Book or chapter title..."));
    screen.getByRole("combobox", { name: "Status" }).focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(usePartnerStore.getState().subjectFilters).toEqual({}));
  });
});
