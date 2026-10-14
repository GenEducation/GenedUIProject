import { describe, it, expect } from "vitest";

import type { MetricMeta, MetricRow } from "../types";
import { explainMissing, hasValue, resolveValueState } from "../valueState";

function row(partial: Partial<MetricRow> = {}): MetricRow {
  return {
    metric_id: "ONB-01",
    definition_version: 1,
    bucket_date: "2026-09-16",
    dims: null,
    value: 0.83,
    numerator: 100,
    denominator: 120,
    sample_size: 120,
    suppressed: false,
    low_confidence: false,
    extra: null,
    status: "ACTIVE",
    target: 0.85,
    direction: "higher_better",
    as_of: "2026-09-17T02:15:00+05:30",
    stale: false,
    ...partial,
  };
}

function meta(partial: Partial<MetricMeta> = {}): MetricMeta {
  return {
    metric_id: "ONB-01",
    definition_version: 1,
    name: "General Onboarding Completion Rate",
    journey_stage: "B",
    question: "",
    grain: "user",
    unit: "%",
    direction: "higher_better",
    target: 0.85,
    risk_threshold: 0.6,
    tier: "P0",
    panel: "Journey Funnel",
    owner: "Product",
    status: "ACTIVE",
    blocked_by: null,
    attribution_window_days: null,
    min_reporting_n: 5,
    confidence_n: 20,
    expected_refresh_minutes: 60,
    notes: null,
    dims: ["grade", "board"],
    review_rules: null,
    ...partial,
  };
}

describe("resolveValueState", () => {
  it("distinguishes 'no row' from 'suppressed'", () => {
    expect(resolveValueState(undefined, meta()).kind).toBe("empty");
    expect(resolveValueState(row({ suppressed: true, value: null }), meta()).kind).toBe(
      "suppressed",
    );
  });

  it("never yields a numeric zero for suppressed or parked metrics", () => {
    for (const state of [
      resolveValueState(row({ suppressed: true, value: null }), meta()),
      resolveValueState(row({ status: "NOT_INSTRUMENTED" }), meta({ status: "NOT_INSTRUMENTED" })),
      resolveValueState(undefined, meta()),
    ]) {
      expect(hasValue(state)).toBe(false);
      expect(explainMissing(state)).toBeTruthy();
    }
  });

  it("treats a parked status as parked even when a row exists with a value", () => {
    // A rollup that emits a row for a parked metric must not make it look live.
    const state = resolveValueState(row({ status: "NOT_INSTRUMENTED", value: 0 }), meta());
    expect(state.kind).toBe("not_instrumented");
  });

  it("ranks stale above low confidence", () => {
    const state = resolveValueState(row({ stale: true, low_confidence: true }), meta());
    expect(state.kind).toBe("stale");
  });

  it("treats a null value (PLC-04) as empty, not as zero", () => {
    const state = resolveValueState(row({ metric_id: "PLC-04", value: null }), meta());
    expect(state.kind).toBe("empty");
    expect(hasValue(state)).toBe(false);
  });
});
