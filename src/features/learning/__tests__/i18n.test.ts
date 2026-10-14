import { describe, it, expect } from "vitest";
import { SESSION_LANGUAGES } from "../voice/languages";
import { uiText, type UiKey } from "../i18n";

const KEYS: UiKey[] = [
  "checkpoint", "quickCheck", "yourAnswer", "checkAnswer", "hint", "calculator", "typeInChat", "gettingReady", "correct", "notQuite",
  "unreadable", "lookingAtIt", "moveOn", "nextStep", "talkItThrough", "repliesCount", "roundTricky", "tryNew", "keepGoing", "tutor",
  "listening", "muted", "hearing", "connecting", "reconnecting", "speaking", "thinking", "voiceOff", "modePush", "tapOrHold",
  "unmuteToSpeak", "listeningRelease", "listeningTap", "end", "backToTyping", "sessionTime", "chapterTime", "stepsDone", "muteMic", "unmuteMic",
];

describe("the lesson screen's own words", () => {
  it("has every key in every one of the eight languages (a missing one would fall back to English unnoticed)", () => {
    const english = new Map(KEYS.map((k) => [k, uiText("en", k, { name: "N", n: 1, m: 2 })]));
    for (const language of SESSION_LANGUAGES.filter((l) => l !== "en")) {
      for (const key of KEYS) {
        const text = uiText(language, key, { name: "N", n: 1, m: 2 });
        // A language's own words, not the English fallback (a few labels are the same word in a language, e.g. Calculator).
        if (text === english.get(key)) expect(["calculator", "hint", "checkpoint"]).toContain(key);
      }
    }
  });

  it("fills the names and numbers, in any language", () => {
    expect(uiText("en", "speaking", { name: "Nia" })).toBe("Nia is speaking");
    expect(uiText("hi", "speaking", { name: "Nia" })).toContain("Nia");
    expect(uiText("ta", "repliesCount", { n: 1, m: 2 })).toMatch(/1/);
    expect(uiText("ta", "repliesCount", { n: 1, m: 2 })).toMatch(/2/);
  });

  it("is English for an unknown or missing language", () => {
    expect(uiText(null, "hint")).toBe("Hint");
    expect(uiText("fr", "hint")).toBe("Hint");
  });
});
