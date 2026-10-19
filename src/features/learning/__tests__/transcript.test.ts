import { describe, it, expect } from "vitest";
import { applyEvent, fromRecorded, newTurn, replyText } from "../transcript";
import type { SequencedTurnEvent } from "../types";

const T = "turn-1";
const delta = (seq: number, text: string | null): SequencedTurnEvent => ({ v: 3, turn_id: T, seq, type: "text_delta", text });
const apply = (...events: SequencedTurnEvent[]) => events.reduce(applyEvent, newTurn(T, "learner_message", "hi"));

describe("transcript reducer", () => {
  it("assembles the reply by seq and ignores replays, so a resumed stream never doubles text", () => {
    const turn = apply(delta(2, "Hello "), delta(3, "there"), delta(2, "Hello "), delta(3, "there"));
    expect(replyText(turn)).toBe("Hello there");
    expect(turn.lastSeq).toBe(3);
  });

  it("ignores another turn's events", () => {
    const other: SequencedTurnEvent = { v: 3, turn_id: "turn-2", seq: 2, type: "text_delta", text: "x" };
    expect(replyText(apply(other))).toBe("");
  });

  it("keeps a withheld delta's seq without showing text", () => {
    const turn = apply(delta(2, "a"), { ...delta(3, null), redacted: true } as SequencedTurnEvent, delta(4, "b"));
    expect(replyText(turn)).toBe("ab");
    expect(turn.lastSeq).toBe(4);
  });

  it("an interruption drops text past transcript_through_seq", () => {
    const turn = apply(delta(2, "kept "), delta(3, "dropped"), { v: 3, turn_id: T, seq: 4, type: "turn_interrupted", cause: "learner_stop", transcript_through_seq: 2 });
    expect(turn.status).toBe("interrupted");
    expect(replyText(turn)).toBe("kept ");
  });

  it("records a presented figure once, a failure, and the answer outcome", () => {
    const fig: SequencedTurnEvent = { v: 3, turn_id: T, seq: 2, type: "figure_presented", figure_group_id: "g1" };
    const failed = apply(fig, { ...fig, seq: 3 }, { v: 3, turn_id: T, seq: 4, type: "turn_failed", reason: "model_error", retryable: true, retry: "regenerate" });
    expect(failed.figureGroupIds).toEqual(["g1"]);
    expect(failed).toMatchObject({ status: "failed", failure: { reason: "model_error", retryable: true } });
  });

  it("builds a turn from history", () => {
    const turn = fromRecorded({
      turn_id: T, kind: "learner_message", status: "completed", learner_text: "q", teacher_text: "a",
      created_at: "2026-10-09T00:00:00Z", committed_through_seq: 5, figure_group_ids: ["g1"],
    });
    expect(turn).toMatchObject({ learnerText: "q", status: "completed", lastSeq: 5, figureGroupIds: ["g1"] });
    expect(replyText(turn)).toBe("a");
  });
});
