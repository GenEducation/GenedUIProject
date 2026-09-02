// Pure decision logic for the mic worklet's speech-onset handling in
// speechPipelineService.ts. Extracted so the exact bug class fixed here has a
// regression test: session 5d058c6c-... showed a VAD false-positive during the
// tutor's "thinking" pause cancelling the brain generation on the very first tick,
// because the interruption confirmation was applied only to "speaking", never
// "thinking" -- see speechPipelineService.ts's _onMicMessage for the full story.

import type { PipelineState } from "@/features/student/services/speechPipelineService";

/** States where the tutor currently owns the turn -- a voice onset here might be a
 * real interruption, or might be a stray noise, and must not be trusted on sight. */
export function ownsTheTurn(state: PipelineState): boolean {
  return state === "speaking" || state === "thinking";
}

/** Has this onset lasted long enough to treat as real speech rather than a
 * backchannel/false-positive (design doc §7.5)? */
export function isSustained(speechOnsetAt: number, now: number, minMs: number): boolean {
  return now - speechOnsetAt >= minMs;
}

/** What to do with one 20ms capture frame right now. */
export type FrameAction = "send" | "buffer" | "drop";

/**
 * Frames captured while an interruption is still being confirmed must be HELD, never
 * discarded.
 *
 * This logic used to be `if (state === "listening") send()` with no else branch, which
 * meant the whole BARGE_IN_MIN_MS confirmation window -- 400ms during which the child is
 * actively talking -- went on the floor. STT received the preroll (which ends at onset),
 * then a 400ms hole punched out of the START of the word, then the rest of the sentence.
 * Handed that discontinuity, the model reported back only the part it could make sense
 * of, which is exactly the shape of every clipped transcript seen live: "with data",
 * "with the". Buffering and flushing on confirmation is what makes the uploaded stream
 * contiguous again.
 */
export function frameAction(state: PipelineState, hasPendingOnset: boolean): FrameAction {
  if (state === "listening") return "send"; // the turn is open server-side
  if (hasPendingOnset) return "buffer"; // mid-confirmation: the child is speaking NOW
  return "drop"; // no onset at all -- genuine silence between turns
}
