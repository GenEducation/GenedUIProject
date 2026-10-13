import { describe, expect, it } from "vitest";
import { CHAT, HANDLE_PX, RAIL, fitWidths, gridTemplate } from "../layout";

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
