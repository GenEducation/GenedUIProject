import { describe, expect, it } from "vitest";
import { isDevanagari, transliterateToDevanagari } from "../hindiTransliteration";

describe("isDevanagari", () => {
  it("detects Devanagari text", () => {
    expect(isDevanagari("नमस्ते")).toBe(true);
  });

  it("says no for plain Latin text", () => {
    expect(isDevanagari("namaste")).toBe(false);
  });
});

describe("transliterateToDevanagari", () => {
  it("passes Devanagari input straight through, unmodified", () => {
    expect(transliterateToDevanagari("नमस्ते")).toBe("नमस्ते");
  });

  it("passes empty input straight through", () => {
    expect(transliterateToDevanagari("")).toBe("");
  });

  it("converts a genuine Sanskrit-style conjunct correctly", () => {
    expect(transliterateToDevanagari("namaste")).toBe("नमस्ते");
  });

  it("converts simple consonant-vowel syllables, with no trailing virama", () => {
    expect(transliterateToDevanagari("ghar")).toBe("घर");
  });

  it("keeps punctuation and spaces untouched", () => {
    expect(transliterateToDevanagari("raam, shyaam")).toBe("राम, श्याम");
  });

  /**
   * Known, documented limitation (see the module doc comment): "लड़के" is a
   * schwa-deletion word — ड़ keeps its own bare inherent vowel in spelling
   * with no virama, purely by Hindi orthographic convention, not because
   * any rule can derive that from the romanization. This scheme's one
   * consonant-cluster rule (insert a virama between two consonants with no
   * vowel between them) is what makes a genuine conjunct like नमस्ते work,
   * but it fires here too and inserts a virama that doesn't belong — on top
   * of the separate, simpler nukta gap (plain "d" is always द, never ड़,
   * unless the student knows to type the explicit ".D" token). Both are
   * real gaps no deterministic scheme closes; this only asserts today's
   * actual output so a future change here is a deliberate one, not a
   * silent regression.
   */
  it("gets close but not letter-perfect on a schwa-deletion word, even with the nukta spelled out", () => {
    expect(transliterateToDevanagari("ladke")).not.toBe("लड़के");
    expect(transliterateToDevanagari("la.Dke")).toBe("लड़्के");
  });
});
