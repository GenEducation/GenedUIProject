import { describe, expect, it } from "vitest";
import { CHAT, HANDLE_PX, RAIL, fitWidths, frameFor } from "../layout";

const pref = { rail: RAIL.default, chat: CHAT.default };
const boardOf = (container: number, w: { rail: number; chat: number }) => container - 2 * HANDLE_PX - w.rail - w.chat;

describe("fitWidths (wide)", () => {
  it("narrows the rail first as the window shrinks, keeping the chat", () => {
    const w = fitWidths("wide", 1080, pref);
    expect(w.chat).toBe(CHAT.default);
    expect(w.rail).toBeLessThan(RAIL.default);
    expect(boardOf(1080, w)).toBeGreaterThanOrEqual(420);
  });
});

describe("fitting the lesson to the screen", () => {
  it("scales a phone held sideways so the whole lesson fits, board and chat side by side", () => {
    // 667 × 375 (a small phone in landscape)
    const f = frameFor(667, 375, false, true);
    expect(f.turned).toBe(false);
    expect(f.scale).toBe(0.75);
    expect(f).toMatchObject({ width: 889, height: 500, mode: "compact" });
  });

  it("turns and scales a phone held upright the same way", () => {
    // 375 × 667 upright: laid out as 667 × 375 landscape, then scaled
    expect(frameFor(375, 667, true, true)).toMatchObject({ turned: true, scale: 0.75, width: 889, height: 500, mode: "compact" });
  });
});
