/**
 * Everything that turns "something happened" into "the pet should feel X".
 *
 * Two kinds of source, and the split matters:
 *
 *  - **Backend frames.** `pet_emotion` arrives on the chat SSE stream and the
 *    voice socket, legacy and V2 alike (see
 *    `MVP/docs/pet-emotions-frontend-integration.md`). The backend sends at
 *    most one per turn (plus a lesson-end `celebration`), as early as it can:
 *    with Jev on, every reaction is Jev's read of the tutor, landing while the
 *    tutor is still speaking, and the grading ledger sends no bursts except
 *    `celebration` — its `ledger.*` causes only appear as the fallback when
 *    Jev is off. So a frame is shown as-is, the moment it arrives; nothing
 *    here holds, reorders or second-guesses one ("a late reaction is worse
 *    than none"). `answer_graded` is received but deliberately *not* shown:
 *    it only advances `seq`, and nothing is derived from a running score.
 *  - **Local sources.** Triggers the backend has defined but not wired yet
 *    (`interactive.*`, `milestone.placement_done`, `milestone.streak*`) plus
 *    the chapter test verdict, derived from API responses the app already
 *    gets. Each sits behind a flag in `LOCAL_SOURCES` so it can be switched
 *    off the day the backend starts sending the matching cause — otherwise the
 *    pet would react twice.
 *
 * Pure functions only; the store holds the state they thread through.
 */

import { isBackendEmotion, type BackendEmotion, type PetEmotion } from "../theme/petExpressions";

/**
 * Frontend-derived triggers, one switch per backend cause that is not live yet.
 * Flip one to `false` when the backend ships it.
 */
export const LOCAL_SOURCES = {
  /** `interactive.graded_correct/incorrect` — math and comprehension widgets. */
  interactive: true,
  /** `milestone.placement_done`. */
  placement: true,
  /** Chapter test verdict — no backend cause exists for it. */
  test: true,
  /** `milestone.streak`, `milestone.streak_lost`. */
  dayStreak: true,
};

// ── Backend frames ──────────────────────────────────────────────────────────

export interface PetEmotionFrame {
  type: "pet_emotion";
  emotion: BackendEmotion;
  /** For logs only. Never branch on it — `emotion` is the contract. */
  cause: string;
  /** Monotonic per session, shared with `answer_graded`. */
  seq: number;
  turn_id?: string;
}

export interface AnswerGradedFrame {
  type: "answer_graded";
  correct: boolean;
  /** Always `false` today; reserved by the backend. */
  burst: boolean;
  seq: number;
  concept_id?: string;
  streak?: number;
}

export type PetFrame = PetEmotionFrame | AnswerGradedFrame;

/**
 * Narrow an untyped stream event to a pet frame, or `null` if it is not one.
 *
 * Validated rather than cast: these arrive on the same channels as every other
 * event, and a frame with an emotion this build does not know (the backend
 * adding one ahead of the client) must be dropped, not rendered as `undefined`.
 */
export function parsePetFrame(event: unknown): PetFrame | null {
  if (!event || typeof event !== "object") return null;
  const e = event as Record<string, unknown>;
  if (typeof e.seq !== "number" || !Number.isFinite(e.seq)) return null;
  if (e.type === "pet_emotion") {
    if (!isBackendEmotion(e.emotion)) return null;
    return {
      type: "pet_emotion",
      emotion: e.emotion,
      cause: typeof e.cause === "string" ? e.cause : "unknown",
      seq: e.seq,
      ...(typeof e.turn_id === "string" ? { turn_id: e.turn_id } : {}),
    };
  }
  if (e.type === "answer_graded") {
    return {
      type: "answer_graded",
      correct: e.correct === true,
      burst: e.burst === true,
      seq: e.seq,
      ...(typeof e.concept_id === "string" ? { concept_id: e.concept_id } : {}),
      ...(typeof e.streak === "number" ? { streak: e.streak } : {}),
    };
  }
  return null;
}

/**
 * Drop replays. `seq` is monotonic per session, so after a reconnect the
 * backend may resend frames the pet has already reacted to; anything at or
 * below the last applied `seq` for that session is ignored.
 *
 * Keyed per session so a new chat, or a voice session after a chat, starts
 * from nothing rather than inheriting another session's high-water mark.
 */
export function acceptSeq(
  lastSeqBySession: Record<string, number>,
  sessionKey: string,
  seq: number,
): { accept: boolean; lastSeqBySession: Record<string, number> } {
  const last = lastSeqBySession[sessionKey];
  if (last !== undefined && seq <= last) return { accept: false, lastSeqBySession };
  return { accept: true, lastSeqBySession: { ...lastSeqBySession, [sessionKey]: seq } };
}

