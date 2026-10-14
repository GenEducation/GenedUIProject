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
  it("resolves against IST, defaults a missing or bad time to 09:00, and NaNs a bad date", () => {
    // 10:00 IST == 04:30 UTC, not the viewer's timezone.
    expect(new Date(START).toISOString()).toBe("2026-08-20T04:30:00.000Z");
    expect(new Date(scheduledSessionStartMs("2026-08-20", null)).toISOString()).toBe("2026-08-20T03:30:00.000Z");
    expect(new Date(scheduledSessionStartMs("2026-08-20", "not-a-time")).toISOString()).toBe("2026-08-20T03:30:00.000Z");
    expect(scheduledSessionStartMs("nonsense", "10:00")).toBeNaN();
  });
});

describe("selectImminentSession", () => {
  it("shows a session from 24h before its start until the grace window passes", () => {
    const s = session();
    expect(selectImminentSession([s], nowAt(IMMINENT_WINDOW_MS - 1000))).toBe(s);
    expect(selectImminentSession([s], nowAt(IMMINENT_WINDOW_MS + 1000))).toBeNull();
    expect(selectImminentSession([s], nowAt(-(START_GRACE_MS - 1000)))).toBe(s);
    expect(selectImminentSession([s], nowAt(-(START_GRACE_MS + 1000)))).toBeNull();
  });

  it("excludes failed-prep and completed sessions but keeps pending prep", () => {
    expect(selectImminentSession([session({ preparation_status: "FAILED" })], nowAt(60_000))).toBeNull();
    expect(selectImminentSession([session({ status: "COMPLETED" })], nowAt(60_000))).toBeNull();
    // Pending prep still surfaces, so it can show a waiting state.
    const pending = session({ preparation_status: "PENDING" });
    expect(selectImminentSession([pending], nowAt(60_000))).toBe(pending);
  });

  it("returns the soonest valid session, skipping unparseable dates", () => {
    const later = session({ id: "later", scheduled_time: "18:00" });
    const sooner = session({ id: "sooner", scheduled_time: "10:00" });
    const broken = session({ id: "broken", scheduled_date: "nonsense" });
    expect(selectImminentSession([later, broken, sooner], nowAt(60_000))).toBe(sooner);
    expect(selectImminentSession([], Date.now())).toBeNull();
  });
});
