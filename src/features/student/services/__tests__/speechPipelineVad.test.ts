import { describe, expect, it } from "vitest";

import { frameAction, isSustained, ownsTheTurn } from "../speechPipelineVad";
import type { PipelineState } from "../speechPipelineService";

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

describe("frameAction", () => {
  it("sends once the turn is open server-side", () => {
    expect(frameAction("listening", true)).toBe("send");
    expect(frameAction("listening", false)).toBe("send");
  });

  it("BUFFERS audio captured while an interruption is still being confirmed", () => {
    // The regression: these frames used to be dropped, punching a 400ms hole into the
    // start of every utterance spoken over the tutor and producing clipped transcripts
    // like "with data" / "with the".
    expect(frameAction("thinking", true)).toBe("buffer");
    expect(frameAction("speaking", true)).toBe("buffer");
  });

  it("drops audio only when there is no onset at all", () => {
    expect(frameAction("thinking", false)).toBe("drop");
    expect(frameAction("speaking", false)).toBe("drop");
    expect(frameAction("idle", false)).toBe("drop");
  });

  it("never drops a frame while the child is mid-word", () => {
    const states: PipelineState[] = ["idle", "listening", "thinking", "speaking"];
    for (const s of states) {
      expect(frameAction(s, true)).not.toBe("drop");
    }
  });
});
