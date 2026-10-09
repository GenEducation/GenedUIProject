import type { RecordedTurn, SequencedTurnEvent, TurnKind, FailureReason } from "./types";

export type TurnStatus = "streaming" | "completed" | "incomplete" | "failed" | "interrupted";

/** One exchange on screen: what the learner sent (if anything) and the tutor's reply. */
export interface LessonTurn {
  turnId: string;
  kind: TurnKind;
  learnerText: string | null;
  /** Each text delta by seq; the reply is their concatenation (withheld deltas carry null). */
  deltas: Array<{ seq: number; text: string | null }>;
  figureGroupIds: string[];
  status: TurnStatus;
  /** The highest seq applied: the resume cursor and the learner's `visible_seq` on stop. */
  lastSeq: number;
  /** `message`: the backend's own words when it refused the turn outright (e.g. the tutor is unavailable). */
  failure: { reason: FailureReason; retryable: boolean; message?: string } | null;
  outcome: "correct" | "incorrect" | "quarantined" | null;
  createdAt: string;
}

export const replyText = (turn: LessonTurn): string => turn.deltas.map((d) => d.text ?? "").join("");

export function newTurn(turnId: string, kind: TurnKind, learnerText: string | null): LessonTurn {
  return {
    turnId, kind, learnerText, deltas: [], figureGroupIds: [], status: "streaming", lastSeq: 0,
    failure: null, outcome: null, createdAt: new Date().toISOString(),
  };
}

const RECORDED_STATUS: Record<string, TurnStatus> = {
  completed: "completed", incomplete: "incomplete", failed: "failed", interrupted: "interrupted",
};

/** A recorded turn from history as an on-screen turn; its whole reply is one delta. */
export function fromRecorded(turn: RecordedTurn): LessonTurn {
  const last = turn.transcript_through_seq ?? turn.committed_through_seq ?? 0;
  return {
    turnId: turn.turn_id,
    kind: turn.kind,
    learnerText: turn.learner_text ?? null,
    deltas: turn.teacher_text ? [{ seq: last, text: turn.teacher_text }] : [],
    figureGroupIds: [...turn.figure_group_ids],
    status: RECORDED_STATUS[turn.status] ?? "streaming",
    lastSeq: last,
    failure: turn.failure_reason ? { reason: turn.failure_reason, retryable: false } : null,
    outcome: turn.outcome ?? null,
    createdAt: turn.created_at,
  };
}

/**
 * Apply one event to its turn. Events are applied in seq order exactly once:
 * one at or below `lastSeq` is a replay (a resumed or retried stream) and is
 * ignored, so text is never doubled. `state_changed` and `answer_recorded` are
 * lesson facts; the store reads them, this only tracks the turn.
 */
export function applyEvent(turn: LessonTurn, event: SequencedTurnEvent): LessonTurn {
  if (event.turn_id !== turn.turnId || event.seq <= turn.lastSeq) return turn;
  const next: LessonTurn = { ...turn, lastSeq: event.seq };
  switch (event.type) {
    case "text_delta":
      next.deltas = [...turn.deltas, { seq: event.seq, text: event.text }];
      break;
    case "figure_presented":
      if (!turn.figureGroupIds.includes(event.figure_group_id)) {
        next.figureGroupIds = [...turn.figureGroupIds, event.figure_group_id];
      }
      break;
    case "answer_recorded":
      next.outcome = event.outcome;
      break;
    case "turn_completed":
      next.status = event.status;
      break;
    case "turn_failed":
      next.status = "failed";
      next.failure = { reason: event.reason, retryable: event.retryable };
      break;
    case "turn_interrupted":
      next.status = "interrupted";
      // The canonical transcript ends here: drop anything rendered past it.
      next.deltas = turn.deltas.filter((d) => d.seq <= event.transcript_through_seq);
      break;
    default:
      break;
  }
  return next;
}

export const isTerminal = (status: TurnStatus): boolean => status !== "streaming";
