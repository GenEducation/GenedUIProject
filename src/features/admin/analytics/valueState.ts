import type { MetricMeta, MetricRow } from "./types";

/**
 * The six distinct "what am I looking at" states a metric can be in.
 *
 * These exist because the analytics API's default condition is *no number*, and
 * the states mean materially different things. Rendering any of them as `0` (or
 * as an undifferentiated `—`) reads as an outage and trains admins to stop
 * trusting the dashboard — the one failure the backend handoff is most
 * insistent about. Every value on this page goes through here.
 */
export type ValueState =
  /** A real, trustworthy number. */
  | { kind: "ok"; value: number }
  /** Real, but below the metric's confidence-n. Show it, flagged. */
  | { kind: "low_confidence"; value: number; sampleSize: number | null }
  /** Real, but from a rollup that hasn't refreshed. Show it, muted, with an as-of. */
  | { kind: "stale"; value: number; asOf: string }
  /** Too few students to report safely. Never a zero. */
  | { kind: "suppressed"; minReportingN: number | null }
  /** We know what we'd measure; we can't yet. Never a zero. */
  | { kind: "not_instrumented"; blockedBy: string | null }
  /** No row at all — the rollup has never produced one. Distinct from suppressed. */
  | { kind: "empty" };

/**
 * Precedence matters and is deliberate:
 *   not-instrumented > no row > suppressed > null value > stale > low confidence
 *
 * `stale` outranks `low_confidence` because "this number is old" changes whether
 * you should act on it at all, whereas "this number is noisy" only changes how
 * hard you should lean on it.
 */
export function resolveValueState(
  row: MetricRow | undefined | null,
  meta?: MetricMeta | null,
): ValueState {
  // Status from /meta wins even with no row: a parked metric is parked whether
  // or not the rollup happened to emit something for it.
  const status = row?.status ?? meta?.status;
  if (status && status !== "ACTIVE") {
    return { kind: "not_instrumented", blockedBy: meta?.blocked_by ?? null };
  }

  if (!row) return { kind: "empty" };

  if (row.suppressed) {
    return { kind: "suppressed", minReportingN: meta?.min_reporting_n ?? null };
  }

  // A null value with no suppression flag is a metric that has no single
  // correct scalar (PLC-04) or a rollup that produced a row but no figure.
  // Either way there is nothing honest to print.
  if (row.value === null || row.value === undefined || Number.isNaN(row.value)) {
    return { kind: "empty" };
  }

  if (row.stale) return { kind: "stale", value: row.value, asOf: row.as_of };
  if (row.low_confidence) {
    return { kind: "low_confidence", value: row.value, sampleSize: row.sample_size };
  }
  return { kind: "ok", value: row.value };
}

/** True when the state carries a printable number. */
export function hasValue(
  state: ValueState,
): state is Extract<ValueState, { value: number }> {
  return state.kind === "ok" || state.kind === "low_confidence" || state.kind === "stale";
}

/** Short label for the states that replace the number entirely. */
export function explainMissing(state: ValueState): string | null {
  switch (state.kind) {
    case "suppressed":
      return "Suppressed";
    case "not_instrumented":
      return "Not instrumented";
    case "empty":
      return "No data yet";
    default:
      return null;
  }
}

export function missingDetail(state: ValueState): string | null {
  switch (state.kind) {
    case "suppressed":
      return state.minReportingN
        ? `Sample too small — fewer than ${state.minReportingN} students`
        : "Sample too small to report safely";
    case "not_instrumented":
      return state.blockedBy ?? "This metric is defined but not yet collected";
    case "empty":
      return "No rollup has produced a value for this period";
    default:
      return null;
  }
}
