import { describe, it, expect } from "vitest";

import {
  chapterProgress,
  fillDailySeries,
  localDayKey,
  sessionTrendPct,
  totalMinutes,
} from "../homeMetrics";
import { BAND_TONES, masteryBand } from "../subjectVisuals";

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

  it("colours by mastery band, not by subject", () => {
    expect(masteryBand(84, true)).toBe("Advanced");
    expect(masteryBand(68, true)).toBe("Proficient");
    expect(masteryBand(45, true)).toBe("Approaching");
    expect(masteryBand(20, true)).toBe("Developing");
    expect(masteryBand(null, false)).toBe("Not started");
    expect(BAND_TONES.Advanced.accent).not.toBe(BAND_TONES.Developing.accent);
  });
});
