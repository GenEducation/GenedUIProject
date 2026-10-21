import { describe, it, expect } from "vitest";
import {
  chapterRows,
  keyInsights,
  overallSummary,
  relativeDay,
  subjectSummaries,
  subjectTrend,
} from "../selectors";
import { BAND_TONES, toneFor } from "../subjectVisuals";
import { FIXTURE_NOW, SUBJECTS, makeData } from "./fixtures";

describe("toneFor", () => {
  it.each([
    [80, "Advanced"], [79, "Proficient"],
  ] as const)("colours %i%% mastery as %s", (mastery, band) => {
    expect(toneFor(mastery, true)).toBe(BAND_TONES[band]);
  });
});

describe("subjectSummaries", () => {
  const byName = Object.fromEntries(subjectSummaries(makeData()).map((s) => [s.subject, s]));

  it("derives mastery, band and colour from the subject's own score", () => {
    expect(byName.English).toMatchObject({ mastery: 82, band: "Advanced", tone: BAND_TONES.Advanced });
    expect(byName.Mathematics).toMatchObject({ mastery: 61, band: "Proficient", tone: BAND_TONES.Proficient });
    expect(byName.Science).toMatchObject({ mastery: 47, band: "Approaching" });
    expect(byName["Social Science"]).toMatchObject({ mastery: 34, band: "Developing" });
  });

  it("counts every chapter, completed and started ones, and averages coverage", () => {
    // Real Numbers 70, Polynomials 100, Coordinate Geometry 45, Linear Eq 0.
    expect(byName.Mathematics).toMatchObject({ chaptersTotal: 4, chaptersCompleted: 1, chaptersStarted: 3, coverage: 54 });
  });

  it("treats a subject with no sessions and no progress as not started", () => {
    const [s] = subjectSummaries(makeData({
      subjects: [{ subject: "Hindi", overall_score: 0, skill_index: 0, adaptive_mode: "PRACTICE", session_count: 0 }],
      chapters: [],
    }));
    expect(s).toMatchObject({ started: false, band: "Not started", tone: BAND_TONES["Not started"] });
  });
});

describe("overallSummary", () => {
  it("rolls subjects up and names the strongest and weakest, but only with two or more", () => {
    const o = overallSummary(makeData());
    expect(o.avgMastery).toBe(56);
    expect(o).toMatchObject({ chaptersCompleted: 3, chaptersTotal: 13, tests: 1 });
    expect(o.strongest?.subject).toBe("English");
    expect(o.weakest?.subject).toBe("Social Science");

    const single = overallSummary(makeData({ subjects: SUBJECTS.slice(0, 1) }));
    expect(single.strongest).toBeNull();
    expect(single.weakest).toBeNull();
  });
});

describe("chapterRows", () => {
  const data = makeData();

  it("includes unstarted chapters, with their own status and colour", () => {
    const rows = chapterRows(data, "Mathematics");
    expect(rows.map((r) => r.status)).toEqual(["In progress", "Completed", "In progress", "Not started"]);
    expect(rows[3]).toMatchObject({ started: false, band: "Not started", n: 4 });
    // A weak chapter in a Proficient subject still shows its own band.
    expect(rows[2]).toMatchObject({ mastery: 52, band: "Approaching", tone: BAND_TONES.Approaching });
  });

  it("sorts by mastery with unstarted chapters last, or by most recently analysed", () => {
    expect(chapterRows(data, "Mathematics", "mastery").map((r) => r.title)).toEqual([
      "Polynomials", "Real Numbers", "Coordinate Geometry", "Linear Equations in Two Variables",
    ]);
    expect(chapterRows(data, "Mathematics", "recent").map((r) => r.title).slice(0, 2)).toEqual([
      "Coordinate Geometry", "Polynomials",
    ]);
  });
});

describe("subjectTrend", () => {
  it("chains session scores across chapters, oldest analysis first", () => {
    // Poetry (9 days ago) then Creative Writing (2 days ago).
    const t = subjectTrend(makeData(), "English");
    expect(t?.points).toEqual([62, 70, 74, 79, 72, 78, 81, 86, 88]);
    expect(t?.delta).toBe(26);
    // Null until there are two scored sessions.
    expect(subjectTrend(makeData(), "Social Science")).toBeNull();
  });
});

describe("keyInsights", () => {
  it("merges weaknesses with focus areas, and is null without a report", () => {
    expect(keyInsights(makeData())?.attention).toEqual(["Social Science needs focus (34% mastery)."]);
    expect(keyInsights(makeData())?.focusAreas[0].area).toBe("Coordinate Geometry and plotting");
    expect(keyInsights(makeData({ progressReport: null }))).toBeNull();
  });
});

describe("relativeDay", () => {
  it.each([
    [1, "Yesterday"], [40, "1 month ago"],
  ])("%i days back reads %s", (days, label) => {
    expect(relativeDay(new Date(FIXTURE_NOW - days * 86_400_000).toISOString(), FIXTURE_NOW)).toBe(label);
  });
});
