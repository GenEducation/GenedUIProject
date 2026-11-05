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

describe("the P2 formats", () => {
  const numeric = (entry: CheckItem["entry"]): CheckItem => check({ response_type: "numeric", options: [], entry });
  const line = { mode: "number_line", min: "0", max: "10", step: "1" } as const;

  it("takes a number line, a slider and tiles from the entry, and a check without one is answered as before", () => {
    expect(formatOf(numeric(line))).toBe("number_line");
    expect(formatOf(numeric({ ...line, mode: "slider" }))).toBe("slider");
    expect(formatOf(check({ response_type: "symbolic", options: [], entry: { mode: "tiles", tiles: ["2", "x"] } }))).toBe("tile_builder");
    expect(formatOf(numeric(null))).toBe("typed_entry");
    expect(formatOf(numeric(undefined))).toBe("typed_entry");
    expect(formatOf(check({ response_type: "string_set", options: [], entry: line }))).toBe("typed_entry");
  });

  it("builds a numeric response from a placed number and a text response from the tiles in order, once there is something", () => {
    const n = numeric(line);
    expect(responseFromArrangement(n, initialArrangement(n))).toBeNull();
    expect(responseFromArrangement(n, { ...initialArrangement(n), number: "7" })).toEqual({ kind: "numeric", value: "7" });
    const tiled = check({ response_type: "symbolic", options: [], entry: { mode: "tiles", tiles: ["2", "*", "x", "+", "3"] } });
    expect(responseFromArrangement(tiled, initialArrangement(tiled))).toBeNull();
    expect(responseFromArrangement(tiled, { ...initialArrangement(tiled), built: [4, 3, 0, 1, 2] })).toEqual({ kind: "text", text: "3 + 2 * x" });
  });
});

describe("the P2b formats", () => {
  const grouping = check({ response_type: "grouping", left_entries: ["a", "b", "c"], options: [{ id: "g1", text: "G1" }, { id: "g2", text: "G2" }] });
  const blanks = check({ response_type: "blanks", left_entries: ["1", "2"] });

  it("reads grouping and blanks from the payload and treats them as arranged", () => {
    expect(formatOf(grouping)).toBe("grouping");
    expect(formatOf(blanks)).toBe("blanks");
    expect(isArranged("grouping") && isArranged("blanks")).toBe(true);
  });

  it("is complete only when every entry or blank has an answer, and answers with pairs in the payload's order", () => {
    expect(isComplete(grouping, { ...initialArrangement(grouping), pairs: { a: "G1", b: "G2" } })).toBe(false);
    expect(responseFromArrangement(grouping, { ...initialArrangement(grouping), pairs: { c: "G2", a: "G1", b: "G1" } })).toEqual({
      kind: "pairs",
      pairs: [{ left: "a", right: "G1" }, { left: "b", right: "G1" }, { left: "c", right: "G2" }],
    });
    expect(responseFromArrangement(blanks, { ...initialArrangement(blanks), pairs: { "2": "y" } })).toBeNull();
    expect(responseFromArrangement(blanks, { ...initialArrangement(blanks), pairs: { "2": "y", "1": "x" } })).toEqual({
      kind: "pairs",
      pairs: [{ left: "1", right: "x" }, { left: "2", right: "y" }],
    });
  });
});
