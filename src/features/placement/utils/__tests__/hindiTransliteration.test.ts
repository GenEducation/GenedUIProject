import { describe, expect, it } from "vitest";
import { transliterateToDevanagari } from "../hindiTransliteration";

describe("transliterateToDevanagari", () => {
  it("passes Devanagari input straight through, unmodified", () => {
    expect(transliterateToDevanagari("नमस्ते")).toBe("नमस्ते");
  });

  it("converts a genuine Sanskrit-style conjunct correctly", () => {
    expect(transliterateToDevanagari("namaste")).toBe("नमस्ते");
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
