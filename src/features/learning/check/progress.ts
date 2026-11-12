import type { UiKey } from "../i18n";
import type { CheckItem } from "../types";
import { formatOf, type Arrangement } from "./formats";

/**
 * The line beside a question's Check button: what is still missing ("2 of 4 matched", "Place your point first"), so a button that
 * cannot be pressed yet always says why. `ready` is true once the answer can be checked. Null when there is nothing worth saying.
 * It only counts what the learner has done; it never hints at what is right.
 */
export interface ProgressNote {
  key: UiKey;
  vars?: Record<string, number>;
  ready: boolean;
}

export interface AnswerSoFar {
  arranged: Arrangement;
  selected: string | null;
  typed: string;
}

export function progressNote(check: CheckItem, { arranged, selected, typed }: AnswerSoFar): ProgressNote | null {
  const paired = (key: UiKey): ProgressNote => {
    const lefts = check.left_entries ?? [];
    const n = lefts.filter((left) => !!arranged.pairs[left]).length;
    return { key, vars: { n, m: lefts.length }, ready: lefts.length > 0 && n === lefts.length };
  };
  switch (formatOf(check)) {
    case "single_choice":
      return selected ? null : { key: "chooseOne", ready: false };
    case "multiple_select":
      return arranged.chosen.length > 0
        ? { key: "chosenCount", vars: { n: arranged.chosen.length }, ready: true }
        : { key: "chooseAtLeastOne", ready: false };
    case "matching_pairs":
      return paired("matchedProgress");
    case "grouping":
      return paired("sortedProgress");
    case "blanks":
      return paired("filledProgress");
    case "sequencing":
      return { key: "orderHint", ready: true };
    case "number_line":
    case "slider":
      return arranged.number !== null && arranged.number !== "" ? null : { key: "placeFirst", ready: false };
    case "tile_builder":
      return arranged.built.length > 0 ? null : { key: "tilesFirst", ready: false };
    case "typed_entry":
      return typed.trim() ? null : { key: "typeFirst", ready: false };
    default:
      return null;
  }
}

/** A written answer's line: how many more characters it needs, else nothing (its own counter shows the length). */
export function writtenNote(length: number, min: number): ProgressNote | null {
  return length < min ? { key: "writtenNeedMore", vars: { n: min - length }, ready: false } : null;
}
