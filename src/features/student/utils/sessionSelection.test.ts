import { describe, expect, it } from "vitest";

import { selectContinueSession } from "./sessionSelection";

describe("selectContinueSession", () => {
  it("skips completed sessions and returns the newest resumable session", () => {
    const completed = { id: "finished", is_complete: true };
    const resumable = { id: "resume", is_complete: false };

    expect(selectContinueSession([completed, resumable])).toBe(resumable);
  });

  it("returns null when every session is complete", () => {
    expect(selectContinueSession([{ id: "finished", is_complete: true }])).toBeNull();
  });

  it("treats legacy sessions without completion state as resumable", () => {
    const legacy = { id: "legacy" };

    expect(selectContinueSession([legacy])).toBe(legacy);
  });
});
