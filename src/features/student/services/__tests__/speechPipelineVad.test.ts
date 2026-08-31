import { describe, expect, it } from "vitest";

import { isSustained, ownsTheTurn } from "../speechPipelineVad";

describe("ownsTheTurn", () => {
  it("is true while the tutor is speaking", () => {
    expect(ownsTheTurn("speaking")).toBe(true);
  });

  it("is true while the tutor is thinking -- session 5d058c6c's bug was this being false", () => {
    expect(ownsTheTurn("thinking")).toBe(true);
  });

  it("is false while idle or listening -- a fresh speech_start there is a real new turn", () => {
    expect(ownsTheTurn("idle")).toBe(false);
    expect(ownsTheTurn("listening")).toBe(false);
  });
});

describe("isSustained", () => {
  it("is false before the threshold elapses", () => {
    expect(isSustained(1000, 1399, 400)).toBe(false);
  });

  it("is true once the threshold has elapsed", () => {
    expect(isSustained(1000, 1400, 400)).toBe(true);
  });

  it("is true well past the threshold", () => {
    expect(isSustained(1000, 5000, 400)).toBe(true);
  });
});
