import { describe, expect, it } from "vitest";

import { scheduledSessionStartMs } from "@/utils/datetime";
import {
  IMMINENT_WINDOW_MS,
  START_GRACE_MS,
  selectImminentSession,
} from "./sessionSelection";

/** Minimal shape of a scheduled session, with sane defaults per test. */
function session(overrides: Partial<Parameters<typeof selectImminentSession>[0][number]> & {
  id?: string;
} = {}) {
  return {
    id: "s1",
    scheduled_date: "2026-08-20",
    scheduled_time: "10:00",
    preparation_status: "COMPLETED",
    status: "PENDING",
    ...overrides,
  };
}

/** Epoch ms `offset` away from a session starting at 2026-08-20 10:00 IST. */
const START = scheduledSessionStartMs("2026-08-20", "10:00");
const nowAt = (offsetFromStart: number) => START - offsetFromStart;

describe("scheduledSessionStartMs", () => {
  it("resolves a time against the IST offset, not the viewer's timezone", () => {
    // 10:00 IST == 04:30 UTC
    expect(new Date(START).toISOString()).toBe("2026-08-20T04:30:00.000Z");
  });

  it("defaults a missing time to 09:00 IST", () => {
    const start = scheduledSessionStartMs("2026-08-20", null);
    expect(new Date(start).toISOString()).toBe("2026-08-20T03:30:00.000Z");
  });

  it("ignores an unparseable time rather than producing NaN", () => {
    const start = scheduledSessionStartMs("2026-08-20", "not-a-time");
    expect(new Date(start).toISOString()).toBe("2026-08-20T03:30:00.000Z");
  });

  it("returns NaN for an unparseable date", () => {
    expect(scheduledSessionStartMs("nonsense", "10:00")).toBeNaN();
  });
});

describe("selectImminentSession", () => {
  it("includes a session just inside the 24h window", () => {
    const s = session();
    expect(selectImminentSession([s], nowAt(IMMINENT_WINDOW_MS - 1000))).toBe(s);
  });

  it("excludes a session beyond the 24h window", () => {
    const s = session();
    expect(selectImminentSession([s], nowAt(IMMINENT_WINDOW_MS + 1000))).toBeNull();
  });

  it("keeps showing a session inside the grace window after it started", () => {
    const s = session();
    expect(selectImminentSession([s], nowAt(-(START_GRACE_MS - 1000)))).toBe(s);
  });

  it("drops a session once the grace window has passed", () => {
    const s = session();
    expect(selectImminentSession([s], nowAt(-(START_GRACE_MS + 1000)))).toBeNull();
  });

  it("excludes a session whose content preparation failed", () => {
    const s = session({ preparation_status: "FAILED" });
    expect(selectImminentSession([s], nowAt(60_000))).toBeNull();
  });

  it("excludes a session the student already completed", () => {
    const s = session({ status: "COMPLETED" });
    expect(selectImminentSession([s], nowAt(60_000))).toBeNull();
  });

  it("still surfaces a session whose prep is pending, so it can show a waiting state", () => {
    const s = session({ preparation_status: "PENDING" });
    expect(selectImminentSession([s], nowAt(60_000))).toBe(s);
  });

  it("returns the soonest when several are in the window", () => {
    const later = session({ id: "later", scheduled_time: "18:00" });
    const sooner = session({ id: "sooner", scheduled_time: "10:00" });
    expect(selectImminentSession([later, sooner], nowAt(60_000))).toBe(sooner);
  });

  it("skips sessions with an unparseable date instead of throwing", () => {
    const broken = session({ id: "broken", scheduled_date: "nonsense" });
    const good = session({ id: "good" });
    expect(selectImminentSession([broken, good], nowAt(60_000))).toBe(good);
  });

  it("returns null for an empty list", () => {
    expect(selectImminentSession([], Date.now())).toBeNull();
  });
});
