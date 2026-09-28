import { describe, expect, it } from "vitest";
import { recordedTurnToTranscript } from "../transcript";
import type { RecordedTurnOut } from "../../types/lesson";

function recorded(overrides: Partial<RecordedTurnOut> = {}): RecordedTurnOut {
  return {
    turn_id: "t1",
    kind: "learner_message",
    status: "failed",
    created_at: "2026-01-01T00:00:00Z",
    closed_at: "2026-01-01T00:00:05Z",
    learner_text: "3/4",
    teacher_text: "That is correct!",
    attempt_id: null,
    item_id: null,
    outcome: null,
    correct: null,
    failure_reason: "policy_refused",
    route: "answer",
    redacted: false,
    committed_through_seq: 3,
    transcript_through_seq: null,
    learner_visible_through_seq: null,
    visibility_source: null,
    figure_group_ids: [],
    ...overrides,
  };
}

describe("recordedTurnToTranscript", () => {
  it("carries the server's failure reason through on a reloaded failed turn", () => {
    // A live SSE `turn_failed` frame tells the UI exactly why (TurnView's FAILURE_COPY map);
    // a page reload rebuilds the transcript from GET teacher-turns instead, and without this
    // field it fell back to a generic "That reply didn't come through." for every reason.
    const turn = recordedTurnToTranscript(recorded({ failure_reason: "policy_refused" }));
    expect(turn.status).toBe("failed");
    expect(turn.failedReason).toBe("policy_refused");
  });

  it("leaves failedReason unset for a turn that isn't failed", () => {
    const turn = recordedTurnToTranscript(recorded({ status: "completed", failure_reason: null }));
    expect(turn.failedReason).toBeUndefined();
  });

  it("leaves failedReason unset when the server recorded no reason for a failed turn", () => {
    const turn = recordedTurnToTranscript(recorded({ failure_reason: null }));
    expect(turn.status).toBe("failed");
    expect(turn.failedReason).toBeUndefined();
  });
});
