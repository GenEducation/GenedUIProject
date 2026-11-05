import { describe, it, expect } from "vitest";
import { formatOf, initialArrangement, isArranged, isComplete, responseFromArrangement } from "../check/formats";
import type { CheckItem } from "../types";

const check = (over: Partial<CheckItem>): CheckItem => ({
  id: "c1",
  prompt: "SYNTHETIC prompt",
  response_type: "mcq",
  role: "checkpoint",
  options: [
    { id: "o1", text: "SYNTHETIC one" },
    { id: "o2", text: "SYNTHETIC two" },
    { id: "o3", text: "SYNTHETIC three" },
  ],
  figure_groups: [],
  ...over,
});

describe("the format registry", () => {
  it("derives the format from the payload, never from the prompt's words", () => {
    expect(formatOf(check({}))).toBe("single_choice");
    expect(formatOf(check({ selection: "single" }))).toBe("single_choice");
    expect(formatOf(check({ selection: "multiple", prompt: "SYNTHETIC pick one" }))).toBe("multiple_select");
    expect(formatOf(check({ response_type: "matching" }))).toBe("matching_pairs");
    expect(formatOf(check({ response_type: "sequence" }))).toBe("sequencing");
    expect(formatOf(check({ response_type: "numeric", options: [] }))).toBe("typed_entry");
  });

  it("marks the three arranged formats as the ones the board draws itself", () => {
    expect(["multiple_select", "matching_pairs", "sequencing"].every((f) => isArranged(f as never))).toBe(true);
    expect(isArranged("single_choice")).toBe(false);
    expect(isArranged("typed_entry")).toBe(false);
  });

  it("builds the response each backend scorer expects", () => {
    const multi = check({ selection: "multiple" });
    expect(responseFromArrangement(multi, initialArrangement(multi))).toBeNull();
    expect(responseFromArrangement(multi, { ...initialArrangement(multi), chosen: ["o1", "o3"] })).toEqual({
      kind: "choice",
      option_ids: ["o1", "o3"],
    });

    const sequence = check({ response_type: "sequence" });
    expect(responseFromArrangement(sequence, { ...initialArrangement(sequence), order: ["SYNTHETIC two", "SYNTHETIC one", "SYNTHETIC three"] })).toEqual({
      kind: "ordered",
      items: ["SYNTHETIC two", "SYNTHETIC one", "SYNTHETIC three"],
    });

    const matching = check({ response_type: "matching", left_entries: ["L1", "L2"] });
    expect(isComplete(matching, { ...initialArrangement(matching), pairs: { L1: "SYNTHETIC one" } })).toBe(false);
    expect(responseFromArrangement(matching, { ...initialArrangement(matching), pairs: { L1: "SYNTHETIC two", L2: "SYNTHETIC one" } })).toEqual({
      kind: "pairs",
      pairs: [
        { left: "L1", right: "SYNTHETIC two" },
        { left: "L2", right: "SYNTHETIC one" },
      ],
    });
  });

  it("starts a sequence in the order the server served the entries", () => {
    const sequence = check({ response_type: "sequence" });
    expect(initialArrangement(sequence).order).toEqual(["SYNTHETIC one", "SYNTHETIC two", "SYNTHETIC three"]);
  });
});
