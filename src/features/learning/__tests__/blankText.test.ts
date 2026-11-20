import { describe, it, expect } from "vitest";
import { blankPieces } from "../check/blankText";

describe("blankPieces", () => {
  it("splits a sentence at numbered blanks", () => {
    expect(blankPieces("[1] then [2].", ["1", "2"])).toEqual([{ blank: "1" }, { text: " then " }, { blank: "2" }, { text: "." }]);
  });

  it("takes underscores as the blanks in order", () => {
    expect(blankPieces("The ___ sat on the ____", ["1", "2"])).toEqual([{ text: "The " }, { blank: "1" }, { text: " sat on the " }, { blank: "2" }]);
  });

  it("gives up when a blank is missing, repeated or unknown", () => {
    expect(blankPieces("Only [1] here", ["1", "2"])).toBeNull();
    expect(blankPieces("[1] and [1]", ["1", "2"])).toBeNull();
    expect(blankPieces("[3] and [1]", ["1", "2"])).toBeNull();
    expect(blankPieces("No marks at all", ["1"])).toBeNull();
  });
});

describe("pcmLevel", () => {
  it("is 0 for silence and grows with loudness, never past 1", async () => {
    const { pcmLevel } = await import("../check/oralAnswer");
    expect(pcmLevel(new Int16Array(160).buffer)).toBe(0);
    const speech = pcmLevel(new Int16Array(160).fill(1300).buffer);
    expect(speech).toBeGreaterThan(0.4);
    expect(speech).toBeLessThan(0.6);
    expect(pcmLevel(new Int16Array(160).fill(30000).buffer)).toBe(1);
  });
});
