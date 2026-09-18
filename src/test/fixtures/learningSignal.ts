import type {
  DiagnosticRow,
  DimsValues,
  FunnelRow,
  JourneySummary,
  MetricMeta,
  MetricRow,
} from "@/features/admin/analytics/types";

/**
 * Fixtures for the Learning Signal dashboard.
 *
 * Deliberately not a happy path. The backend's rollups have never run against
 * real data, and even once they do, suppressed/parked/stale/immature is the
 * *normal* condition for a lot of these metrics — so the fixture set includes
 * at least one row in each abnormal state. If the dashboard only looks right
 * against clean numbers, it isn't right.
 */

const AS_OF = "2026-09-17T02:15:00+05:30";
const OLD_AS_OF = "2026-09-11T02:15:00+05:30";
const TODAY = "2026-09-16";

function meta(partial: Partial<MetricMeta> & Pick<MetricMeta, "metric_id" | "name">): MetricMeta {
  return {
    definition_version: 1,
    journey_stage: "B. General Onboarding (Student DNA)",
    question: "",
    grain: "user",
    unit: "%",
    direction: "higher_better",
    target: null,
    risk_threshold: null,
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

export const metaFixture: MetricMeta[] = [
  // Parked — must render as "Not instrumented", never as 0%.
  meta({
    metric_id: "ACQ-02",
    name: "Signup to First Sign-in",
    journey_stage: "A. Acquisition",
    status: "NOT_INSTRUMENTED",
    dims: [],
    blocked_by: "No sign-in event is emitted by the auth service yet.",
  }),
  meta({
    metric_id: "ONB-01",
    name: "General Onboarding Completion Rate",
    question: "Do students finish the DNA interview?",
    target: 0.85,
    risk_threshold: 0.6,
  }),
  meta({ metric_id: "ONB-04", name: "Onboarding Abandonment Rate", direction: "lower_better" }),
  meta({
    metric_id: "ONB-05",
    name: "Onboarding Step Drop-off",
    status: "NOT_INSTRUMENTED",
    blocked_by: "Per-step events aren't written by the merged onboarding form.",
  }),
  meta({ metric_id: "ONB-06", name: "Student DNA Profile Density", unit: "score" }),
  meta({
    metric_id: "PLC-01",
    name: "Placement Start→Complete Conversion",
    journey_stage: "C. Placement",
    target: 0.9,
  }),
  meta({
    metric_id: "PLC-04",
    name: "Placement Time to Complete",
    journey_stage: "C. Placement",
    unit: "sec",
    direction: "lower_better",
    dims: ["board", "grade", "bank_version"],
    review_rules: { null_elapsed_share_max: 0.05 },
  }),
  meta({
    metric_id: "PLC-05",
    name: "Placement Accuracy by Subject/Strand",
    journey_stage: "C. Placement",
    panel: "Learning Quality",
    dims: ["board", "grade", "bank_version", "subject", "strand"],
  }),
  meta({
    metric_id: "ACT-01",
    name: "First Qualifying Session (7d)",
    journey_stage: "D. Activation",
    panel: "North Star",
    target: 0.8,
  }),
  meta({
    metric_id: "ACT-02",
    name: "Second Qualifying Session (7d)",
    journey_stage: "D. Activation",
    panel: "North Star",
  }),
  // Retired — must produce no panel at all, and must not count as unhealthy.
  meta({ metric_id: "ONB-02", name: "Superseded gate metric", status: "RETIRED" }),
  // Diagnostics share the catalogue but aren't scalars.
  meta({
    metric_id: "PLC-06",
    name: "Placement Item Misfit / Bank Quality",
    grain: "diagnostic",
    unit: null,
    direction: null,
    panel: "Item Bank Quality",
    dims: ["board", "grade", "bank_version", "subject"],
    review_rules: { p_floor: 0.15, p_ceiling: 0.95, time_multiple: 2 },
  }),
];

function row(partial: Partial<MetricRow> & Pick<MetricRow, "metric_id">): MetricRow {
  return {
    definition_version: 1,
    bucket_date: TODAY,
    dims: null,
    value: null,
    numerator: null,
    denominator: null,
    sample_size: null,
    suppressed: false,
    low_confidence: false,
    extra: null,
    status: "ACTIVE",
    target: null,
    direction: "higher_better",
    as_of: AS_OF,
    stale: false,
    ...partial,
  };
}

export const onboardingPanelFixture: MetricRow[] = [
  row({
    metric_id: "ONB-01",
    value: 0.934,
    numerator: 10482,
    denominator: 11230,
    sample_size: 11230,
    target: 0.85,
  }),
  row({ metric_id: "ONB-04", value: 0.043, numerator: 483, denominator: 11230, sample_size: 11230 }),
  // Stale: real but from a rollup that hasn't refreshed.
  row({
    metric_id: "ONB-06",
    value: 0.71,
    numerator: 7975,
    denominator: 11230,
    sample_size: 11230,
    stale: true,
    as_of: OLD_AS_OF,
  }),
];

export const placementPanelFixture: MetricRow[] = [
  row({ metric_id: "PLC-01", value: 0.92, numerator: 10482, denominator: 11393, sample_size: 11393 }),
  // PLC-04's value is null BY DESIGN — there is no single honest scalar.
  row({
    metric_id: "PLC-04",
    value: null,
    sample_size: 10482,
    extra: {
      wall_p50_sec: 2280,
      wall_p90_sec: 3660,
      active_p50_ms: 1_850_000,
      active_p90_ms: 3_100_000,
      null_elapsed_share: 0.02,
    },
  }),
  row({
    metric_id: "PLC-05",
    dims: { subject: "Mathematics" },
    value: 0.76,
    sample_size: 8_431,
  }),
  row({ metric_id: "PLC-05", dims: { subject: "Science" }, value: 0.68, sample_size: 8_120 }),
  // Low confidence: shown, but flagged.
  row({
    metric_id: "PLC-05",
    dims: { subject: "English" },
    value: 0.81,
    sample_size: 12,
    low_confidence: true,
  }),
  // Suppressed: must never render as 0%.
  row({ metric_id: "PLC-05", dims: { subject: "Hindi" }, value: null, sample_size: 3, suppressed: true }),
];

export const activationPanelFixture: MetricRow[] = [
  row({ metric_id: "ACT-01", value: 0.78, numerator: 8762, denominator: 11233, sample_size: 11233 }),
  row({ metric_id: "ACT-02", value: 0.64, numerator: 6821, denominator: 10658, sample_size: 10658 }),
];

export function activationSeriesFixture(metricId: "ACT-01" | "ACT-02"): MetricRow[] {
  const base = metricId === "ACT-01" ? 0.7 : 0.55;
  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date("2026-09-03T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + i);
    return row({
      metric_id: metricId,
      bucket_date: date.toISOString().slice(0, 10),
      value: Number((base + i * 0.006).toFixed(4)),
      sample_size: 700 + i * 12,
    });
  });
}

export const journeySummaryFixture: JourneySummary = {
  range: "28d",
  as_of: AS_OF,
  steps: [
    { step_key: "A1_SIGNED_UP", label: "Acquisition", count: 12482, conversion: 1, previous_count: 11557, change_pct: 0.08 },
    { step_key: "B1_GENERAL_ONBOARDING_COMPLETED", label: "Onboarding", count: 10934, conversion: 0.876, previous_count: 10190, change_pct: 0.073 },
    { step_key: "D1_FIRST_QUALIFYING_SESSION", label: "First Session", count: 8762, conversion: 0.702, previous_count: 8401, change_pct: 0.043 },
    { step_key: "D2_SECOND_QUALIFYING_SESSION", label: "Activation", count: 6821, conversion: 0.5466, previous_count: 6390, change_pct: 0.0674 },
  ],
  partial_cohorts: 3,
  previous_partial_cohorts: 2,
};

/** Two mature cohorts plus one immature one that must be excluded from totals. */
export const funnelFixture: FunnelRow[] = (() => {
  // Labels are the funnel's own technical step names — deliberately different
  // words from journey-summary's headline labels for the same four steps.
  const shape: Array<[FunnelRow["step_key"], string, number, number]> = [
    ["A1_SIGNED_UP", "Signed Up", 0, 6241],
    ["B1_GENERAL_ONBOARDING_COMPLETED", "General Onboarding Completed", 1, 5467],
    ["C1_PLACEMENT_STARTED", "Placement Started", 2, 5121],
    ["C2_PLACEMENT_COMPLETED", "Placement Completed", 3, 4712],
    ["D1_FIRST_QUALIFYING_SESSION", "First Qualifying Session", 4, 4381],
    ["D2_SECOND_QUALIFYING_SESSION", "Second Qualifying Session", 5, 3410],
  ];
  const rows: FunnelRow[] = [];
  for (const cohort of ["2026-09-01", "2026-09-02"]) {
    for (const [step_key, label, step_order, reached] of shape) {
      rows.push({
        cohort_date: cohort,
        step_key,
        label,
        step_order,
        dims: { board: "CBSE", grade: 6 },
        reached,
        cohort_size: 6241,
        conversion: reached / 6241,
        mature: true,
        maturity_days: 16,
        as_of: AS_OF,
      });
    }
  }
  // Immature — excluded, and disclosed as "still catching up".
  for (const [step_key, label, step_order, reached] of shape) {
    rows.push({
      cohort_date: "2026-09-15",
      step_key,
      label,
      step_order,
      dims: { board: "CBSE", grade: 6 },
      reached: Math.round(reached * 0.3),
      cohort_size: 1900,
      conversion: 0.3,
      mature: false,
      maturity_days: 2,
      as_of: AS_OF,
    });
  }
  return rows;
})();

export const diagnosticsFixture: DiagnosticRow[] = [
  {
    diagnostic_id: "PLC-06",
    definition_version: 1,
    bucket_date: TODAY,
    entity_key: "CBSE.G6.MATH.ALG.LINEAR.Q-104",
    dims: { board: "CBSE", grade: 6, bank_version: "v3", subject: "Math" },
    rank: 1,
    value: 0.97,
    secondary_value: 168_000,
    sample_size: 84,
    payload: { strand: "Algebra", difficulty: 3, expected_time_sec: 45, item_code: "Q-104" },
    status: "ACTIVE",
    as_of: AS_OF,
    stale: false,
  },
  {
    diagnostic_id: "PLC-06",
    definition_version: 1,
    bucket_date: TODAY,
    entity_key: "CBSE.G6.SCI.BIO.CELLS.Q-217",
    dims: { board: "CBSE", grade: 6, bank_version: "v3", subject: "Science" },
    rank: 2,
    value: 0.09,
    secondary_value: 31_000,
    sample_size: 76,
    payload: { strand: "Biology", difficulty: 4, expected_time_sec: 60, item_code: "Q-217" },
    status: "ACTIVE",
    as_of: AS_OF,
    stale: false,
  },
  {
    diagnostic_id: "PLC-06",
    definition_version: 1,
    bucket_date: TODAY,
    entity_key: "CBSE.G6.MATH.GEO.ANGLES.Q-091",
    dims: { board: "CBSE", grade: 6, bank_version: "v3", subject: "Math" },
    rank: 3,
    value: 0.58,
    secondary_value: 52_000,
    sample_size: 91,
    payload: { strand: "Geometry", difficulty: 3, expected_time_sec: 50, item_code: "Q-091" },
    status: "ACTIVE",
    as_of: AS_OF,
    stale: false,
  },
  {
    diagnostic_id: "PLC-06",
    definition_version: 1,
    bucket_date: TODAY,
    entity_key: "CBSE.G6.ENG.READ.INFER.Q-302",
    dims: { board: "CBSE", grade: 6, bank_version: "v3", subject: "English" },
    rank: 4,
    value: 0.62,
    secondary_value: 102_000,
    sample_size: 68,
    payload: { strand: "Reading", difficulty: 4, expected_time_sec: 40, item_code: "Q-302" },
    status: "ACTIVE",
    as_of: AS_OF,
    stale: false,
  },
];

/** `/dims/values` — static server-side, hence a constant here too. */
export const dimsValuesFixture: DimsValues = {
  board: ["CBSE", "ICSE"],
  grade: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};
