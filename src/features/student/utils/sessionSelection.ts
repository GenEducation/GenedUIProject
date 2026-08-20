import { scheduledSessionStartMs } from "@/utils/datetime";

export function selectContinueSession<T extends { is_complete?: boolean }>(
  sessions: readonly T[],
): T | null {
  return sessions.find(session => !session.is_complete) ?? null;
}

/**
 * How far ahead a booked session may be before the dashboard bothers showing a
 * countdown. Beyond this the hero slot stays on Continue Learning — a clock
 * ticking down six days is noise, not motivation.
 */
export const IMMINENT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * How long the panel lingers after the scheduled start, so a student who
 * arrives a little late still lands on their session rather than on a card
 * that has already reverted.
 */
export const START_GRACE_MS = 60 * 60 * 1000;

/**
 * The scheduled session the dashboard should surface right now, or `null` when
 * the hero slot should fall back to Continue Learning.
 *
 * Kept free of React so the windowing rules are testable directly.
 */
export function selectImminentSession<
  T extends {
    scheduled_date: string;
    scheduled_time: string | null;
    preparation_status: string;
    status: string;
  },
>(sessions: readonly T[], now: number): T | null {
  let best: T | null = null;
  let bestStart = Infinity;

  for (const session of sessions) {
    // A failed prep has no content to open, and a completed one is done with.
    if (session.preparation_status === "FAILED") continue;
    if (session.status === "COMPLETED") continue;

    const startMs = scheduledSessionStartMs(session.scheduled_date, session.scheduled_time);
    if (isNaN(startMs)) continue;

    const untilStart = startMs - now;
    if (untilStart > IMMINENT_WINDOW_MS) continue;   // too far out
    if (-untilStart > START_GRACE_MS) continue;      // grace window has passed

    if (startMs < bestStart) {
      best = session;
      bestStart = startMs;
    }
  }

  return best;
}
