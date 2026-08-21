import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const submitInteractiveAnswer = vi.fn();
const clearInteractiveResult = vi.fn();
let interactiveResults: Record<string, any> = {};

vi.mock("../../../store/useStudentStore", () => ({
  useStudentStore: () => ({ submitInteractiveAnswer, interactiveResults, clearInteractiveResult }),
}));

import { InteractiveBlock } from "../InteractiveBlock";

beforeEach(() => {
  submitInteractiveAnswer.mockReset();
  clearInteractiveResult.mockReset();
  interactiveResults = {};
});

const gridMeta = (extra: Record<string, any> = {}) => ({
  directive_id: "d1",
  interactive_type: "selectable_grid",
  interaction_type: "select_cells",
  label: "Activity",
  question: "Shade 2 cells",
  render: { shape: "grid", rows: 2, cols: 4 },
  interaction: {},
  ...extra,
});

describe("history / read-only rehydration (the 'show my last answer' behavior)", () => {
  it("with no directive_id, the block is read-only — no Check button", () => {
    const meta = { ...gridMeta(), directive_id: undefined };
    render(<InteractiveBlock directiveId="" meta={meta as any} />);
    expect(screen.queryByRole("button", { name: /check/i })).toBeNull();
  });

  it("a read-only history block surfaces the student's cached result and pre-fills the answer", () => {
    interactiveResults = {
      d1: { is_correct: true, attempts: 1, student_answer: JSON.stringify({ selected: [0, 1] }) },
    };
    // Q1: a history block keeps its directive_id (so the result can be looked up)
    // but is marked read-only so it can't be re-attempted.
    render(<InteractiveBlock directiveId="d1" meta={gridMeta() as any} readOnly />);

    // No Check button (can't retry), but the past result is shown.
    expect(screen.queryByRole("button", { name: /check/i })).toBeNull();
    expect(screen.getByText(/correct/i)).toBeInTheDocument();

    // The two previously-shaded cells are pre-filled (aria-pressed reflects studentAnswer).
    const pressed = screen.getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(2);
  });
});

describe("network failure is not a wrong answer", () => {
  it("a failed submit shows a retry-able error, not the red 'Not quite' banner", async () => {
    submitInteractiveAnswer.mockResolvedValue(null); // store returns null on failure
    render(<InteractiveBlock directiveId="d1" meta={gridMeta() as any} />);

    // By name, not DOM position: `container.querySelector("button")` silently
    // retargets if any button is ever rendered earlier in the tree.
    fireEvent.click(screen.getByRole("button", { name: /cell 1/i })); // shade a cell
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /check/i }));
    });

    expect(screen.getByText(/couldn.t check your answer/i)).toBeInTheDocument();
    expect(screen.queryByText(/not quite/i)).toBeNull();
    // Widget remains usable — the Check button is still present.
    expect(screen.getByRole("button", { name: /check/i })).toBeInTheDocument();
  });
});

describe("ordering activities are never pre-solved", () => {
  const seqMeta = {
    directive_id: "seq1",
    interactive_type: "sortable_sequence",
    interaction_type: "order",
    label: "Activity",
    question: "Put in order",
    render: { items: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }, { id: "d", label: "D" }] },
    interaction: {},
  };

  it("the initial presented order differs from the given (answer) order", async () => {
    submitInteractiveAnswer.mockResolvedValue({ is_correct: false, attempts: 1 });
    render(<InteractiveBlock directiveId="seq1" meta={seqMeta as any} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /check/i }));
    });

    const [, , payload] = submitInteractiveAnswer.mock.calls[0];
    const submitted = JSON.parse(payload).order;
    expect(submitted).toHaveLength(4);
    // Must NOT be the given order ["a","b","c","d"] — otherwise it's pre-solved.
    expect(submitted).not.toEqual(["a", "b", "c", "d"]);
    expect([...submitted].sort()).toEqual(["a", "b", "c", "d"]); // same items, reordered
  });
});
