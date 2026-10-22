import { describe, it, expect } from "vitest";
import type { SourceProgress } from "../../types/sources";
import { shownPercent } from "../ingestionProgress";
import { nowLine, runPhases } from "../ingestionPhases";

const progress = (over: Partial<SourceProgress> = {}): SourceProgress => ({
  stage: "read_pages",
  step: 2,
  steps: 9,
  done: 12,
  total: 36,
  percent: 13.4,
  updated_at: "2026-10-13T10:00:00Z",
  ...over,
});

describe("ingestion progress, as a partner reads it", () => {
  it("shows a whole percent while running, and never 100 before the run ends", () => {
    expect(shownPercent("running", progress({ percent: 13.4 }))).toBe(13);
    expect(shownPercent("running", progress({ percent: 100 }))).toBe(99);
    expect(shownPercent("running", null)).toBeNull();
    // a finished run keeps its last progress; the row shows its state instead
    expect(shownPercent("ready", progress({ percent: 100 }))).toBeNull();
  });

  it("says what it is doing, never counting past the total", () => {
    expect(nowLine("running", progress({ done: 40, total: 36 }))).toBe("Reading pages · 36 of 36 pages");
    expect(nowLine("running", progress({ stage: "questions", step: 5, total: 0 }))).toBe("Writing practice questions");
    expect(nowLine("queued", null)).toBe("Waiting in line to start");
    expect(nowLine("running", null)).toBe("Starting up");
  });

  it("groups the nine stages into four phases, part-filling the one running", () => {
    const phases = runPhases("running", progress({ counts: { pages: 36 } }));
    expect(phases.map((p) => p.status)).toEqual(["current", "pending", "pending", "pending"]);
    // render done, read_pages a third through: (1 + 12/36) / 2
    expect(phases[0].fill).toBeCloseTo(2 / 3);
    expect(phases[0].summary).toBe("36 pages");
  });

  it("sums up what each finished phase produced", () => {
    const phases = runPhases("ready", progress({
      stage: "submit", step: 9, done: 1, total: 1, percent: 100,
      counts: { pages: 36, unreadable_pages: 1, components: 9, components_new: 7, components_matched: 2, questions: 41, figure_groups: 8 },
    }));
    expect(phases.every((p) => p.status === "done")).toBe(true);
    expect(phases.map((p) => p.summary)).toEqual([
      "36 pages · 1 unreadable",
      "9 concepts · 7 new, 2 already in GenEd",
      "41 questions · 8 figures",
      null,
    ]);
  });
});