// ── Damper ──────────────────────────────────────────────────────────────────

/** The same emotion again inside this window is one reaction, not two. */
export const COALESCE_MS = 4000;
/**
 * Supportive is comfort; repeated, it reads as the pet pitying the student.
 * The backend allows one reaction per turn, and during a rough patch Jev can
 * read the tutor's reassurance as Supportive turn after turn (as can the
 * ledger's consecutive-wrong, when Jev is off), so it gets a long cooldown of
 * its own.
 */
export const SUPPORTIVE_COOLDOWN_MS = 60_000;

export type DamperState = Partial<Record<PetEmotion, number>>;

export function passDamper(
  lastAt: DamperState,
  emotion: PetEmotion,
  now: number,
): { pass: boolean; lastAt: DamperState } {
  const prev = lastAt[emotion];
  const window = emotion === "supportive" ? SUPPORTIVE_COOLDOWN_MS : COALESCE_MS;
  if (prev !== undefined && now - prev < window) return { pass: false, lastAt };
  return { pass: true, lastAt: { ...lastAt, [emotion]: now } };
}

// ── Local: widget answers ───────────────────────────────────────────────────

export interface WidgetTally {
  consecutiveWrong: number;
  correctStreak: number;
  /** Submissions seen per directive — comprehension results carry no `attempts`. */
  attemptsByDirective: Record<string, number>;
}

export const EMPTY_TALLY: WidgetTally = { consecutiveWrong: 0, correctStreak: 0, attemptsByDirective: {} };

/** Correctness streaks worth an Excited, mirroring `ledger.streak_3/6/9`. */
export const WIDGET_STREAKS = [3, 6, 9];

/**
 * One graded widget answer → one emotion, mirroring the backend ledger.
 *
 * Order of precedence within a single answer, most specific first:
 * right on a retry is Proud (they fixed it themselves), a streak landmark is
 * Excited, and otherwise it is Cheer. A wrong answer is Encouraging ("so
 * close, go on" — the v3 ledger's `interactive.graded_incorrect`); wrong twice
 * running — or wrong again on a retry — is Supportive rather than a second
 * Encouraging.
 */
export function fromWidgetResult(
  tally: WidgetTally,
  result: { directiveId: string; isCorrect: boolean; attempts?: number },
): { tally: WidgetTally; emotion: BackendEmotion } {
  const seen = (tally.attemptsByDirective[result.directiveId] ?? 0) + 1;
  const attempts = Math.max(result.attempts ?? 0, seen);
  const attemptsByDirective = { ...tally.attemptsByDirective, [result.directiveId]: seen };

  if (result.isCorrect) {
    const correctStreak = tally.correctStreak + 1;
    const emotion: BackendEmotion =
      attempts > 1 ? "proud" : WIDGET_STREAKS.includes(correctStreak) ? "excited" : "cheer";
    return { tally: { consecutiveWrong: 0, correctStreak, attemptsByDirective }, emotion };
  }

  const consecutiveWrong = tally.consecutiveWrong + 1;
  const emotion: BackendEmotion = consecutiveWrong >= 2 || attempts > 1 ? "supportive" : "encouraging";
  return { tally: { consecutiveWrong, correctStreak: 0, attemptsByDirective }, emotion };
}

// ── Local: chapter test verdict ─────────────────────────────────────────────

export function fromTestVerdict(verdict: string | null | undefined): BackendEmotion | null {
  switch (verdict) {
    case "ABOVE":
      return "celebration";
    case "AT":
      return "cheer";
    case "BELOW":
      return "supportive";
    default:
      return null;
  }
}

// ── Local: day streak ───────────────────────────────────────────────────────

/** Day-streak lengths worth a Celebration rather than an Excited. */
export const STREAK_MILESTONES = [3, 7, 30];

/**
 * A change in the day streak between two observations.
 *
 * `prev` is `null` when there is nothing to compare against — the first
 * observation on a device that has never recorded one — and that must fire
 * nothing, or every first load reads as a streak event.
 */
export function fromStreakChange(prev: number | null, curr: number): BackendEmotion | null {
  if (prev === null || curr === prev) return null;
  // A lost streak gets no reaction: the pet is positive-only, and there is no
  // positive way to mark the student losing something.
  if (curr < prev) return null;
  // Crossed rather than landed on: a student away for two days who returns on
  // a 7-streak from 5 still passed the milestone.
  const hitMilestone = STREAK_MILESTONES.some((m) => prev < m && curr >= m);
  return hitMilestone ? "celebration" : "excited";
}
