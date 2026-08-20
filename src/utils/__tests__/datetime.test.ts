import { describe, expect, it } from "vitest";
import {
  addDays,
  BOOKING_WINDOW_DAYS,
  bookingWindowEnd,
  formatDateDisplay,
  formatTimeDisplay,
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

  it("returns null for an unusable Date", () => {
    expect(toIsoDate(null)).toBeNull();
    expect(toIsoDate(new Date("nope"))).toBeNull();
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

  it("handles a leap day", () => {
    expect(tomorrowDateString(new Date(2028, 1, 28, 9, 0))).toBe("2028-02-29");
  });

  it("agrees with toIsoDate for the same instant", () => {
    const now = new Date(2026, 7, 19, 23, 59);
    expect(todayDateString(now)).toBe(toIsoDate(now));
  });
});

describe("addDays", () => {
  it("moves forward and backward across boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-08-19", 0)).toBe("2026-08-19");
  });

  it("returns null for bad input", () => {
    expect(addDays("nonsense", 1)).toBeNull();
  });
});

describe("formatDateDisplay", () => {
  it("renders each style", () => {
    expect(formatDateDisplay("2026-08-19", "long")).toBe("Wed, Aug 19, 2026");
    expect(formatDateDisplay("2026-08-19", "medium")).toBe("19 Aug 2026");
    expect(formatDateDisplay("2026-08-19", "short")).toBe("19 Aug");
  });

  it("defaults to long", () => {
    expect(formatDateDisplay("2026-08-19")).toBe("Wed, Aug 19, 2026");
  });

  it("returns null rather than 'Invalid Date'", () => {
    expect(formatDateDisplay(null)).toBeNull();
    expect(formatDateDisplay("")).toBeNull();
    expect(formatDateDisplay("garbage")).toBeNull();
  });

  it("still accepts a full timestamp, for session rows that carry one", () => {
    expect(formatDateDisplay("2026-08-19T14:30:00Z", "medium")).not.toBeNull();
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

  it("rejects out-of-range and malformed values", () => {
    expect(parseHhMm("24:00")).toBeNull();
    expect(parseHhMm("10:60")).toBeNull();
    expect(parseHhMm("abc")).toBeNull();
    expect(parseHhMm("")).toBeNull();
    expect(parseHhMm(null)).toBeNull();
  });

  it("wraps values outside a single day", () => {
    expect(toHhMm(1440)).toBe("00:00");
    expect(toHhMm(-60)).toBe("23:00");
  });
});

describe("to12Hour / from12Hour", () => {
  it("handles the midnight and noon edge cases", () => {
    expect(to12Hour(0)).toEqual({ hour12: 12, minute: 0, period: "AM" });
    expect(to12Hour(12 * 60)).toEqual({ hour12: 12, minute: 0, period: "PM" });
    expect(from12Hour(12, 0, "AM")).toBe(0);
    expect(from12Hour(12, 0, "PM")).toBe(720);
  });

  it("round-trips every minute of the day", () => {
    for (let m = 0; m < 1440; m++) {
      const { hour12, minute, period } = to12Hour(m);
      expect(from12Hour(hour12, minute, period)).toBe(m);
    }
  });
});

describe("formatTimeDisplay", () => {
  it("renders 12-hour time", () => {
    expect(formatTimeDisplay("00:00")).toBe("12:00 AM");
    expect(formatTimeDisplay("09:05")).toBe("9:05 AM");
    expect(formatTimeDisplay("12:30")).toBe("12:30 PM");
    expect(formatTimeDisplay("23:59")).toBe("11:59 PM");
  });

  it("returns null for unusable input", () => {
    expect(formatTimeDisplay("25:00")).toBeNull();
    expect(formatTimeDisplay(null)).toBeNull();
  });
});

describe("bookingWindowEnd", () => {
  it("is today + BOOKING_WINDOW_DAYS", () => {
    expect(bookingWindowEnd(new Date(2026, 7, 18, 10, 0))).toBe("2026-08-25");
    expect(BOOKING_WINDOW_DAYS).toBe(7);
  });

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

  it("rolls across month and year boundaries", () => {
    expect(bookingWindowEnd(new Date(2026, 7, 28, 10, 0))).toBe("2026-09-04");
    expect(bookingWindowEnd(new Date(2026, 11, 28, 10, 0))).toBe("2027-01-04");
  });

  it("uses local days, so a late-evening booking still gets a full window", () => {
    expect(bookingWindowEnd(new Date(2026, 7, 18, 23, 45))).toBe("2026-08-25");
  });
});
