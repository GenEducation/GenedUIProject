import { describe, it, expect } from "vitest";
import { progressText } from "../SourceIngestionsView";

const progress = { stage: "read_pages" as const, step: 2, steps: 9, done: 0, total: 0, percent: 37.4, updated_at: "2026-10-13T09:00:00Z" };

describe("SourceIngestionsView progressText", () => {
  it("shows the percent while running", () => {
    expect(progressText({ state: "running", progress })).toBe("37% · read pages (2/9)");
  });
  it("shows only the stage once the run is not running", () => {
    for (const state of ["queued", "failed", "ready", "review_needed", "invalid"] as const) {
      expect(progressText({ state, progress })).toBe("read pages (2/9)");
    }
  });
  it("says not started before any run", () => {
    expect(progressText({ state: "registered", progress: null })).toBe("Not started");
  });
});
