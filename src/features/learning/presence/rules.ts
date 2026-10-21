/**
 * When this tab may send a text presence beat (backend `docs/specs/LEARNING_ACTIVITY_v1.md` §4.4). The server decides
 * what is credited; the tab only avoids sending what could not be: a hidden tab, an idle one, a lesson that is not
 * ready, and any tab while a voice session runs (voice presence is measured by the server from audio).
 */

/** Beat period `H`. */
export const BEAT_MS = 30_000;
/** No input and no streamed reply for this long ends text presence. */
export const IDLE_MS = 120_000;
/** The period while the server answers `active: false`: nothing is credited, so the tab asks less often. */
export const BACKOFF_MS = 4 * BEAT_MS;

export interface PresenceState {
  ready: boolean;
  visible: boolean;
  voiceRunning: boolean;
  lastInputAt: number | null;
  lastStreamAt: number | null;
  now: number;
}

/** Input, or a reply streaming to this tab, within the idle window. */
export function recentlyActive({ lastInputAt, lastStreamAt, now }: Pick<PresenceState, "lastInputAt" | "lastStreamAt" | "now">): boolean {
  return [lastInputAt, lastStreamAt].some((at) => at !== null && now - at <= IDLE_MS);
}

export function mayBeat(state: PresenceState): boolean {
  return state.ready && state.visible && !state.voiceRunning && recentlyActive(state);
}
