import { describe, expect, it } from "vitest";
import {
  addDays,
  bookingWindowEnd,
  formatDateDisplay,
  from12Hour,
  parseHhMm,
  parseIsoDate,
  to12Hour,
  toHhMm,
  toIsoDate,
  todayDateString,
  tomorrowDateString,
} from "../datetime";

describe("parseIsoDate / toIsoDate", () => {
  it("round-trips a date at local midnight", () => {
    const d = parseIsoDate("2026-08-19")!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // August
    expect(d.getDate()).toBe(19);
    expect(d.getHours()).toBe(0);
    expect(toIsoDate(d)).toBe("2026-08-19");
  });

  it("returns null for malformed or overflowing input", () => {
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
    expect(parseIsoDate("19-08-2026")).toBeNull();
    expect(parseIsoDate("2026-8-9")).toBeNull(); // unpadded
    expect(parseIsoDate("2026-02-31")).toBeNull(); // would silently roll to Mar 3
    expect(parseIsoDate("2026-13-01")).toBeNull();
  });
});

describe("todayDateString / tomorrowDateString", () => {
  it("uses local calendar days, not UTC", () => {
    // 23:30 IST on Aug 19 is 18:00 UTC the SAME day, but late-evening local
    // times are exactly where a UTC-based implementation drifts. Pinning the
    // local components is what matters: the calendar grid renders local days,
    // so `min` must agree with it.
    const lateEvening = new Date(2026, 7, 19, 23, 30);
    expect(todayDateString(lateEvening)).toBe("2026-08-19");
    expect(tomorrowDateString(lateEvening)).toBe("2026-08-20");
  });

  it("rolls over month and year boundaries", () => {
    expect(tomorrowDateString(new Date(2026, 7, 31, 9, 0))).toBe("2026-09-01");
    expect(tomorrowDateString(new Date(2026, 11, 31, 9, 0))).toBe("2027-01-01");
  });
});

describe("addDays", () => {
  it("moves forward and backward across boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-08-19", 0)).toBe("2026-08-19");
  });
});

describe("formatDateDisplay", () => {
  it("renders each style", () => {
    expect(formatDateDisplay("2026-08-19", "long")).toBe("Wed, Aug 19, 2026");
    expect(formatDateDisplay("2026-08-19", "medium")).toBe("19 Aug 2026");
    expect(formatDateDisplay("2026-08-19", "short")).toBe("19 Aug");
  });

  it("returns null rather than 'Invalid Date'", () => {
    expect(formatDateDisplay(null)).toBeNull();
    expect(formatDateDisplay("")).toBeNull();
    expect(formatDateDisplay("garbage")).toBeNull();
  });
});

describe("parseHhMm / toHhMm", () => {
  it("round-trips", () => {
    expect(parseHhMm("09:05")).toBe(545);
    expect(toHhMm(545)).toBe("09:05");
    expect(parseHhMm("00:00")).toBe(0);
    expect(toHhMm(0)).toBe("00:00");
    expect(parseHhMm("23:59")).toBe(1439);
    expect(toHhMm(1439)).toBe("23:59");
  });
});

describe("to12Hour / from12Hour", () => {
  it("handles the midnight and noon edge cases", () => {
    expect(to12Hour(0)).toEqual({ hour12: 12, minute: 0, period: "AM" });
    expect(to12Hour(12 * 60)).toEqual({ hour12: 12, minute: 0, period: "PM" });
    expect(from12Hour(12, 0, "AM")).toBe(0);
    expect(from12Hour(12, 0, "PM")).toBe(720);
  });
});

describe("bookingWindowEnd", () => {
  it("yields exactly 7 selectable days when paired with tomorrowDateString", () => {
    const now = new Date(2026, 7, 18, 10, 0);
    const min = tomorrowDateString(now); // 2026-08-19
    const max = bookingWindowEnd(now); // 2026-08-25

    let count = 0;
    for (let d = min; d && d <= max; d = addDays(d, 1)!) count++;
    expect(count).toBe(7);
    expect(min).toBe("2026-08-19");
    expect(max).toBe("2026-08-25");
  });
});
