import { describe, it, expect } from "vitest";
import { openRedrawsFrom, openRedrawsText, redrawFailureText } from "../redrawTally";

describe("redraw tally copy", () => {
  it("says what is still running and what waits for review", () => {
    expect(openRedrawsText({ queued: 4, drawing: 2, ready: 3 })).toBe("6 redraws still running, 3 waiting for review");
    expect(openRedrawsText({ queued: 0, drawing: 1, ready: 0 })).toBe("1 redraw still running");
    expect(openRedrawsText({ queued: 0, drawing: 0, ready: 2 })).toBe("2 waiting for review");
    expect(openRedrawsText({ queued: 0, drawing: 0, ready: 0 })).toBe("");
  });

  it("reads a 409 redraws_open, and nothing else", () => {
    expect(openRedrawsFrom({ reason: "redraws_open", queued: 1, drawing: 2, ready: 3 })).toMatchObject({ open: 6, ready: 3 });
    expect(openRedrawsFrom({ reason: "publication_blocked" })).toBeNull();
    expect(openRedrawsFrom(undefined)).toBeNull();
  });

  it("explains a failure class in plain words, never the raw error", () => {
    expect(redrawFailureText("busy")).toMatch(/busy/);
    expect(redrawFailureText("not_needed")).toMatch(/needs no picture/);
    expect(redrawFailureText("render_timeout")).toMatch(/couldn't be drawn/);
  });
});
