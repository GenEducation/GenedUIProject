import type { SourceProgress, SourceState } from "../types/sources";

/**
 * The whole-run percent to show, as a whole number. While a run is still going it never reads 100 (the backend
 * reports 100 only once the run has finished), and it is null when there's nothing to show yet: queued, or running
 * before the first report.
 */
export function shownPercent(state: SourceState, progress: SourceProgress | null): number | null {
  if (state !== "running" || !progress) return null;
  const p = Number(progress.percent);
  if (!Number.isFinite(p)) return null;
  return Math.max(0, Math.min(99, Math.floor(p)));
}
