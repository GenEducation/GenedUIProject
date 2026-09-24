import { describe, expect, it } from "vitest";
import { cleanPrompt, isReadableNumber, joinPageBreaks, prettifyMath } from "../display";
import type { Chunk } from "../types/lesson";

describe("isReadableNumber mirrors the backend's numeric grammar", () => {
  it.each(["2", "-3", "0.75", "1/2", "7 / 2", "1 1/2", "  3  "])("accepts %j", (text) => {
    expect(isReadableNumber(text)).toBe(true);
  });

  it.each(["two", "1/0", "1 1/0", "half", "1/2/3", "", "3 times 1/2"])("rejects %j", (text) => {
    expect(isReadableNumber(text)).toBe(false);
  });
});

describe("cleanPrompt drops textbook exercise numbering", () => {
  it("removes 'Figure it Out 1.' and a bare leading number", () => {
    expect(cleanPrompt("Figure it Out 1. How many whole units are there in 7/2?")).toBe(
      "How many whole units are there in 7/2?",
    );
    expect(cleanPrompt("4. How many pieces of length 1/6 will make a length of 1/3?")).toBe(
      "How many pieces of length 1/6 will make a length of 1/3?",
    );
  });

  it("leaves a question that starts with a number it needs", () => {
    expect(cleanPrompt("3/4 of a roti is how many quarters?")).toBe("3/4 of a roti is how many quarters?");
  });
});

describe("prettifyMath", () => {
  it("writes multiplication between numbers as ×", () => {
    expect(prettifyMath("= 3 * 1/4 = 3/4")).toBe("= 3 × 1/4 = 3/4");
    expect(prettifyMath("(4x9)/(5x9)")).toBe("(4 × 9)/(5 × 9)");
  });

  it("leaves words alone", () => {
    expect(prettifyMath("the next box")).toBe("the next box");
  });
});

describe("joinPageBreaks", () => {
  const chunk = (id: string, text: string, element_type = "paragraph"): Chunk => ({ id, text, element_type, page: 1 });

  it("rejoins a paragraph split mid-sentence across a page break", () => {
    const joined = joinPageBreaks([chunk("a", "The line between numerator and denominator in '1/2' and in other"), chunk("b", "fractions was later introduced.")]);
    expect(joined).toHaveLength(1);
    expect(joined[0].text).toBe("The line between numerator and denominator in '1/2' and in other fractions was later introduced.");
  });

  it("keeps separate paragraphs and other chunk types apart", () => {
    expect(joinPageBreaks([chunk("a", "One sentence."), chunk("b", "another starts lower-case.")])).toHaveLength(2);
    expect(joinPageBreaks([chunk("a", "Let us see", "paragraph"), chunk("b", "4/5 = 36/45", "equation")])).toHaveLength(2);
  });
});
