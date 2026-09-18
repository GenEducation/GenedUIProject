"use client";

import { ArrowUp, ArrowDown } from "lucide-react";

import {
  formatCount,
  formatDuration,
  formatPct,
  latestRow,
  rowsForMetric,
} from "@/features/admin/analytics/aggregate";
import { LS_COLORS } from "@/features/admin/analytics/colors";
import type { MetricMeta, MetricRow, PlacementTimeExtra } from "@/features/admin/analytics/types";
import { hasValue, resolveValueState } from "@/features/admin/analytics/valueState";

import { Gauge } from "./charts";
import { MetricValue } from "./MetricValue";
import { Meter, Panel, PanelEmpty } from "./Panel";

/** Sums numerator/denominator across the dims slices of one metric's latest bucket. */
function latestTotals(rows: MetricRow[], metricId: string) {
  const mine = rowsForMetric(rows, metricId);
  const latest = latestRow(mine);
  if (!latest) return null;
  const sameDay = mine.filter((r) => r.bucket_date === latest.bucket_date && !r.suppressed);
  const numerator = sameDay.reduce((sum, r) => sum + (r.numerator ?? 0), 0);
  const denominator = sameDay.reduce((sum, r) => sum + (r.denominator ?? 0), 0);
  return { latest, numerator, denominator };
}

function metaFor(meta: MetricMeta[], id: string) {
  return meta.find((m) => m.metric_id === id) ?? null;
}

/**
 * Onboarding completion + where students stop, with the placement sub-block.
 *
 * Placement lives here rather than as its own journey stage: per the dashboard
 * IA it's a diagnostic area under onboarding, not a fifth headline number.
 */
