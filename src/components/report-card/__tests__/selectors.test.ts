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
    [60, "Proficient"], [59, "Approaching"],
    [40, "Approaching"], [39, "Developing"],
    [0, "Developing"],
  ] as const)("colours %i%% mastery as %s", (mastery, band) => {
    expect(toneFor(mastery, true)).toBe(BAND_TONES[band]);
  });

  it("is grey for anything not started, whatever the score", () => {
    expect(toneFor(90, false)).toBe(BAND_TONES["Not started"]);
    expect(toneFor(null, false)).toBe(BAND_TONES["Not started"]);
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

  it("takes latest activity from the most recently analysed chapter", () => {
    expect(byName.English.latest?.chapter).toBe("Creative Writing");
    expect(byName["Social Science"].latest).toBeNull();
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
  it("rolls subjects up and names the strongest and weakest", () => {
    const o = overallSummary(makeData());
    expect(o.avgMastery).toBe(56);
    expect(o).toMatchObject({ chaptersCompleted: 3, chaptersTotal: 13, tests: 1 });
    expect(o.strongest?.subject).toBe("English");
    expect(o.weakest?.subject).toBe("Social Science");
  });

  it("names no strongest/weakest with fewer than two subjects", () => {
    const o = overallSummary(makeData({ subjects: SUBJECTS.slice(0, 1) }));
    expect(o.strongest).toBeNull();
    expect(o.weakest).toBeNull();
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

  it("sorts by mastery with unstarted chapters last", () => {
    expect(chapterRows(data, "Mathematics", "mastery").map((r) => r.title)).toEqual([
      "Polynomials", "Real Numbers", "Coordinate Geometry", "Linear Equations in Two Variables",
    ]);
  });

  it("sorts by most recently analysed", () => {
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
  });

  it("is null until there are two scored sessions", () => {
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
    [0, "Today"], [1, "Yesterday"], [4, "4 days ago"], [40, "1 month ago"], [95, "3 months ago"],
  ])("%i days back reads %s", (days, label) => {
    expect(relativeDay(new Date(FIXTURE_NOW - days * 86_400_000).toISOString(), FIXTURE_NOW)).toBe(label);
  });
});
