import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FoldedActivity, placeActivities } from "../components/ActivityCard";

/** R2 (owner's decision of 2026-11-15): an activity shows where its book text was taught; attempted, it folds away with a way to try
 * again; not yet taught, or unrelated to the step, it is not drawn. An older server (no placement) shows every activity. */
describe("activity placement", () => {
  const acts = [{ item_id: "a" }, { item_id: "b" }, { item_id: "c" }, { item_id: "d" }];

  it("shows open ones, folds done ones, hides not-yet and unrelated ones", () => {
    const placed = placeActivities(acts, [
      { item_id: "a", status: "open" }, { item_id: "b", status: "done" },
      { item_id: "c", status: "not_yet" }, { item_id: "d", status: "unrelated" },
    ]);
    expect(placed.map((p) => [p.activity.item_id, p.folded])).toEqual([["a", false], ["b", true]]);
  });

  it("shows everything for a server without placement", () => {
    expect(placeActivities(acts, undefined)).toHaveLength(4);
  });

  it("a folded activity opens again on Try again", () => {
    render(<FoldedActivity><p>SYNTHETIC activity card</p></FoldedActivity>);
    expect(screen.getByTestId("activity-folded")).toHaveTextContent("Activity done");
    expect(screen.queryByText("SYNTHETIC activity card")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("SYNTHETIC activity card")).toBeInTheDocument();
  });
});
