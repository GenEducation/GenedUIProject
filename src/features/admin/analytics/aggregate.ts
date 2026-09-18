import type { MetricRow } from "./types";

export function groupByMetric(rows: MetricRow[]): Map<string, MetricRow[]> {
  const out = new Map<string, MetricRow[]>();
  for (const row of rows) {
    const list = out.get(row.metric_id);
    if (list) list.push(row);
    else out.set(row.metric_id, [row]);
  }
  for (const list of out.values()) {
    list.sort((a, b) => a.bucket_date.localeCompare(b.bucket_date));
  }
  return out;
}

/** Most recent bucket for a metric. Rows need not arrive sorted. */
export function latestRow(rows: MetricRow[] | undefined): MetricRow | undefined {
  if (!rows?.length) return undefined;
  return rows.reduce((best, row) =>
    row.bucket_date.localeCompare(best.bucket_date) > 0 ? row : best,
  );
}

/**
 * Pick the rows for one metric out of a panel payload, optionally restricted to
 * a dims slice. Panel endpoints return every dims combination flattened
 * together, so summing blindly across them double-counts students.
 */
export function rowsForMetric(
  rows: MetricRow[],
  metricId: string,
  opts: { unsliced?: boolean } = {},
): MetricRow[] {
  const mine = rows.filter((r) => r.metric_id === metricId);
  if (!opts.unsliced) return mine;
  // The un-split row is the one with no dims; if the backend only emits sliced
  // rows, fall back to everything rather than showing nothing.
  const whole = mine.filter((r) => !r.dims || Object.keys(r.dims).length === 0);
  return whole.length ? whole : mine;
}

// ── Formatting ─────────────────────────────────────────────────

export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}

export function formatPct(fraction: number | null | undefined, digits = 1): string {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return "—";
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Seconds → "34 min" / "2m 48s" / "31s", matching the reference's density. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  }
  // Past ten minutes the seconds are noise.
  if (mins >= 10 || rest === 0) return `${mins} min`;
  return `${mins}m ${rest}s`;
}

export function formatAsOf(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
