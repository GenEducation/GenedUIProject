import { slotFamily, type PlacementSlot } from "../types/placement";

/**
 * Whether an item in this slot should take the full width of the left
 * region rather than pack alongside another item. `true_false` (a toggle)
 * and `flex` (reorder/pair/type — often a list or a table) read badly
 * squeezed to half width; `mcq` (a plain list of choices) doesn't.
 */
export function isFullWidthSlot(slot: PlacementSlot): boolean {
  const family = slotFamily(slot);
  return family === "true_false" || family === "flex";
}

/**
 * Splits a batch's items into the ones that go in the dedicated `visual`
 * column and everything else, which flows through the left region in the
 * batch's own order.
 *
 * Deliberately NOT a named-`grid-template-areas` template keyed by exact
 * slot values (what this replaced): that approach required every row's area
 * name to be unique and matched a fixed pairing rule, which broke the
 * moment a real batch's composition didn't fit the rule cleanly (three
 * `mcq`s only pair two of three; the CSS spec's own uniqueness requirement
 * on area names makes the resulting template brittle to construct
 * correctly by hand). Splitting into "does it get the right column" and
 * "does it take one cell or two" is the whole layout decision — the browser
 * handles wrapping and row heights on its own from there, so no per-batch
 * shape can produce a malformed template again.
 */
export function splitVisual<T extends { slot: PlacementSlot }>(items: T[]): { left: T[]; visual: T[] } {
  const visual: T[] = [];
  const left: T[] = [];
  for (const item of items) {
    (slotFamily(item.slot) === "visual" ? visual : left).push(item);
  }
  return { left, visual };
}
