/**
 * Gesture recognition and mood escalation for the desk buddy.
 *
 * Pure and DOM-free on purpose. Shake detection is real gesture recognition,
 * not a threshold check, and its important failure mode — an ordinary drag
 * registering as a shake — is invisible in a screenshot. Keeping it here means
 * it can be tested directly, the way `sessionSelection.ts` and
 * `voiceStreamMerge.ts` already are.
 *
 * Every timing and threshold the buddy reacts on lives in this file rather
 * than scattered through the component.
 */

// ── Shake ────────────────────────────────────────────────────────────────────

/** Samples older than this are irrelevant to the current gesture. */
export const SHAKE_WINDOW_MS = 600;
/**
 * How far one direction-run must travel to count as a reversal, in px.
 *
 * This is what separates shaking from a wobbly drag. Hand jitter and the small
 * corrections in ordinary dragging produce runs well under this.
 */
export const SHAKE_LEG_MIN_PX = 12;
/** Direction changes between qualifying runs that constitute a shake. */
export const SHAKE_REVERSALS = 3;

// ── Reaction hold times ──────────────────────────────────────────────────────

export const PAT_MS = 1200;
export const PAT_ESCALATED_MS = 2400;
/** Sustained petting stops being "pleased" and becomes something warmer. */
export const LOVE_MS = 2800;
export const MAD_MS = 2000;
export const MAD_ESCALATED_MS = 3200;
export const IRRITATED_MS = 1600;
/** How long a held gaze takes to make the buddy bashful, and how long it holds. */
export const SHY_HOVER_MS = 3000;

// ── Escalation windows ───────────────────────────────────────────────────────

/** Pats closer together than this build a streak. */
export const PAT_STREAK_MS = 4000;
/** Pats in a streak before the buddy reacts more strongly. */
export const PAT_STREAK_COUNT = 3;
/** Pats in a streak before `happy` tips into `love`. */
export const PAT_LOVE_COUNT = 5;
/** Repositions are remembered for this long. */
export const MOVE_WINDOW_MS = 20000;
/** Repositions inside the window before the buddy gets tired of it. */
export const MOVE_COUNT = 3;

export interface ShakeSample {
  x: number;
  y: number;
  t: number;
}

/**
 * True when the recent samples describe a shake rather than a drag.
 *
 * Collapses each axis into signed direction-runs, throws away the runs too
 * short to be deliberate, and then counts how many times the *remaining* runs
 * change direction. Three alternations on either axis is a shake — per-axis
 * rather than horizontal-only, so shaking the buddy up and down works as well
 * as side to side.
 *
 * Discarding short runs before looking for alternation is the part that
 * matters. A straight drag is one run and trivially never alternates, but a
 * *jittery* drag is a long run, a 3px twitch, another long run — and counting
 * each long run as a reversal makes ordinary dragging read as shaking. Only
 * runs that actually travelled get a vote.
 */
export function detectShake(samples: ShakeSample[], now: number): boolean {
  const window = samples.filter((s) => now - s.t <= SHAKE_WINDOW_MS);
  if (window.length < 4) return false;

  for (const axis of ["x", "y"] as const) {
    // Collapse the samples into signed direction-runs: consecutive movement
    // the same way is one run, however many samples it took.
    const runs: number[] = [];
    let dir = 0;
    let len = 0;

    for (let i = 1; i < window.length; i++) {
      const delta = window[i]![axis] - window[i - 1]![axis];
      if (delta === 0) continue;
      const d = delta > 0 ? 1 : -1;
      if (d === dir) {
        len += Math.abs(delta);
      } else {
        if (dir !== 0) runs.push(dir * len);
        dir = d;
        len = Math.abs(delta);
      }
    }
    if (dir !== 0) runs.push(dir * len);

    // Only runs that actually travelled count. Discarding the short ones
    // *before* looking for alternation is the whole trick: a dragged pointer
    // wobbles, and those wobbles are runs too. Counting a long run as a
    // reversal just because a 3px twitch preceded it turns any jittery drag
    // into a shake — which is exactly what the naive version did.
    const legs = runs.filter((r) => Math.abs(r) >= SHAKE_LEG_MIN_PX);

    let alternations = 0;
    for (let i = 1; i < legs.length; i++) {
      if (Math.sign(legs[i]!) !== Math.sign(legs[i - 1]!)) {
        alternations++;
        if (alternations >= SHAKE_REVERSALS) return true;
      }
    }
  }

  return false;
}

// ── Mood ─────────────────────────────────────────────────────────────────────

export interface PetMood {
  /** Consecutive pats inside the streak window. */
  patStreak: number;
  lastPatAt: number;
  /** While this is in the future, the buddy is still cross. */
  crossUntil: number;
  /** Reposition timestamps, pruned to `MOVE_WINDOW_MS`. */
  recentMoves: number[];
}

export function createMood(): PetMood {
  return { patStreak: 0, lastPatAt: 0, crossUntil: 0, recentMoves: [] };
}

/** Which reaction a pat earned. Named rather than an imported pose value, so
 *  this module stays free of blobatar and the tests read plainly. */
export type PatReaction = "happy" | "love";

/**
 * A pat. Repeated pats in quick succession hold the reaction longer and
 * eventually change it, so the tenth one does not feel identical to the first.
 */
export function onPat(
  mood: PetMood,
  now: number,
): { mood: PetMood; reaction: PatReaction; holdMs: number } {
  const continuing = now - mood.lastPatAt <= PAT_STREAK_MS;
  const patStreak = continuing ? mood.patStreak + 1 : 1;

  const reaction: PatReaction = patStreak >= PAT_LOVE_COUNT ? "love" : "happy";
  const holdMs =
    reaction === "love"
      ? LOVE_MS
      : patStreak >= PAT_STREAK_COUNT
        ? PAT_ESCALATED_MS
        : PAT_MS;

  return { mood: { ...mood, patStreak, lastPatAt: now }, reaction, holdMs };
}

/**
 * A shake. Shaking a buddy that is still cross from the last one holds the
 * reaction longer.
 */
export function onShake(mood: PetMood, now: number): { mood: PetMood; holdMs: number } {
  const stillCross = now < mood.crossUntil;
  const holdMs = stillCross ? MAD_ESCALATED_MS : MAD_MS;
  return {
    // A shake resets any pat streak: the buddy is not being petted any more.
    mood: { ...mood, patStreak: 0, crossUntil: now + holdMs },
    holdMs,
  };
}

/**
 * A reposition.
 *
 * The first move is free and so is the second — dragging is the buddy's
 * primary interaction, and a creature that sulks every time you tidy your
 * screen punishes normal use and stops carrying information. Only shuffling it
 * around repeatedly reads as "stop moving me".
 */
export function onMove(mood: PetMood, now: number): { mood: PetMood; irritated: boolean } {
  const recentMoves = [...mood.recentMoves, now].filter((t) => now - t <= MOVE_WINDOW_MS);
  const irritated = recentMoves.length >= MOVE_COUNT;
  return {
    // Reacting clears the history, so it takes another full run of moves to
    // fire again rather than firing on every move from here on.
    mood: { ...mood, recentMoves: irritated ? [] : recentMoves },
    irritated,
  };
}
