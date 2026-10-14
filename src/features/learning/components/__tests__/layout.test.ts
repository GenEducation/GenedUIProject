import { describe, expect, it } from "vitest";
import { CHAT, HANDLE_PX, MIN_SCALE, RAIL, fitWidths, frameFor, gridTemplate } from "../layout";

const pref = { rail: RAIL.default, chat: CHAT.default };
const boardOf = (container: number, w: { rail: number; chat: number }) => container - 2 * HANDLE_PX - w.rail - w.chat;

describe("fitWidths (wide)", () => {
  it("keeps the preferred widths when there is room", () => {
    expect(fitWidths("wide", 1600, pref)).toEqual(pref);
  });

  it("narrows the rail first as the window shrinks, keeping the chat", () => {
    const w = fitWidths("wide", 1080, pref);
    expect(w.chat).toBe(CHAT.default);
    expect(w.rail).toBeLessThan(RAIL.default);
    expect(boardOf(1080, w)).toBeGreaterThanOrEqual(420);
  });

  it("only then gives up chat width, never below the minimums", () => {
    const w = fitWidths("wide", 960, pref);
    expect(w.rail).toBe(RAIL.min);
    expect(w.chat).toBeLessThan(CHAT.default);
    expect(w.chat).toBeGreaterThanOrEqual(CHAT.min);
  });

  it("clamps out-of-range preferences", () => {
    expect(fitWidths("wide", 2400, { rail: 9999, chat: 10 })).toEqual({ rail: RAIL.max, chat: CHAT.min });
  });
});

describe("fitWidths (compact)", () => {
  it("has no rail column and leaves the board at least 280px", () => {
    const w = fitWidths("compact", 700, pref);
    expect(w.rail).toBe(0);
    expect(700 - HANDLE_PX - w.chat).toBeGreaterThanOrEqual(280);
  });
});

describe("gridTemplate", () => {
  it("lines up rail · gap · board · gap · chat", () => {
    expect(gridTemplate("wide", { rail: 250, chat: 360 })).toBe("250px 16px minmax(0, 1fr) 16px 360px");
    expect(gridTemplate("compact", { rail: 0, chat: 320 })).toBe("minmax(0, 1fr) 16px 320px");
  });
});

describe("fitting the lesson to the screen", () => {
  it("leaves a roomy screen alone", () => {
    expect(frameFor(1440, 900, false, false)).toEqual({ turned: false, scale: 1, width: 1440, height: 900, mode: "wide" });
    expect(frameFor(900, 800, false, true)).toMatchObject({ scale: 1, mode: "compact" });
  });

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

  it("never shrinks text past readable; a tiny screen keeps the smallest scale", () => {
    const f = frameFor(320, 240, false, true);
    expect(f.scale).toBe(MIN_SCALE);
    expect(f.width * f.scale).toBeCloseTo(320, 0);
  });

  it("keeps the progress rail in a drawer on a phone, even a wide one", () => {
    // 390 × 844 upright, and held sideways: ≥ 1024 layout px across once scaled, still compact
    expect(frameFor(390, 844, true, true)).toMatchObject({ turned: true, scale: 0.78, width: 1082, mode: "compact" });
    expect(frameFor(844, 390, false, true)).toMatchObject({ turned: false, scale: 0.78, width: 1082, mode: "compact" });
  });
});
