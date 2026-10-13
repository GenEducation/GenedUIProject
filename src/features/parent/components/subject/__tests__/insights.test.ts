import { describe, expect, it } from "vitest";
import {
  buildSkillAreas,
  chapterRows,
  groupAreas,
  helpTips,
  movers,
  overallTrend,
  summarySentence,
  toPct,
  trendDelta,
} from "../insights";

const text = (phrase: { text: string }[]) => phrase.map((p) => p.text).join("");

const TREE = [
  {
    cg_id: "g1",
    cg_name: "Fractions",
    avg_mastery: 0.5,
    concepts: [
      {
        c_id: "c1",
        c_name: "Adding fractions",
        los: [
          { skill_name: "Like denominators", mastery_level: 0.9, assessment_count: 3, justification: "Got all three right." },
          { skill_name: "Unlike denominators", mastery_level: 0.5, assessment_count: 2 },
          { skill_name: "Mixed numbers", mastery_level: 0, assessment_count: 0 },
        ],
      },
    ],
  },
  { cg_id: "g2", cg_name: "Geometry", avg_mastery: 0.3, concepts: [] },
  { cg_id: "g3", cg_name: "Statistics", avg_mastery: 0, concepts: [] },
];

describe("toPct", () => {
  it("turns 0–1 into a clamped whole percentage and rejects junk", () => {
    expect(toPct(0.456)).toBe(46);
    expect(toPct(1.4)).toBe(100);
    expect(toPct(null)).toBeNull();
    expect(toPct("abc")).toBeNull();
  });
});

describe("buildSkillAreas", () => {
  const areas = buildSkillAreas([{ cg_id: "g1", cg_name: "Fractions", avg_mastery: 0.82 }], TREE);

  it("prefers the cg-scores average and sorts strongest first", () => {
    expect(areas.map((a) => [a.name, a.score])).toEqual([
      ["Fractions", 82],
      ["Geometry", 30],
      ["Statistics", 0],
    ]);
  });

  it("averages a concept over its checked objectives only", () => {
    expect(areas[0].concepts[0].score).toBe(70); // (90 + 50) / 2, unchecked one ignored
    expect(areas[0].assessments).toBe(5);
  });

  it("keeps each objective's own score (no blanket 'Proficient')", () => {
    expect(areas[0].concepts[0].objectives.map((o) => o.score)).toEqual([90, 50, 0]);
    expect(areas[0].concepts[0].objectives[0].why).toBe("Got all three right.");
  });

  it("groups by how it's going, leaving unchecked areas aside", () => {
    const g = groupAreas(areas);
    expect(g.strengths.map((a) => a.name)).toEqual(["Fractions"]);
    expect(g.building).toEqual([]);
    expect(g.attention.map((a) => a.name)).toEqual(["Geometry"]);
    expect(g.notYet.map((a) => a.name)).toEqual(["Statistics"]);
  });
});

describe("summarySentence", () => {
  const areas = buildSkillAreas([], TREE.map((g) => (g.cg_id === "g1" ? { ...g, avg_mastery: 0.75 } : g)));

  it("names the level, the strongest area and the one to work on", () => {
    expect(text(summarySentence("Aarav", "Mathematics", 68, areas))).toBe(
      "Aarav is doing well in Mathematics. Strongest in Fractions, while Geometry needs more practice.",
    );
  });

  it("says so plainly when nothing has been checked yet", () => {
    expect(text(summarySentence("your child", "Science", null, []))).toBe(
      "Your child hasn't been assessed in Science yet. Scores appear here after the first few lessons.",
    );
  });
});

describe("progress", () => {
  const history = [
    { overall_score: 0.62, skill_index: 0, adaptive_mode: "", recorded_at: "2026-09-20T10:00:00Z" },
    { overall_score: 0.4, skill_index: 0, adaptive_mode: "", recorded_at: "2026-09-01T10:00:00Z" },
    { overall_score: 0.5, skill_index: 0, adaptive_mode: "", recorded_at: "not a date" },
  ];

  it("orders check-ins oldest first and measures the change", () => {
    const points = overallTrend(history);
    expect(points.map((p) => p.score)).toEqual([40, 62]);
    expect(trendDelta(points)?.delta).toBe(22);
    expect(trendDelta(points.slice(0, 1))).toBeNull();
  });

  it("ranks skills by change, single check-ins last and never invents a starting zero", () => {
    const rows = movers([
      { skill_id: "a", skill_name: "Once", history: [{ mastery_level: 0.7, assessment_count: 1, source: "", session_id: null, recorded_at: "2026-09-01T00:00:00Z" }] },
      { skill_id: "b", skill_name: "Small", history: [
        { mastery_level: 0.5, assessment_count: 1, source: "", session_id: null, recorded_at: "2026-09-01T00:00:00Z" },
        { mastery_level: 0.55, assessment_count: 1, source: "", session_id: null, recorded_at: "2026-09-05T00:00:00Z" },
      ] },
      { skill_id: "c", skill_name: "Big drop", history: [
        { mastery_level: 0.8, assessment_count: 1, source: "", session_id: null, recorded_at: "2026-09-01T00:00:00Z" },
        { mastery_level: 0.4, assessment_count: 1, source: "", session_id: null, recorded_at: "2026-09-05T00:00:00Z" },
      ] },
    ]);
    expect(rows.map((r) => [r.name, r.delta])).toEqual([["Big drop", -40], ["Small", 5], ["Once", 0]]);
    expect(rows[2].points).toHaveLength(1);
  });
});

describe("chapterRows", () => {
  it("drops placeholders and only scores chapters that were started", () => {
    const rows = chapterRows([
      { subject: "M", document_title: "One", completion_percentage: 40, mastery_score: 0.66, study_count: 2, grade: 7, time_minutes: 35 },
      { subject: "M", document_title: "Two", completion_percentage: 0, mastery_score: 0, study_count: 0, grade: 7 },
      { subject: "M", document_title: "Soon", completion_percentage: 0, mastery_score: 0, study_count: 0, grade: 7, is_placeholder: true },
    ]);
    expect(rows.map((r) => [r.title, r.started, r.mastery])).toEqual([["One", true, 66], ["Two", false, null]]);
  });
});

describe("helpTips", () => {
  it("suggests practice for the two weakest areas and praise for the best", () => {
    const tips = helpTips(
      buildSkillAreas([], [
        { cg_id: "1", cg_name: "A", avg_mastery: 0.9 },
        { cg_id: "2", cg_name: "B", avg_mastery: 0.55 },
        { cg_id: "3", cg_name: "C", avg_mastery: 0.2 },
        { cg_id: "4", cg_name: "D", avg_mastery: 0.45 },
      ]),
    );
    expect(tips.map((t) => [t.kind, t.area])).toEqual([["practice", "C"], ["practice", "D"], ["praise", "A"]]);
  });
});
