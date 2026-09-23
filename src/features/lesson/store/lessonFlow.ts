import type { CheckItem, InstanceState, TeacherPayload } from "../types/lesson";

/**
 * The one thing the learner should do right now, derived only from server state.
 *
 * The backend already decides what a node needs (docs/specs/PROGRESSION_STATE_MACHINE_v1.md,
 * `gened_learning.instances.mark_done`):
 *  - a teach node completes on the learner's explicit done, once engagement reaches
 *    `engagement_required` and every probe has been attempted;
 *  - a practice or assess node completes on its own when its answer round closes —
 *    there is no done for it, so the screen never offers one.
 *
 * The screen shows exactly one highlighted action per step, so the learner never has
 * to guess between the chat box, a question card and a button.
 */
export type LessonStep =
  | { kind: "tutor_speaking" }
  | { kind: "reply"; repliesDone: number; repliesNeeded: number }
  | { kind: "check"; check: CheckItem; ordinal: number; total: number }
  | { kind: "continue" }
  | { kind: "waiting" };

export function deriveStep(instance: InstanceState, payload: TeacherPayload, tutorSpeaking: boolean): LessonStep {
  if (tutorSpeaking) return { kind: "tutor_speaking" };
  const node = instance.active_node;
  if (!node) return { kind: "waiting" };

  const checks = payload.node.check_items;
  const pending = checks.filter((c) => !node.answered_item_ids.includes(c.id));

  if (node.type === "teach") {
    if (node.engagement_count < node.engagement_required) {
      return { kind: "reply", repliesDone: node.engagement_count, repliesNeeded: node.engagement_required };
    }
    if (pending.length > 0) {
      return { kind: "check", check: pending[0], ordinal: checks.indexOf(pending[0]) + 1, total: checks.length };
    }
    return { kind: "continue" };
  }

  if (pending.length > 0) {
    return { kind: "check", check: pending[0], ordinal: checks.indexOf(pending[0]) + 1, total: checks.length };
  }
  return { kind: "waiting" };
}
