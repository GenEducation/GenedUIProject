import { describe, it, expect } from "vitest";

import {
  chapterProgress,
  fillDailySeries,
  formatDuration,
  formatPeriodLabel,
  greetingFor,
  localDayKey,
  minutesBySubject,
  sessionTrendPct,
  totalMinutes,
} from "../homeMetrics";
import { BAND_TONES, masteryBand, subjectIcon } from "../subjectVisuals";

const TODAY = new Date(2026, 8, 30, 15, 0); // 30 Sept 2026, 3pm local
const DAY = 24 * 60 * 60 * 1000;

describe("homeMetrics", () => {
  it("fills the period day by day, zero where nothing was studied", () => {
    const series = fillDailySeries(
      [
        { period: "2026-09-28", total_minutes: 40.4 },
        { period: "2026-09-30", total_minutes: 72 },
        { period: "2026-08-01", total_minutes: 500 }, // outside the window
      ],
      7,
      TODAY,
    );
    expect(series.map((p) => p.period)).toEqual([
      "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30",
    ]);
    expect(series.map((p) => p.minutes)).toEqual([0, 0, 0, 0, 40, 0, 72]);
    expect(totalMinutes(series)).toBe(112);
    expect(localDayKey(TODAY)).toBe("2026-09-30");
  });

  it("formats durations and dates like the design", () => {
    expect(formatDuration(2550)).toBe("42h 30m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(0)).toBe("0m");
    expect(formatPeriodLabel("2026-09-19")).toMatch(/^19 Sep/);
    expect(formatPeriodLabel("week 38")).toBe("week 38");
  });

  it("compares sessions in the last 30 days with the 30 before", () => {
    const now = TODAY.getTime();
    const at = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString();
    expect(sessionTrendPct([at(1), at(5), at(10), at(40), at(50)], now)).toBe(50);
    expect(sessionTrendPct([at(40), at(45)], now)).toBe(-100);
    expect(sessionTrendPct([at(1), at(2)], now)).toBeNull(); // nothing to compare with
  });

  it("counts started chapters and ignores placeholders", () => {
    expect(
      chapterProgress([
        { completion_percentage: 40 },
        { completion_percentage: 0 },
        { completion_percentage: 100 },
        { completion_percentage: 0, is_placeholder: true },
      ]),
    ).toEqual({ started: 2, total: 3 });
  });

  it("totals study time per subject", () => {
    expect(
      minutesBySubject([
        { subject: "Hindi", total_minutes: 30 },
        { subject: "Hindi", total_minutes: 15 },
        { subject: "English", total_minutes: 10 },
      ]),
    ).toEqual({ Hindi: 45, English: 10 });
  });

  it("greets by time of day", () => {
    expect(greetingFor(new Date(2026, 8, 30, 9))).toBe("Good morning");
    expect(greetingFor(new Date(2026, 8, 30, 14))).toBe("Good afternoon");
    expect(greetingFor(new Date(2026, 8, 30, 20))).toBe("Good evening");
  });

  it("picks the subject glyph by keyword", () => {
    expect(subjectIcon("Mathematics")).toContain("mathematics");
    expect(subjectIcon("Science")).toContain("science");
    expect(subjectIcon("Social Science")).toContain("subject_overview"); // not the flask
    expect(subjectIcon("Hindi")).toContain("hindi");
    expect(subjectIcon("English")).toContain("english");
  });

  it("colours by mastery band, not by subject", () => {
    expect(masteryBand(84, true)).toBe("Advanced");
    expect(masteryBand(68, true)).toBe("Proficient");
    expect(masteryBand(45, true)).toBe("Approaching");
    expect(masteryBand(20, true)).toBe("Developing");
    expect(masteryBand(null, false)).toBe("Not started");
    expect(BAND_TONES.Advanced.accent).not.toBe(BAND_TONES.Developing.accent);
  });
});
