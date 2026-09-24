import type { CheckItem, InstanceState, TeacherPayload } from "../types/lesson";

/**
 * The one thing the learner should do right now, derived only from server state
 * and the last turn on screen.
 *
 * The backend decides what a node needs (docs/specs/PROGRESSION_STATE_MACHINE_v1.md,
 * `gened_learning.instances.mark_done`):
 *  - a teach node completes on the learner's explicit done, once engagement reaches
 *    `engagement_required` and every probe has been attempted;
 *  - a practice or assess node completes on its own when its answer round closes,
 *    so the screen never offers a done for it.
 *
 * On top of that, the screen never asks two things at once:
 *  - a failed reply is dealt with before anything else (retry);
 *  - while the tutor's last message is a question, answering it is the main action,
 *    and moving on is offered only as a quiet secondary choice.
 */
export type LessonStep =
  | { kind: "tutor_speaking" }
  | { kind: "retry" }
  | { kind: "reply"; repliesDone: number; repliesNeeded: number; canMoveOn: boolean; isLastPart: boolean }
  | { kind: "check"; check: CheckItem; ordinal: number; total: number }
  | { kind: "continue"; isLastPart: boolean }
  | { kind: "waiting" };

/** What deriveStep needs to know about the newest turn on screen. */
export interface LastTurn {
  status: "streaming" | "completed" | "interrupted" | "failed";
  retryable?: boolean;
  teacherText: string;
}

/** Whether a tutor message ends by asking the learner something. */
export function endsWithQuestion(text: string): boolean {
  return /\?["'”’)\]]*\s*$/.test(text.trim());
}

export function deriveStep(
  instance: InstanceState,
  payload: TeacherPayload,
  tutorSpeaking: boolean,
  lastTurn: LastTurn | null = null,
): LessonStep {
  if (tutorSpeaking) return { kind: "tutor_speaking" };
  if (lastTurn?.status === "failed" && lastTurn.retryable) return { kind: "retry" };

  const node = instance.active_node;
  if (!node) return { kind: "waiting" };

  const isLastPart = instance.nodes_done + 1 >= instance.nodes_total;
  const checks = payload.node.check_items;
  const pending = checks.filter((c) => !node.answered_item_ids.includes(c.id));
  const firstPending = (): LessonStep => ({
    kind: "check",
    check: pending[0],
    ordinal: checks.indexOf(pending[0]) + 1,
    total: checks.length,
  });

  if (node.type !== "teach") return pending.length > 0 ? firstPending() : { kind: "waiting" };

  const engaged = node.engagement_count >= node.engagement_required;
  if (!engaged) {
    return {
      kind: "reply",
      repliesDone: node.engagement_count,
      repliesNeeded: node.engagement_required,
      canMoveOn: false,
      isLastPart,
    };
  }
  if (pending.length > 0) return firstPending();

  const tutorAsked = lastTurn !== null && lastTurn.status === "completed" && endsWithQuestion(lastTurn.teacherText);
  if (tutorAsked) {
    return {
      kind: "reply",
      repliesDone: node.engagement_required,
      repliesNeeded: node.engagement_required,
      canMoveOn: true,
      isLastPart,
    };
  }
  return { kind: "continue", isLastPart };
}
