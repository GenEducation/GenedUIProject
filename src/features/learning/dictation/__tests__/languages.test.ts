import { describe, it, expect } from "vitest";
import { DICTATION_LANGUAGES, defaultDictationLanguage, dictationLanguage } from "../languages";

describe("dictation languages", () => {
  it("covers every language the app offers, each with a recogniser tag", () => {
    expect(DICTATION_LANGUAGES.map((l) => l.code)).toEqual(["en", "hi", "hi-Latn", "mr", "pa", "ta", "te", "kn"]);
    expect(DICTATION_LANGUAGES.every((l) => /^[a-z]{2}(-[A-Za-z]+)*-IN$/.test(l.recognition))).toBe(true);
  });

  it("keeps Hinglish in Latin script", () => {
    expect(dictationLanguage("hi-Latn")?.recognition).toBe("en-IN");
  });

  it("starts with the learner's own pick, then the lesson, then the profile, then English", () => {
    expect(defaultDictationLanguage({ saved: "te", subject: "Hindi", preferred: "ta" })).toBe("te");
    expect(defaultDictationLanguage({ saved: null, subject: "Hindi", preferred: "ta" })).toBe("hi");
    expect(defaultDictationLanguage({ saved: null, subject: "Science", preferred: "ta" })).toBe("ta");
    expect(defaultDictationLanguage({ saved: "xx", subject: null, preferred: "zz" })).toBe("en");
  });
});
