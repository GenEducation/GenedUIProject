import { describe, it, expect } from "vitest";
import { bookTexts, glossaryEntry, opensWithStep } from "../reading/book";
import type { Passage } from "../types";

const chunk = (id: string, text: string, element_type = "paragraph") => ({ id, element_type, text, page: 1 });
const PASSAGE: Passage = {
  id: "p1",
  title: "SYNTHETIC story",
  segments: [
    { segment: 1, chunks: [chunk("a", "SYNTHETIC one."), chunk("n", "word: a meaning", "note"), chunk("b", "SYNTHETIC two.")] },
    { segment: 2, chunks: [chunk("c", "SYNTHETIC three.")] },
  ],
};

describe("bookTexts", () => {
  it("keeps the book's order and draws glossary notes apart from the running text", () => {
    const [text] = bookTexts([PASSAGE]);
    expect(text.parts.map((p) => p.segment)).toEqual([1, 2]);
    expect(text.parts[0].paragraphs.map((c) => c.text)).toEqual(["SYNTHETIC one.", "SYNTHETIC two."]);
    expect(text.parts[0].glossary.map((c) => c.text)).toEqual(["word: a meaning"]);
  });

  it("has nothing for a payload with no passages, or an older one that never had the field", () => {
    expect(bookTexts(undefined)).toEqual([]);
    expect(bookTexts([])).toEqual([]);
    expect(bookTexts([{ id: "p", title: "t", segments: [{ segment: 1, chunks: [] }] }])).toEqual([]);
  });
});

describe("opensWithStep", () => {
  const texts = bookTexts([PASSAGE]);
  it("opens when the step holds the text or asks about it, and never without a text", () => {
    expect(opensWithStep("reading", texts)).toBe(true);
    expect(opensWithStep("post_reading", texts)).toBe(true);
    expect(opensWithStep("mixed", texts)).toBe(true);
    expect(opensWithStep("pre_reading", texts)).toBe(false);
    expect(opensWithStep(null, texts)).toBe(false);
    expect(opensWithStep("post_reading", [])).toBe(false);
  });
});

describe("glossaryEntry", () => {
  it("splits at the first colon and leaves an entry with none whole", () => {
    expect(glossaryEntry("dew: small drops: on leaves")).toEqual({ term: "dew", meaning: "small drops: on leaves" });
    expect(glossaryEntry("no term here")).toEqual({ term: null, meaning: "no term here" });
    expect(glossaryEntry(": odd")).toEqual({ term: null, meaning: ": odd" });
  });
});
