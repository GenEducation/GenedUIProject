import type { PlacementItem, PlacementResponse } from "../../types/placement";

/**
 * Every widget takes the same three things and owns exactly one answer shape.
 *
 * `value` is the draft held by the store, typed loosely here because each
 * widget narrows it to its own variant — a discriminated union on the props
 * would force every call site in the dispatcher to prove the pairing, which is
 * what the dispatcher's `switch` already does.
 */
export interface ItemWidgetProps {
  item: PlacementItem;
  value: PlacementResponse | null;
  onChange: (response: PlacementResponse | null) => void;
  disabled?: boolean;
}

/**
 * Hindi items are authored in Devanagari — prompt, options and strand alike.
 * Tagging the element switches it to Mukta via the `.placement-theme [lang]`
 * rule and tells screen readers to use a Hindi voice.
 */
export function langAttrs(item: PlacementItem) {
  return item.item_language === "hi" ? ({ lang: "hi" } as const) : {};
}
