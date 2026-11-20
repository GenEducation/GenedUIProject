import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import {
  makeSource,
  sourcesFixture,
  SYNTHETIC_OTHER_OUTCOME,
  SYNTHETIC_OUTCOMES,
} from "@/test/msw/handlers/sources";
import { visualsFixture } from "@/test/msw/handlers/visuals";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";

vi.mock("framer-motion", async () =>
  (await import("../visuals/__tests__/framerPassthrough")).framerPassthrough(),
);
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
  chapter: {
    ordinal: 6,
    title: "SYNTHETIC forces",
    first_pdf_page: 1,
    last_pdf_page: 1,
  },
  progress: {
    stage: "lesson",
    step: 8,
    steps: 8,
    done: 0,
    total: 0,
    percent: 100,
    updated_at: "2026-11-02T07:52:27Z",
    findings: { plan_lo_uncovered: 1 },
    uncovered_outcomes: [NOT_TAUGHT],
  },
  outcome: {
    next_step: "fix_outcomes",
    findings: [{ check: "plan_lo_uncovered", count: 1, owner: "partner" }],
    can_run_again: false,
    run_again_blocked: "same_result",
  },
});

beforeEach(() => {
  // the taxonomy of the chapter's subject and grade has one outcome the chapter was not uploaded with
  server.use(
    http.get("*/v1/sources/learning-outcomes", ({ request }) => {
      const q = new URL(request.url).searchParams;
      const known =
        q.get("subject") === "Mathematics" && q.get("grade") === "6";
      return HttpResponse.json(
        known ? [...SYNTHETIC_OUTCOMES, SYNTHETIC_OTHER_OUTCOME] : [],
      );
    }),
  );
  visualsFixture.reset();
  sourcesFixture.reset(() => [uncovered]);
  usePartnerStore.setState({
    subjects: [],
    subjectFilters: {},
    subjectPagination: { total_count: 0, limit: 20, offset: 0 },
  });
});

const OTHER = "G6-MATH-LO1.3.1"; // an outcome of the chapter's subject and grade it was not uploaded with

function openOutcomes() {
  fireEvent.click(screen.getByRole("button", { name: "Change outcomes" }));
  return screen.getByRole("dialog", { name: "Choose learning outcomes" });
}

describe("SubjectRegistry — choosing the outcomes a chapter is checked against", () => {
  it("names the step and offers removal instead of a new upload", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC forces");
    expect(
      screen.getByText("Choose the learning outcomes this chapter teaches"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upload again" })).toBeNull();
  });

  it("starts with the uncovered outcome unticked and names it", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC forces");
    const dialog = openOutcomes();
    const boxes = within(dialog).getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.slice(0, 2).map((b) => b.checked)).toEqual([false, true]);
    expect(within(dialog).getByTestId("uncovered-outcome")).toHaveTextContent(
      "Not taught in this chapter",
    );
    expect(
      await within(dialog).findByText("SYNTHETIC outcome one"),
    ).toBeInTheDocument();
  });

  it("saves the rest and runs the chapter again", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC forces");
    fireEvent.click(
      within(openOutcomes()).getByRole("button", {
        name: "Save and run again",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const saved = usePartnerStore
      .getState()
      .subjects.find((s) => s.id === "synthetic-uncovered");
    expect(saved?.lo_codes).toEqual([TAUGHT]);
    expect(saved?.state).toBe("queued");
  });

  it("never lets the partner remove every outcome", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC forces");
    const dialog = openOutcomes();
    fireEvent.click(within(dialog).getAllByRole("checkbox")[1]);
    expect(
      within(dialog).getByRole("button", { name: "Save and run again" }),
    ).toBeDisabled();
  });

  it("offers the subject and grade's other outcomes, unticked, under their own heading", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC forces");
    const dialog = openOutcomes();
    expect(
      await within(dialog).findByText(
        "Other outcomes of this subject and grade",
      ),
    ).toBeInTheDocument();
    const other = within(dialog)
      .getByText(OTHER)
      .closest("label")!
      .querySelector("input") as HTMLInputElement;
    expect(other.checked).toBe(false);
  });

  it("swaps in another outcome and runs the chapter again", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC forces");
    const dialog = openOutcomes();
    await within(dialog).findByText(OTHER);
    fireEvent.click(
      within(dialog).getByText(OTHER).closest("label")!.querySelector("input")!,
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save and run again" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const saved = usePartnerStore
      .getState()
      .subjects.find((s) => s.id === "synthetic-uncovered");
    expect(saved?.lo_codes).toEqual([TAUGHT, OTHER]);
    expect(saved?.state).toBe("queued");
  });

  it("does not leave a chapter stuck when no outcome is covered: the partner picks others", async () => {
    sourcesFixture.reset(() => [
      {
        ...uncovered,
        progress: {
          ...uncovered.progress!,
          uncovered_outcomes: [NOT_TAUGHT, TAUGHT],
        },
      },
    ]);
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC forces");
    const dialog = openOutcomes();
    await within(dialog).findByText(OTHER);
    const save = within(dialog).getByRole("button", {
      name: "Save and run again",
    });
    expect(
      (within(dialog).getAllByRole("checkbox") as HTMLInputElement[]).some(
        (b) => b.checked,
      ),
    ).toBe(false);
    expect(save).toBeDisabled();
    fireEvent.click(
      within(dialog).getByText(OTHER).closest("label")!.querySelector("input")!,
    );
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      usePartnerStore
        .getState()
        .subjects.find((s) => s.id === "synthetic-uncovered")?.lo_codes,
    ).toEqual([OTHER]);
  });

  it("keeps Save off while the selection is the one already saved", async () => {
    sourcesFixture.reset(() => [
      {
        ...uncovered,
        progress: { ...uncovered.progress!, uncovered_outcomes: [] },
      },
    ]);
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC forces");
    const dialog = openOutcomes();
    expect(
      within(dialog).getByRole("button", { name: "Save and run again" }),
    ).toBeDisabled();
  });

  it("falls back to the chapter's own outcomes when the taxonomy cannot be read", async () => {
    sourcesFixture.reset(() => [{ ...uncovered, subject: "Unlisted subject" }]);
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC forces");
    const dialog = openOutcomes();
    expect(within(dialog).getAllByRole("checkbox")).toHaveLength(2);
    expect(
      within(dialog).queryByText("Other outcomes of this subject and grade"),
    ).toBeNull();
  });
});
