import { INGESTION_STAGES, type SourceProgress, type SourceState } from "../types/sources";

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

/** "Reading pages · 12 of 36 pages", or just the stage name for a stage without countable units. */
export function stageLine(progress: SourceProgress): string {
  const stage = INGESTION_STAGES[progress.stage];
  const label = stage?.label ?? "Working";
  if (!(progress.total > 0)) return label;
  const done = Math.min(progress.done, progress.total);
  return `${label} · ${done} of ${progress.total}${stage?.unit ? ` ${stage.unit}` : ""}`;
}

/** "Step 2 of 9". */
export function stepLine(progress: SourceProgress): string {
  return `Step ${progress.step} of ${progress.steps}`;
}

/** What a queued or running row says under its title. Null for any other state. */
export function activeStatus(state: SourceState, progress: SourceProgress | null): { line: string; step: string | null } | null {
  if (state === "queued") return { line: "Waiting in line to start", step: null };
  if (state !== "running") return null;
  if (!progress) return { line: "Starting up", step: null };
  return { line: stageLine(progress), step: stepLine(progress) };
}
