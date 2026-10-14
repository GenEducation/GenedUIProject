import { describe, it, expect } from "vitest";
import { BACKOFF_MS, BEAT_MS, IDLE_MS, mayBeat, recentlyActive, type PresenceState } from "../rules";

const base: PresenceState = { ready: true, visible: true, voiceRunning: false, lastInputAt: 0, lastStreamAt: null, now: 1_000 };

describe("when a tab may send a presence beat", () => {
  it("the backoff is four beat periods", () => expect(BACKOFF_MS).toBe(4 * BEAT_MS));
  it("sends with a ready, visible tab and recent input", () => expect(mayBeat(base)).toBe(true));
  it("sends nothing for a lesson that is not ready", () => expect(mayBeat({ ...base, ready: false })).toBe(false));
  it("sends nothing from a hidden tab", () => expect(mayBeat({ ...base, visible: false })).toBe(false));
  it("sends nothing while a voice session runs in the tab", () => expect(mayBeat({ ...base, voiceRunning: true })).toBe(false));
  it("sends nothing with no input and no stream ever", () => expect(mayBeat({ ...base, lastInputAt: null })).toBe(false));
  it("stops once the idle window has passed", () => {
    expect(recentlyActive({ lastInputAt: 0, lastStreamAt: null, now: IDLE_MS })).toBe(true);
    expect(recentlyActive({ lastInputAt: 0, lastStreamAt: null, now: IDLE_MS + 1 })).toBe(false);
  });
  it("a reply streamed within the window keeps an input-less tab active", () => {
    expect(recentlyActive({ lastInputAt: null, lastStreamAt: 500, now: IDLE_MS })).toBe(true);
  });
});
