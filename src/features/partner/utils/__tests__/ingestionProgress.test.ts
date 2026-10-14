import { describe, it, expect } from "vitest";
import type { SourceProgress } from "../../types/sources";
import { shownPercent, stageLine } from "../ingestionProgress";

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
  it("never counts past the total", () => {
    expect(stageLine(progress({ done: 40, total: 36 }))).toBe("Reading pages · 36 of 36 pages");
  });

  it("shows a whole percent while running, and never 100 before the run ends", () => {
    expect(shownPercent("running", progress({ percent: 13.4 }))).toBe(13);
    expect(shownPercent("running", progress({ percent: 100 }))).toBe(99);
    expect(shownPercent("running", null)).toBeNull();
    // a finished run keeps its last progress; the row shows its state instead
    expect(shownPercent("ready", progress({ percent: 100 }))).toBeNull();
  });
});
