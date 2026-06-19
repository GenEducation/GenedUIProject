/**
 * Answer serialization — mirrors buildAnswerString in the web useTestStore.
 *
 * The runner keeps a single `answers: Record<questionId, string>` map. For
 * true_false (with justification) and match_the_following, the composite value
 * is encoded into that string here so the backend receives the exact same
 * `student_answer` format the web sends.
 */
import type { Question } from "../../types/test";

/** true_false answer + optional justification → "True. because ..." */
export function encodeTrueFalse(answer: string, justification?: string): string {
  const j = justification?.trim();
  return j ? `${answer}. ${j}` : answer;
}

/** match selections {leftId: rightLabel} → "1→A, 2→C" sorted by left id */
export function encodeMatch(selections: Record<number, string>): string {
  return Object.entries(selections)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([id, label]) => `${id}→${label}`)
    .join(", ");
}

/** Is this question considered answered (for progress + submit-confirm)? */
export function isAnswered(q: Question, value: string | undefined): boolean {
  if (!value) return false;
  // true_false stores at least the verdict; match stores "n→X" pairs; others plain text
  return value.trim().length > 0;
}

export function marksLabel(marks: number): string {
  return marks === 1 ? "1 mark" : `${marks} marks`;
}
