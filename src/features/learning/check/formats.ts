import type { AnswerResponse, CheckItem } from "../types";

/**
 * The format registry (W2 v2.1 §D, the formats that exist today): which renderer a check needs, derived from what the lesson
 * payload says (`response_type`, `selection`, `entry`), never from the prompt's words. A renderer is ready for a format only when it
 * is listed here with its response builder; a check whose format has none falls back to "type it in the chat", as before.
 */
export type CheckFormat =
  | "single_choice"
  | "multiple_select"
  | "matching_pairs"
  | "sequencing"
  | "number_line"
  | "slider"
  | "tile_builder"
  | "grouping"
  | "blanks"
  | "typed_entry"
  | "written_response"
  | "spoken_response";

export function formatOf(check: CheckItem): CheckFormat {
  const entry = check.entry;
  if (check.response_type === "numeric" && entry && entry.mode !== "tiles") return entry.mode;
  if (check.response_type === "symbolic" && entry?.mode === "tiles") return "tile_builder";
  switch (check.response_type) {
    case "rubric":
      return check.task?.mode === "spoken" ? "spoken_response" : "written_response";
    case "mcq":
      return check.selection === "multiple" ? "multiple_select" : "single_choice";
    case "matching":
      return "matching_pairs";
    case "sequence":
      return "sequencing";
    case "grouping":
      return "grouping";
    case "blanks":
      return "blanks";
    default:
      return "typed_entry";
  }
}

/** The formats the board draws with its own controls (everything but a typed box and plain single choice). */
export function isArranged(format: CheckFormat): boolean {
  return format !== "single_choice" && format !== "typed_entry" && format !== "written_response" && format !== "spoken_response";
}

/** What the learner has built so far, for one arranged check. */
export interface Arrangement {
  /** Ids of the options chosen (multiple select). */
  chosen: string[];
  /** The entries in the learner's order, as text (sequencing). */
  order: string[];
  /** Left entry -> the option's text chosen for it (matching, grouping: the group; blanks: the bank entry). */
  pairs: Record<string, string>;
  /** The number placed on a line or slider, as the text to send; null until the learner places one. */
  number: string | null;
  /** The positions, in the tile bank, of the tiles placed in the answer row, in order. */
  built: number[];
}

/** The order a sequence starts in: the options as served (the server never serves them in the key's order). */
export function initialArrangement(check: CheckItem): Arrangement {
  return { chosen: [], order: check.options.map((o) => o.text), pairs: {}, number: null, built: [] };
}

/** The tiles of a tile check, as served. */
export function tilesOf(check: CheckItem): string[] {
  return check.entry?.mode === "tiles" ? check.entry.tiles : [];
}

/** Whether there is an answer worth sending: something chosen, every left entry paired, an order, a number placed, tiles built. */
export function isComplete(check: CheckItem, value: Arrangement): boolean {
  switch (formatOf(check)) {
    case "multiple_select":
      return value.chosen.length > 0;
    case "matching_pairs":
      return (check.left_entries ?? []).length > 0 && (check.left_entries ?? []).every((left) => !!value.pairs[left]);
    case "sequencing":
      return value.order.length === check.options.length && value.order.length > 1;
    case "number_line":
    case "slider":
      return value.number !== null && value.number !== "";
    case "tile_builder":
      return value.built.length > 0;
    case "grouping":
    case "blanks":
      return (check.left_entries ?? []).length > 0 && (check.left_entries ?? []).every((left) => !!value.pairs[left]);
    default:
      return false;
  }
}

/** The structured answer for an arranged check (backend `ChoiceResponse`, `OrderedResponse`, `PairsResponse`, `NumericResponse`,
 *  `TextResponse`), or null. Tiles are sent as the expression they spell, tile texts joined by spaces. */
export function responseFromArrangement(check: CheckItem, value: Arrangement): AnswerResponse | null {
  if (!isComplete(check, value)) return null;
  switch (formatOf(check)) {
    case "multiple_select":
      return { kind: "choice", option_ids: value.chosen };
    case "sequencing":
      return { kind: "ordered", items: value.order };
    case "matching_pairs":
    case "grouping":
    case "blanks":
      return { kind: "pairs", pairs: (check.left_entries ?? []).map((left) => ({ left, right: value.pairs[left] })) };
    case "number_line":
    case "slider":
      return { kind: "numeric", value: value.number as string };
    case "tile_builder": {
      const tiles = tilesOf(check);
      return { kind: "text", text: value.built.map((i) => tiles[i]).join(" ") };
    }
    default:
      return null;
  }
}
