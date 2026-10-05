import { describe, it, expect, beforeEach } from "vitest";

import { describeLastSeen, hasNewActivity, markSeen, readSeen, UNSEEN_LOOKBACK_MS } from "../studentActivity";

const NOW = Date.parse("2026-09-30T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

beforeEach(() => localStorage.clear());

describe("studentActivity", () => {
  it("remembers views per parent and ignores junk in storage", () => {
    markSeen("p1", "s1", 100);
    markSeen("p1", "s2", 200);
    markSeen("p2", "s1", 300);
    expect(readSeen("p1")).toEqual({ s1: 100, s2: 200 });

    localStorage.setItem("gened_parent_seen_students:p3", JSON.stringify({ s1: "yesterday", s2: 5 }));
    expect(readSeen("p3")).toEqual({ s2: 5 });
    localStorage.setItem("gened_parent_seen_students:p4", "{not json");
    expect(readSeen("p4")).toEqual({});
  });

  it("flags activity newer than the last view", () => {
    expect(hasNewActivity(iso(NOW - 1000), NOW - 5000, NOW)).toBe(true);
    expect(hasNewActivity(iso(NOW - 5000), NOW - 1000, NOW)).toBe(false);
    expect(hasNewActivity(null, NOW - 1000, NOW)).toBe(false);
    expect(hasNewActivity("not a date", NOW - 1000, NOW)).toBe(false);
  });

  it("only flags recent work for a child never viewed here", () => {
    expect(hasNewActivity(iso(NOW - UNSEEN_LOOKBACK_MS + 60_000), undefined, NOW)).toBe(true);
    expect(hasNewActivity(iso(NOW - UNSEEN_LOOKBACK_MS - 60_000), undefined, NOW)).toBe(false);
  });

  it("describes when a child was last viewed", () => {
    expect(describeLastSeen(undefined, NOW)).toBe("Not viewed yet");
    expect(describeLastSeen(NOW - 10_000, NOW)).toBe("Viewed just now");
    expect(describeLastSeen(NOW - 5 * 60_000, NOW)).toBe("Viewed 5m ago");
    expect(describeLastSeen(NOW - 3 * 3_600_000, NOW)).toBe("Viewed 3h ago");
    expect(describeLastSeen(NOW - 30 * 3_600_000, NOW)).toBe("Viewed yesterday");
    expect(describeLastSeen(NOW - 80 * 3_600_000, NOW)).toBe("Viewed 3d ago");
  });
});
