import { encodeTrueFalse, encodeMatch, isAnswered, marksLabel } from "../answerUtils";
import type { Question } from "../../../types/test";

const q = {} as Question; // isAnswered ignores the question shape (value-only check)

describe("encodeTrueFalse", () => {
  it("appends a justification when present", () => {
    expect(encodeTrueFalse("True", "it always holds")).toBe("True. it always holds");
  });
  it("returns the bare verdict without justification", () => {
    expect(encodeTrueFalse("False")).toBe("False");
    expect(encodeTrueFalse("False", "   ")).toBe("False");
  });
});

describe("encodeMatch", () => {
  it("serialises selections sorted by left id", () => {
    expect(encodeMatch({ 3: "C", 1: "A", 2: "B" })).toBe("1→A, 2→B, 3→C");
  });
  it("returns an empty string for no selections", () => {
    expect(encodeMatch({})).toBe("");
  });
});

describe("isAnswered", () => {
  it("is false for empty / whitespace / undefined", () => {
    expect(isAnswered(q, undefined)).toBe(false);
    expect(isAnswered(q, "")).toBe(false);
    expect(isAnswered(q, "   ")).toBe(false);
  });
  it("is true for any non-empty value", () => {
    expect(isAnswered(q, "True")).toBe(true);
    expect(isAnswered(q, "1→A")).toBe(true);
  });
});

describe("marksLabel", () => {
  it("uses the singular form for one mark", () => {
    expect(marksLabel(1)).toBe("1 mark");
  });
  it("uses the plural form otherwise", () => {
    expect(marksLabel(2)).toBe("2 marks");
    expect(marksLabel(0)).toBe("0 marks");
  });
});
