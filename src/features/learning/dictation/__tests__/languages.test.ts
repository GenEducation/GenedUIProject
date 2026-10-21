import { describe, it, expect } from "vitest";
import { defaultDictationLanguage } from "../languages";

describe("dictation languages", () => {
  it("starts with the learner's own pick, then the lesson, then the profile, then English", () => {
    expect(defaultDictationLanguage({ saved: "te", subject: "Hindi", preferred: "ta" })).toBe("te");
    expect(defaultDictationLanguage({ saved: null, subject: "Hindi", preferred: "ta" })).toBe("hi");
    expect(defaultDictationLanguage({ saved: null, subject: "Science", preferred: "ta" })).toBe("ta");
    expect(defaultDictationLanguage({ saved: "xx", subject: null, preferred: "zz" })).toBe("en");
  });
});
