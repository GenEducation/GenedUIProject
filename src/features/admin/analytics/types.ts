/**
 * Wire types for `/admin/analytics/*`.
 *
 * Transcribed from the backend handoff. The important structural fact: almost
 * every response can legitimately carry no number, and the five "no number"
 * states mean different things — see `valueState.ts`, which is the only place
 * that should be interpreting these flags.
 */

export type MetricStatus = "ACTIVE" | "NOT_INSTRUMENTED" | "RETIRED";

export type MetricDirection = "higher_better" | "lower_better";

/**
 * Thresholds that used to live as prose in the handoff and as constants in the
 * UI. `null` for most entries; the two populated shapes are disjoint:
 *  - PLC-06: `p_floor` / `p_ceiling` / `time_multiple`
 *  - PLC-04: `null_elapsed_share_max`
 *
 * Every field is optional so a registry that grows a new rule doesn't break the
 * type — read defensively and skip the check when the rule is absent.
 */
export interface ReviewRules {
  p_floor?: number;
  p_ceiling?: number;
  time_multiple?: number;
  null_elapsed_share_max?: number;
}

export interface MetricMeta {
  metric_id: string;
  definition_version: number;
  name: string;
  journey_stage: string;
  question: string;
  /** "diagnostic" marks a ranked table rather than a scalar metric. */
  grain: string;
  unit: string | null;
  direction: MetricDirection | null;
  target: number | null;
  risk_threshold: number | null;
  tier: string;
  panel: string;
  owner: string;
  status: MetricStatus;
  blocked_by: string | null;
  attribution_window_days: number | null;
  min_reporting_n: number;
  confidence_n: number;
  expected_refresh_minutes: number;
  notes: string | null;
  /**
   * This metric's own dimension allowlist. The server enforces the same list
   * independently, so this is a way to avoid a round-trip `400`, not a licence
   * to skip error handling.
   */
  dims: string[];
  review_rules: ReviewRules | null;
}

export type Dims = Record<string, string | number>;

/**
 * The shared envelope returned by every scalar-metric endpoint
 * (`/panels/*` and `/metrics/{id}/series`).
 */
export interface MetricRow {
  metric_id: string;
  definition_version: number;
  bucket_date: string;
  dims: Dims | null;
  /** Null for metrics that have no single correct scalar — e.g. PLC-04. */
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  sample_size: number | null;
  suppressed: boolean;
  low_confidence: boolean;
  extra: Record<string, number> | null;
  status: MetricStatus;
  target: number | null;
  direction: MetricDirection | null;
  as_of: string;
  stale: boolean;
}

/**
 * PLC-04's `extra`. Its `value` is null by design: neither figure is a mean,
 * so there is no single scalar that honestly represents the metric. Label
 * these "median" and "p90" — never "average".
 */
export interface PlacementTimeExtra {
  wall_p50_sec: number;
  wall_p90_sec: number;
  active_p50_ms: number;
  active_p90_ms: number;
  /** Fraction of responses missing a client timer. Climbing = client regression. */
  null_elapsed_share: number;
}

export const FUNNEL_STEPS = [
  "A1_SIGNED_UP",
  "B1_GENERAL_ONBOARDING_COMPLETED",
  "C1_PLACEMENT_STARTED",
  "C2_PLACEMENT_COMPLETED",
  "D1_FIRST_QUALIFYING_SESSION",
  "D2_SECOND_QUALIFYING_SESSION",
] as const;

export type FunnelStepKey = (typeof FUNNEL_STEPS)[number];

export interface FunnelRow {
  cohort_date: string;
  step_key: FunnelStepKey;
  /**
   * The step's own name ("Signed Up", "Second Qualifying Session").
   * Deliberately different words from `/panels/journey-summary`'s headline
   * labels for the same four steps — never share a lookup between the two.
   */
  label: string;
  step_order: number;
  dims: Dims | null;
  reached: number;
  cohort_size: number;
  conversion: number;
  /** False = this cohort hasn't had time to finish the funnel. Not a final number. */
  mature: boolean;
  maturity_days: number;
  as_of: string;
}

export interface JourneySummaryStep {
  step_key: FunnelStepKey;
  label: string;
  count: number;
  conversion: number;
  previous_count?: number | null;
  /** Null when the previous period was zero (avoids Infinity%). */
  change_pct?: number | null;
}

export interface JourneySummary {
  range: string;
  as_of: string;
  steps: JourneySummaryStep[];
  /** Days in the window still immature, EXCLUDED from `count`. Disclose it. */
  partial_cohorts: number;
  previous_partial_cohorts: number;
}

export interface DiagnosticRow {
  diagnostic_id: string;
  definition_version: number;
  bucket_date: string;
  entity_key: string;
  dims: Dims | null;
  rank: number | null;
  value: number | null;
  secondary_value: number | null;
  sample_size: number | null;
  payload: Record<string, unknown> | null;
  status: MetricStatus;
  as_of: string;
  stale: boolean;
}

export type PanelName = "onboarding" | "placement" | "activation";

/** `/dims/values` — static filter options, not derived from served data. */
export interface DimsValues {
  board: string[];
  grade: number[];
}
