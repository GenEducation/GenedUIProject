import { describe, it, expect } from "vitest";
import { STALE_AFTER_MS, staleLine, stepStartedLine } from "../RunStatus";
import type { SourceProgress } from "../../types/sources";

const now = Date.parse("2026-10-13T10:00:00Z");
const progress = (over: Partial<SourceProgress> = {}): SourceProgress => ({
  stage: "questions", step: 5, steps: 9, done: 0, total: 0, percent: 50, updated_at: "2026-10-13T09:59:00Z", ...over,
});

describe("stepStartedLine", () => {
  it("says how long ago the current step started", () => {
    const p = progress({ stage_started_at: { render: "2026-10-13T09:00:00Z", questions: "2026-10-13T09:53:30Z" } });
    expect(stepStartedLine("running", p, now)).toBe("Step started 6 min ago");
  });
  it("says nothing without the stage's start, or when not running", () => {
    expect(stepStartedLine("running", progress({ stage_started_at: { render: "2026-10-13T09:00:00Z" } }), now)).toBeNull();
    expect(stepStartedLine("queued", progress({ stage_started_at: { questions: "2026-10-13T09:53:30Z" } }), now)).toBeNull();
  });
});

describe("staleLine", () => {
  it("flags a running run silent for more than 10 minutes only", () => {
    expect(staleLine("running", progress({ updated_at: new Date(now - STALE_AFTER_MS - 1000).toISOString() }), now)).toMatch(/^No update since /);
    expect(staleLine("running", progress({ updated_at: new Date(now - STALE_AFTER_MS + 1000).toISOString() }), now)).toBeNull();
    expect(staleLine("failed", progress({ updated_at: "2026-10-13T08:00:00Z" }), now)).toBeNull();
  });
});
