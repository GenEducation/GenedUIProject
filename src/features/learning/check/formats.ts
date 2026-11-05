import type { AnswerResponse, CheckItem } from "../types";

/**
 * The format registry (W2 v2.1 §D, the formats that exist today): which renderer a check needs, derived from what the lesson
 * payload says (`response_type`, `selection`), never from the prompt's words. A renderer is ready for a format only when it is
 * listed here with its response builder; a check whose format has none falls back to "type it in the chat", as before.
 */
export type CheckFormat = "single_choice" | "multiple_select" | "matching_pairs" | "sequencing" | "typed_entry";

export function formatOf(check: CheckItem): CheckFormat {
  switch (check.response_type) {
    case "mcq":
      return check.selection === "multiple" ? "multiple_select" : "single_choice";
    case "matching":
      return "matching_pairs";
    case "sequence":
      return "sequencing";
    default:
      return "typed_entry";
  }
}

/** The three arranged formats the board draws with its own controls. */
export function isArranged(format: CheckFormat): boolean {
  return format === "multiple_select" || format === "matching_pairs" || format === "sequencing";
}

/** What the learner has built so far, for one arranged check. */
export interface Arrangement {
  /** Ids of the options chosen (multiple select). */
  chosen: string[];
  /** The entries in the learner's order, as text (sequencing). */
  order: string[];
  /** Left entry -> the right option's text chosen for it (matching). */
  pairs: Record<string, string>;
}

/** The order a sequencing check starts in: the options as served (the server never serves them in the key's order). */
export function initialArrangement(check: CheckItem): Arrangement {
  return { chosen: [], order: check.options.map((o) => o.text), pairs: {} };
}

/** Whether there is an answer worth sending: something chosen, every left entry paired, or an order (always complete). */
export function isComplete(check: CheckItem, value: Arrangement): boolean {
  switch (formatOf(check)) {
    case "multiple_select":
      return value.chosen.length > 0;
    case "matching_pairs":
      return (check.left_entries ?? []).length > 0 && (check.left_entries ?? []).every((left) => !!value.pairs[left]);
    case "sequencing":
      return value.order.length === check.options.length && value.order.length > 1;
    default:
      return false;
  }
}

/** The structured answer for an arranged check (backend `ChoiceResponse`, `OrderedResponse`, `PairsResponse`), or null. */
export function responseFromArrangement(check: CheckItem, value: Arrangement): AnswerResponse | null {
  if (!isComplete(check, value)) return null;
  switch (formatOf(check)) {
    case "multiple_select":
      return { kind: "choice", option_ids: value.chosen };
    case "sequencing":
      return { kind: "ordered", items: value.order };
    case "matching_pairs":
      return { kind: "pairs", pairs: (check.left_entries ?? []).map((left) => ({ left, right: value.pairs[left] })) };
    default:
      return null;
  }
}
