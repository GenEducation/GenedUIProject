import { describe, it, expect } from "vitest";
import { alignWords, feedbackFor, practiceExcerpt, wordsOf } from "../reading/alignWords";

describe("alignWords", () => {
  it("marks every word of the text the listener picked up, ignoring case and punctuation", () => {
    const result = alignWords("Rama Natha was the son of a rich landlord.", "rama natha was the son of a rich landlord");
    expect(result.words.every((w) => w.heard)).toBe(true);
    expect(result).toMatchObject({ heardCount: 8 + 1, extra: 0, silent: false });
  });

  it("marks only the words that were not picked up, and keeps later words aligned when one is skipped or repeated", () => {
    const result = alignWords("one two three four five", "one three three four five");
    expect(result.words.filter((w) => !w.heard).map((w) => w.word)).toEqual(["two"]);
    expect(result.extra).toBe(1);
  });

  it("reports silence, and says nothing was heard rather than that anything was wrong", () => {
    const result = alignWords("one two", "");
    expect(result.silent).toBe(true);
    expect(feedbackFor(result).headline).toMatch(/didn't catch anything/);
  });

  it("works for Devanagari: a vowel sign stays part of its word", () => {
    const result = alignWords("राम नाथ एक किसान था।", "राम नाथ एक किसान था");
    expect(wordsOf("किसान")).toEqual(["किसान"]);
    expect(result.words.every((w) => w.heard)).toBe(true);
    expect(alignWords("किसान", "किसन").words[0].heard).toBe(false);
  });

  it("keeps an apostrophe or hyphen inside a word", () => {
    expect(wordsOf("don’t stop - well-known")).toEqual(["don’t", "stop", "well-known"]);
  });
});

describe("feedbackFor", () => {
  it("never claims a mistake, a score or a pronunciation judgement", () => {
    const texts = [
      alignWords("one two three", "one two three"),
      alignWords("one two three", "one three"),
      alignWords("one two three", "completely different"),
      alignWords("one two three", ""),
    ].map((r) => JSON.stringify(feedbackFor(r)).toLowerCase());
    for (const text of texts) {
      for (const banned of ["wrong", "mistake", "incorrect", "mispronounc", "score", "grade", "%", "correct"]) {
        if (banned === "score") expect(text.replace("isn't scored", "")).not.toContain(banned);
        else expect(text).not.toContain(banned);
      }
    }
  });

  it("lists the words not picked up and always says it is not a test", () => {
    const feedback = feedbackFor(alignWords("one two three", "one three"));
    expect(feedback.missed).toEqual(["two"]);
    expect(feedback.note).toMatch(/isn't a test/);
  });
});

describe("practiceExcerpt", () => {
  it("is the first sentences of a part, in Latin and Devanagari punctuation", () => {
    expect(practiceExcerpt("One. Two! Three? Four.")).toBe("One. Two! Three?");
    expect(practiceExcerpt("एक। दो। तीन। चार।", 2)).toBe("एक। दो।");
  });
});
