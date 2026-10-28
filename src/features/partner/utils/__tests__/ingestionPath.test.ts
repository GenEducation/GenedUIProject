import { describe, it, expect } from "vitest";
import { elapsed, milestones, pathSteps } from "../ingestionPath";
import { runPhases } from "../ingestionPhases";
import type { SourceProgress } from "../../types/sources";

const at = (stage: SourceProgress["stage"], step: number, over: Partial<SourceProgress> = {}): SourceProgress => ({
  stage, step, steps: 9, done: 0, total: 0, percent: 40, updated_at: "2026-10-13T09:10:00Z", ...over,
});

describe("pathSteps", () => {
  it("lists every stage as still to come before a run reports", () => {
    const steps = pathSteps("queued", null);
    expect(steps).toHaveLength(9);
    expect(steps.every((s) => s.status === "pending")).toBe(true);
  });

  it("ignores the previous run's progress while a new run is queued", () => {
    const old = at("questions", 5, { done: 3, total: 9, stage_started_at: { render: "2026-10-13T09:00:00Z" } });
    expect(pathSteps("queued", old).every((s) => s.status === "pending" && s.startedAt === null)).toBe(true);
    const phases = runPhases("queued", old);
    expect(phases.every((p) => p.status === "pending" && p.fill === 0)).toBe(true);
  });

  it("marks the stages before the current one done and shows what they produced", () => {
    const progress = at("questions", 5, {
      counts: { pages: 36, unreadable_pages: 1, components: 9, components_new: 7, components_matched: 2 },
      stage_started_at: { render: "2026-10-13T09:00:00Z", questions: "2026-10-13T09:08:00Z" },
    });
    const steps = pathSteps("running", progress);
    expect(steps.map((s) => s.status)).toEqual(["done", "done", "done", "done", "current", "pending", "pending", "pending", "pending"]);
    expect(steps[0].counts).toEqual([{ name: "pages", value: 36 }]);
    expect(steps[3].counts.map((c) => c.value)).toEqual([7, 2]);
    expect(steps[4].startedAt).toBe("2026-10-13T09:08:00Z");
    expect(steps[1].kind).toBe("ai");
    expect(steps[3].kind).toBe("automatic");
  });

  it("counts units while a stage is counting them", () => {
    const steps = pathSteps("running", at("read_pages", 2, { done: 12, total: 36 }));
    expect(steps[1].unitLine).toBe("12 of 36 pages");
  });

  it("leaves visuals out of a run without them", () => {
    const steps = pathSteps("running", at("lesson", 7, { steps: 8 }));
    expect(steps.map((s) => s.stage)).not.toContain("visuals");
  });

  it("shows where a failed run stopped and that the rest was not reached", () => {
    const steps = pathSteps("failed", at("figures", 6));
    expect(steps[5].status).toBe("stopped");
    expect(steps[6].status).toBe("not_reached");
  });

  it("shows a finished run as done throughout", () => {
    const steps = pathSteps("ready", at("submit", 9, { percent: 100 }));
    expect(steps.every((s) => s.status === "done")).toBe(true);
  });
});

describe("milestones", () => {
  const base = { created_at: "2026-10-13T09:00:00Z", queued_at: "2026-10-13T09:01:00Z", started_at: "2026-10-13T09:02:00Z", finished_at: null };

  it("waits for the partner's review until the release is published", () => {
    const release = { batch_id: "b", state: "ready" as const, staged_at: "2026-10-13T09:30:00Z", published_at: null };
    const { before, after } = milestones({ ...base, state: "ready", release });
    expect(before.map((m) => m.status)).toEqual(["done", "done", "done"]);
    expect(after[0]).toMatchObject({ status: "current", at: release.staged_at });
    expect(after[0].note).toMatch(/nothing reaches students until you publish/);
    expect(after[1].status).toBe("pending");
  });

  it("is live once published, and flags a blocked release", () => {
    const published = { batch_id: "b", state: "published" as const, staged_at: "x", published_at: "2026-10-14T10:00:00Z" };
    expect(milestones({ ...base, state: "ready", release: published }).after.map((m) => m.status)).toEqual(["done", "done"]);
    const blocked = { ...published, state: "blocked" as const, published_at: null };
    expect(milestones({ ...base, state: "invalid", release: blocked }).after[0].status).toBe("problem");
  });

  it("has not started a queued run", () => {
    const { before } = milestones({ ...base, started_at: null, state: "queued", release: null });
    expect(before.map((m) => m.status)).toEqual(["done", "current", "pending"]);
  });
});

describe("elapsed", () => {
  it("reads in minutes and hours", () => {
    expect(elapsed("2026-10-13T09:00:00Z", "2026-10-13T09:04:00Z")).toBe("4 min");
    expect(elapsed("2026-10-13T09:00:00Z", "2026-10-13T10:12:00Z")).toBe("1 h 12 min");
    expect(elapsed(null, "2026-10-13T10:12:00Z")).toBeNull();
  });
});
