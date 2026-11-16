import { describe, it, expect } from "vitest";

import { fillDailySeries, localDayKey, timeBySubject, totalMinutes } from "../homeMetrics";
import { BAND_TONES, masteryBand } from "../subjectVisuals";

const TODAY = new Date(2026, 8, 30, 15, 0); // 30 Sept 2026, 3pm local

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

  it("adds up minutes and sessions per subject, matching a code to its name", () => {
    expect(
      timeBySubject([
        { subject: "social_science", total_minutes: 30, session_count: 2 },
        { subject: "Social Science", total_minutes: 15, session_count: 1 },
        { subject: "english", total_minutes: 10, session_count: 4 },
      ]),
    ).toEqual({ social_science: { minutes: 45, sessions: 3 }, english: { minutes: 10, sessions: 4 } });
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
