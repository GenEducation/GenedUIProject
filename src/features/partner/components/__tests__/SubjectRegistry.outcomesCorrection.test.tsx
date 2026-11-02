import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { makeSource, sourcesFixture } from "@/test/msw/handlers/sources";
import { visualsFixture } from "@/test/msw/handlers/visuals";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";

vi.mock("framer-motion", async () => (await import("../visuals/__tests__/framerPassthrough")).framerPassthrough());
vi.mock("../IngestedPdfViewer", () => ({ IngestedPdfViewer: () => null }));

import { SubjectRegistry } from "../SubjectRegistry";

const TAUGHT = "G6-MATH-LO1.2.1";
const NOT_TAUGHT = "G6-MATH-LO1.1.1";

const uncovered = makeSource({
  source_id: "synthetic-uncovered",
  state: "invalid",
  subject: "Mathematics",
  grade: 6,
  lo_codes: [NOT_TAUGHT, TAUGHT],
  chapter: { ordinal: 6, title: "SYNTHETIC forces", first_pdf_page: 1, last_pdf_page: 1 },
  progress: {
    stage: "lesson", step: 8, steps: 8, done: 0, total: 0, percent: 100, updated_at: "2026-11-02T07:52:27Z",
    findings: { plan_lo_uncovered: 1 }, uncovered_outcomes: [NOT_TAUGHT],
  },
  outcome: {
    next_step: "fix_outcomes",
    findings: [{ check: "plan_lo_uncovered", count: 1, owner: "partner" }],
    can_run_again: false,
    run_again_blocked: "same_result",
  },
});

beforeEach(() => {
  visualsFixture.reset();
  sourcesFixture.reset(() => [uncovered]);
  usePartnerStore.setState({ subjects: [], subjectFilters: {}, subjectPagination: { total_count: 0, limit: 20, offset: 0 } });
});

function openOutcomes() {
  fireEvent.click(screen.getByRole("button", { name: "Remove outcomes" }));
  return screen.getByRole("dialog", { name: "Remove learning outcomes" });
}

describe("SubjectRegistry — removing outcomes a chapter does not teach", () => {
  it("names the step and offers removal instead of a new upload", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC forces");
    expect(screen.getByText("Remove learning outcomes this chapter doesn't teach")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upload again" })).toBeNull();
  });

  it("starts with the uncovered outcome unticked and names it", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC forces");
    const dialog = openOutcomes();
    const boxes = within(dialog).getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.map((b) => b.checked)).toEqual([false, true]);
    expect(within(dialog).getByTestId("uncovered-outcome")).toHaveTextContent("Not taught in this chapter");
    expect(await within(dialog).findByText("SYNTHETIC outcome one")).toBeInTheDocument();
  });

  it("saves the rest and runs the chapter again", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC forces");
    fireEvent.click(within(openOutcomes()).getByRole("button", { name: "Save and run again" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const saved = usePartnerStore.getState().subjects.find((s) => s.id === "synthetic-uncovered");
    expect(saved?.lo_codes).toEqual([TAUGHT]);
    expect(saved?.state).toBe("queued");
  });

  it("never lets the partner remove every outcome", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC forces");
    const dialog = openOutcomes();
    fireEvent.click(within(dialog).getAllByRole("checkbox")[1]);
    expect(within(dialog).getByRole("button", { name: "Save and run again" })).toBeDisabled();
  });
});
