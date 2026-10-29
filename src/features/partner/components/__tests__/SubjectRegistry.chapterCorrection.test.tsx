import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { makeSource, sourcesFixture } from "@/test/msw/handlers/sources";
import { visualsFixture } from "@/test/msw/handlers/visuals";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";

vi.mock("framer-motion", async () => (await import("../visuals/__tests__/framerPassthrough")).framerPassthrough());
vi.mock("../IngestedPdfViewer", () => ({ IngestedPdfViewer: () => null }));

import { SubjectRegistry } from "../SubjectRegistry";

const REFUSAL = "Chapter 4 of this book is already titled 'SYNTHETIC right'.";

const mismatched = makeSource({
  source_id: "synthetic-mismatch",
  state: "ready",
  book_title: "SYNTHETIC Test Book",
  edition_label: "SYNTHETIC TEST DATA",
  chapter: { ordinal: 4, title: "SYNTHETIC wrong title", first_pdf_page: 1, last_pdf_page: 1 },
  progress: {
    stage: "submit", step: 9, steps: 9, done: 1, total: 1, percent: 100, updated_at: "2026-10-29T10:00:00Z",
    refusal: { code: "chapter_mismatch", path: "chapters[0].title", detail: REFUSAL },
  },
  outcome: {
    next_step: "fix_chapter_details",
    findings: [{ check: "chapter_mismatch", count: 1, owner: "partner" }],
    can_run_again: false,
    run_again_blocked: "same_result",
  },
});

const other = makeSource({
  source_id: "synthetic-three",
  state: "ready",
  book_title: "SYNTHETIC Test Book",
  chapter: { ordinal: 3, title: "SYNTHETIC three", first_pdf_page: 1, last_pdf_page: 1 },
});

beforeEach(() => {
  visualsFixture.reset();
  sourcesFixture.reset(() => [mismatched, other]);
  usePartnerStore.setState({ subjects: [], subjectFilters: {}, subjectPagination: { total_count: 0, limit: 20, offset: 0 } });
});

function openCorrection() {
  fireEvent.click(screen.getByRole("button", { name: "Fix chapter details" }));
  return screen.getByRole("dialog", { name: "Correct the chapter's details" });
}

describe("SubjectRegistry — correcting a chapter core files differently", () => {
  it("names the step, offers the fix instead of a re-run, and shows what core already has", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC wrong title");
    expect(screen.getByText("Check the chapter's number and title")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upload again" })).toBeNull();
    const dialog = openCorrection();
    expect(within(dialog).getByTestId("correction-refusal")).toHaveTextContent(REFUSAL);
    expect(within(dialog).getByDisplayValue("SYNTHETIC wrong title")).toBeInTheDocument();
  });

  it("saves the corrected title and runs the chapter again", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC wrong title");
    const dialog = openCorrection();
    fireEvent.change(within(dialog).getByDisplayValue("SYNTHETIC wrong title"), { target: { value: "SYNTHETIC right" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save and run again" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const saved = usePartnerStore.getState().subjects.find((s) => s.id === "synthetic-mismatch");
    expect(saved?.title).toBe("SYNTHETIC right");
    expect(saved?.state).toBe("queued");
  });

  it("keeps the form open with the server's reason when the place is taken", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC wrong title");
    const dialog = openCorrection();
    fireEvent.change(within(dialog).getByDisplayValue("4"), { target: { value: "3" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save and run again" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("already uploaded as 'SYNTHETIC three'");
    expect(usePartnerStore.getState().subjects.find((s) => s.id === "synthetic-mismatch")?.state).toBe("ready");
  });
});
