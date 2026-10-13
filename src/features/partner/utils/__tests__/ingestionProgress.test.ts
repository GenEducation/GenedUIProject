import { describe, it, expect } from "vitest";
import type { SourceProgress } from "../../types/sources";
import { activeStatus, shownPercent, stageLine, stepLine } from "../ingestionProgress";

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
  it("names the stage with its count, and the step", () => {
    expect(stageLine(progress())).toBe("Reading pages · 12 of 36 pages");
    expect(stageLine(progress({ stage: "visuals", done: 3, total: 10 }))).toBe("Drawing teaching visuals · 3 of 10 visuals");
    expect(stepLine(progress())).toBe("Step 2 of 9");
  });

  it("shows just the stage name when it has nothing to count", () => {
    expect(stageLine(progress({ stage: "components", done: 0, total: 0 }))).toBe("Finding the key concepts");
  });

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

  it("says what a queued or just-started run is doing", () => {
    expect(activeStatus("queued", null)).toEqual({ line: "Waiting in line to start", step: null });
    expect(activeStatus("running", null)).toEqual({ line: "Starting up", step: null });
    expect(activeStatus("running", progress())).toEqual({ line: "Reading pages · 12 of 36 pages", step: "Step 2 of 9" });
    expect(activeStatus("ready", progress())).toBeNull();
  });
});
