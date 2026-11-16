import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { PLACEMENT_ITEMS } from "@/test/msw/handlers/placement";
import { usePlacementStore } from "../../store/usePlacementStore";
import type { PlacementBlockContent } from "../../types/placement";

import { PlacementBoard } from "../PlacementBoard";

// mcq, multi_select, true_false: Q1–Q3.
const block = (overrides: Partial<PlacementBlockContent> = {}): PlacementBlockContent => ({
  block_index: 0,
  item_count: 3,
  start_index: 0,
  answered: 0,
  slots: ["mcq_1", "mcq_2", "true_false_1"],
  items: PLACEMENT_ITEMS.slice(0, 3),
  ...overrides,
});
const [q1, q2, q3] = PLACEMENT_ITEMS;

let goNext: ReturnType<typeof vi.fn<() => Promise<void>>>;
const scrolled: Element[] = [];

beforeEach(() => {
  goNext = vi.fn<() => Promise<void>>(async () => {});
  scrolled.length = 0;
  Element.prototype.scrollIntoView = function (this: Element) {
    scrolled.push(this);
  };
  usePlacementStore.setState({
    phase: "item",
    currentBlock: block(),
    currentIndex: 0,
    totalItems: 6,
    totalBlocks: 3,
    draftResponses: {},
    errorMessage: null,
    isSubmitting: false,
    goNext,
  });
});

afterEach(() => {
  usePlacementStore.getState().reset();
});

const card = (itemId: string) => document.querySelector<HTMLElement>(`[data-item-id="${itemId}"]`)!;
const answer = (itemId: string) =>
  act(() => usePlacementStore.getState().setItemDraft(itemId, { choice: "x" } as never));

describe("PlacementBoard — unanswered questions", () => {
  it("Next stays pressable; pressing it with questions unanswered sends nothing and marks them", () => {
    render(<PlacementBoard studentId="s" subjects={["English"]} />);
    answer(q1.item_id);
    expect(screen.queryByText("Not answered")).toBeNull();

    const next = screen.getByRole("button", { name: /Next/ });
    expect(next).toBeEnabled();
    fireEvent.click(next);

    expect(goNext).not.toHaveBeenCalled();
    expect(within(card(q1.item_id)).queryByText("Not answered")).toBeNull();
    expect(within(card(q2.item_id)).getByText("Not answered")).toBeInTheDocument();
    expect(within(card(q3.item_id)).getByText("Not answered")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Answer Q2 and Q3 to continue.");
    // The first unanswered question is brought into view and focused.
    expect(scrolled).toEqual([card(q2.item_id)]);
    expect(card(q2.item_id)).toHaveFocus();
  });

  it("each mark clears as its question is answered, and Next goes on once all are", () => {
    render(<PlacementBoard studentId="s" subjects={["English"]} />);
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getAllByText("Not answered")).toHaveLength(3);

    answer(q1.item_id);
    answer(q2.item_id);
    expect(screen.getAllByText("Not answered")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Answer Q3 to continue.");

    answer(q3.item_id);
    expect(screen.queryByText("Not answered")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(goNext).toHaveBeenCalledTimes(1);
  });

  it("the next screen starts unmarked, and Finish on the last screen checks the same way", () => {
    render(<PlacementBoard studentId="s" subjects={["English"]} />);
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getAllByText("Not answered")).toHaveLength(3);

    act(() => usePlacementStore.setState({ currentBlock: block({ block_index: 2, start_index: 5 }), draftResponses: {} }));
    expect(screen.queryByText("Not answered")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));
    expect(goNext).not.toHaveBeenCalled();
    expect(screen.getAllByText("Not answered")).toHaveLength(3);
  });
});
