import { describe, it, expect } from "vitest";

import { formatDuration, formatPct, latestRow, rowsForMetric } from "../aggregate";
import type { MetricRow } from "../types";

function metricRow(partial: Partial<MetricRow> & Pick<MetricRow, "metric_id">): MetricRow {
  return {
    definition_version: 1,
    bucket_date: "2026-09-16",
    dims: null,
    value: 1,
    numerator: null,
    denominator: null,
    sample_size: null,
    suppressed: false,
    low_confidence: false,
    extra: null,
    status: "ACTIVE",
    target: null,
    direction: "higher_better",
    as_of: "2026-09-17T02:15:00+05:30",
    stale: false,
    ...partial,
  };
}

describe("latestRow / rowsForMetric", () => {
  it("picks the most recent bucket regardless of input order", () => {
    const rows = [
      metricRow({ metric_id: "ONB-01", bucket_date: "2026-09-10", value: 0.1 }),
      metricRow({ metric_id: "ONB-01", bucket_date: "2026-09-16", value: 0.9 }),
      metricRow({ metric_id: "ONB-01", bucket_date: "2026-09-14", value: 0.5 }),
    ];
    expect(latestRow(rows)?.value).toBe(0.9);
    expect(latestRow([])).toBeUndefined();
  });

  it("prefers the unsliced row when one exists", () => {
    const rows = [
      metricRow({ metric_id: "ONB-01", dims: { grade: 6 }, value: 0.5 }),
      metricRow({ metric_id: "ONB-01", dims: null, value: 0.8 }),
    ];
    expect(rowsForMetric(rows, "ONB-01", { unsliced: true })).toHaveLength(1);
    expect(rowsForMetric(rows, "ONB-01", { unsliced: true })[0].value).toBe(0.8);
  });

  it("falls back to sliced rows when the backend emits no unsliced one", () => {
    const rows = [metricRow({ metric_id: "ONB-01", dims: { grade: 6 }, value: 0.5 })];
    expect(rowsForMetric(rows, "ONB-01", { unsliced: true })).toHaveLength(1);
  });
});

describe("formatters", () => {
  it("formats durations at the density the dashboard reads at", () => {
    expect(formatDuration(31)).toBe("31s");
    expect(formatDuration(168)).toBe("2m 48s");
    expect(formatDuration(2040)).toBe("34 min");
    expect(formatDuration(null)).toBe("—");
  });

  it("does not print a null percentage as 0%", () => {
    expect(formatPct(null)).toBe("—");
    expect(formatPct(0.876)).toBe("87.6%");
  });
});