export function OnboardingInsightsPanel({
  onboardingRows,
  placementRows,
  meta,
}: {
  onboardingRows: MetricRow[];
  placementRows: MetricRow[];
  meta: MetricMeta[];
}) {
  const completionMeta = metaFor(meta, "ONB-01");
  const completion = latestTotals(onboardingRows, "ONB-01");
  const completionState = resolveValueState(completion?.latest, completionMeta);

  const abandonMeta = metaFor(meta, "ONB-04");
  const abandon = latestTotals(onboardingRows, "ONB-04");
  const abandonState = resolveValueState(abandon?.latest, abandonMeta);

  // ONB-05 (step drop-off) is NOT_INSTRUMENTED — it's what would break the
  // "where students stop" bars down properly. Until it exists we derive the
  // three coarse buckets from the completion/abandonment pair.
  const stepMeta = metaFor(meta, "ONB-05");
  const stepState = resolveValueState(
    latestRow(rowsForMetric(onboardingRows, "ONB-05")),
    stepMeta,
  );

  const placementConvMeta = metaFor(meta, "PLC-01");
  const placementConv = latestTotals(placementRows, "PLC-01");
  const placementConvState = resolveValueState(placementConv?.latest, placementConvMeta);

  const timeMeta = metaFor(meta, "PLC-04");
  const timeRow = latestRow(rowsForMetric(placementRows, "PLC-04"));
  // No published threshold means no basis for calling this a regression, so the
  // warning stays hidden rather than assuming a number.
  const nullTimerMax = timeMeta?.review_rules?.null_elapsed_share_max;
  const timeExtra = (timeRow?.extra ?? null) as PlacementTimeExtra | null;

  const nothing =
    onboardingRows.length === 0 && placementRows.length === 0;

  if (nothing) {
    return (
      <Panel
        title="Onboarding & Placement Insights"
        subtitle="How the merged onboarding + placement flow is performing."
      >
        <PanelEmpty>No onboarding or placement rollups for this range yet.</PanelEmpty>
      </Panel>
    );
  }

  return (
    <Panel
      title="Onboarding & Placement Insights"
      subtitle="How the merged onboarding + placement flow is performing."
    >
      <div className="grid gap-5 2xl:grid-cols-2">
        {/* ── Completion ── */}
        <div>
          <h3 className="mb-3 text-[13px] font-semibold" style={{ color: "var(--ls-ink)" }}>
            Onboarding Completion
          </h3>

          <div className="flex items-center gap-4">
            {hasValue(completionState) ? (
              <Gauge
                fraction={completionState.value}
                color={LS_COLORS.emerald}
                label={formatPct(completionState.value, 0)}
              />
            ) : null}

            <div className="min-w-0 flex-1 space-y-1.5">
              {!hasValue(completionState) ? (
                <MetricValue state={completionState} format={(v) => formatPct(v)} />
              ) : (
                <>
                  <Row label="Started" value={formatCount(completion?.denominator ?? null)} />
                  <Row label="Completed" value={formatCount(completion?.numerator ?? null)} />
                  {completionState.kind !== "ok" ? (
                    <MetricValue
                      state={completionState}
                      format={(v) => formatPct(v)}
                      size="sm"
                      className="pt-1"
                    />
                  ) : null}
                  {completionMeta?.target != null ? (
                    <div
                      className="flex items-center gap-1 pt-1 text-[11px] font-medium"
                      style={{
                        color:
                          completionState.value >= completionMeta.target
                            ? "var(--ls-emerald)"
                            : "var(--ls-danger)",
                      }}
                    >
                      {completionState.value >= completionMeta.target ? (
                        <ArrowUp size={11} />
                      ) : (
                        <ArrowDown size={11} />
                      )}
                      target {formatPct(completionMeta.target, 0)}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* ── Placement sub-block ── */}
          <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--ls-border)" }}>
            <h4 className="mb-2.5 text-[12px] font-semibold" style={{ color: "var(--ls-ink)" }}>
              Placement{" "}
              <span className="font-normal" style={{ color: "var(--ls-muted)" }}>
                (within onboarding)
              </span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-lg p-3"
                style={{ background: "var(--ls-emerald-soft)" }}
              >
                <div className="mb-1 text-[11px]" style={{ color: "var(--ls-muted)" }}>
                  Completion rate
                </div>
                <MetricValue state={placementConvState} format={(v) => formatPct(v, 0)} />
              </div>
              <div className="rounded-lg p-3" style={{ background: "var(--ls-blue-soft)" }}>
                <div className="mb-1 text-[11px]" style={{ color: "var(--ls-muted)" }}>
                  {/* Neither figure is a mean — PLC-04's own `value` is null for
                      exactly this reason. Never label it "average". */}
                  Median time to complete
                </div>
                {timeExtra ? (
                  <>
                    <div
                      className="text-xl font-bold tracking-tight"
                      style={{ color: "var(--ls-ink)" }}
                    >
                      {formatDuration(timeExtra.wall_p50_sec)}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--ls-faint)" }}>
                      p90 {formatDuration(timeExtra.wall_p90_sec)}
                    </div>
                  </>
                ) : (
                  <MetricValue
                    state={resolveValueState(timeRow, timeMeta)}
                    format={(v) => formatDuration(v)}
                  />
                )}
              </div>
            </div>

            {timeExtra &&
            nullTimerMax !== undefined &&
            timeExtra.null_elapsed_share > nullTimerMax ? (
              <p className="mt-2 text-[11px]" style={{ color: "var(--ls-danger)" }}>
                {formatPct(timeExtra.null_elapsed_share, 0)} of responses are missing a client
                timer — likely an instrumentation regression.
              </p>
            ) : null}
          </div>
        </div>

        {/* ── Where students stop ── */}
        <div>
          <h3 className="mb-3 text-[13px] font-semibold" style={{ color: "var(--ls-ink)" }}>
            Where students stop{" "}
            <span className="font-normal" style={{ color: "var(--ls-muted)" }}>
              (in onboarding)
            </span>
          </h3>

          {/* This used to show three bars derived as 1 − completion − abandonment.
              That was arithmetic standing in for a measurement: a student who
              stopped in a way neither rate captured was silently absorbed into
              the first bar. ONB-05 is the real per-step breakdown; until it is
              collected, the honest rendering is the parked state. */}
          <div className="space-y-3">
            <MetricValue state={stepState} format={(v) => formatPct(v)} />
            <div className="space-y-2.5 border-t pt-3" style={{ borderColor: "var(--ls-border)" }}>
              <p className="text-[11px]" style={{ color: "var(--ls-muted)" }}>
                What is measured today, across the whole flow:
              </p>
              <SummaryRow label="Completed onboarding" state={completionState} />
              <SummaryRow label="Abandoned mid-way" state={abandonState} />
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px]" style={{ color: "var(--ls-muted)" }}>
        {label}
      </span>
      <span className="text-[14px] font-semibold" style={{ color: "var(--ls-ink)" }}>
        {value}
      </span>
    </div>
  );
}

function SummaryRow({
  label,
  state,
}: {
  label: string;
  state: ReturnType<typeof resolveValueState>;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px]" style={{ color: "var(--ls-muted)" }}>
        {label}
      </span>
      <MetricValue state={state} format={(v) => formatPct(v)} size="sm" />
    </div>
  );
}
