import { describe, expect, it } from "vitest";
import { isFullWidthSlot, splitVisual } from "../slotGrid";
import type { PlacementSlot } from "../../types/placement";

const item = (item_id: string, slot: PlacementSlot) => ({ item_id, slot });

describe("splitVisual", () => {
  it("separates the visual item from everything else, preserving batch order", () => {
    const items = [
      item("a", "mcq_1"),
      item("b", "mcq_2"),
      item("c", "true_false_1"),
      item("d", "visual_1"),
      item("e", "flex_1"),
    ];
    const { left, visual } = splitVisual(items);

    expect(left.map((i) => i.item_id)).toEqual(["a", "b", "c", "e"]);
    expect(visual.map((i) => i.item_id)).toEqual(["d"]);
  });

  it("a batch with three mcqs, one flex and one visual: all three mcqs stay left, in order", () => {
    // The real composition that broke the old named-area template.
    const items = [
      item("a", "mcq_1"),
      item("b", "flex_1"),
      item("c", "mcq_2"),
      item("d", "mcq_3"),
      item("e", "visual_1"),
    ];
    const { left, visual } = splitVisual(items);

    expect(left.map((i) => i.item_id)).toEqual(["a", "b", "c", "d"]);
    expect(visual.map((i) => i.item_id)).toEqual(["e"]);
  });

  it("no visual slot present: everything stays left", () => {
    const items = [item("a", "mcq_1"), item("b", "true_false_1")];
    const { left, visual } = splitVisual(items);

    expect(left).toHaveLength(2);
    expect(visual).toHaveLength(0);
  });

  it("an empty batch splits into two empty lists", () => {
    expect(splitVisual([])).toEqual({ left: [], visual: [] });
  });
});

describe("isFullWidthSlot", () => {
  it("mcq packs alongside another item", () => {
    expect(isFullWidthSlot("mcq_1")).toBe(false);
    expect(isFullWidthSlot("mcq_3")).toBe(false);
  });

  it("true_false and flex always take the full row", () => {
    expect(isFullWidthSlot("true_false_1")).toBe(true);
    expect(isFullWidthSlot("flex_1")).toBe(true);
    expect(isFullWidthSlot("flex_2")).toBe(true);
  });

  it("a slot with no ordinal suffix still resolves its family (defensive)", () => {
    expect(isFullWidthSlot("flex")).toBe(true);
    expect(isFullWidthSlot("mcq")).toBe(false);
  });
});
