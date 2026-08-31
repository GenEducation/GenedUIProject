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
