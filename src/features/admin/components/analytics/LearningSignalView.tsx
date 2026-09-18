"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

import {
  getAnalyticsMeta,
  getDiagnostic,
  getJourneySummary,
  getMetricSeries,
  getPanel,
} from "@/features/admin/analytics/analyticsService";
import { formatAsOf } from "@/features/admin/analytics/aggregate";
import type {
  DiagnosticRow,
  JourneySummary,
  MetricMeta,
  MetricRow,
  PlacementTimeExtra,
} from "@/features/admin/analytics/types";
import { usePolling } from "@/hooks/usePolling";

import { ActivationPanel } from "./ActivationPanel";
import type { HistogramBucket, SeriesPoint } from "./charts";
import { DiagnosticsTable } from "./DiagnosticsTable";
import { InstrumentationHealth } from "./InstrumentationHealth";
import { JourneyStageCards } from "./JourneyStageCards";
import { LearningQualityPanel } from "./LearningQualityPanel";
import { OnboardingInsightsPanel } from "./OnboardingInsightsPanel";
import { RangePicker, type RangeValue } from "./RangePicker";

interface Payload {
  meta: MetricMeta[];
  summary: JourneySummary | null;
  onboarding: MetricRow[];
  placement: MetricRow[];
  activation: MetricRow[];
  activationSeries: { first: MetricRow[]; second: MetricRow[] };
  diagnostics: DiagnosticRow[];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * The Learning Signal dashboard.
 *
 * A light reading surface inside the dark admin shell — it's dense with charts
 * and small type, and reads better on paper-white than on the console's navy.
 * The breakout margins undo `<main>`'s max-width so the panels get full width
 * without changing the container every other admin view shares.
 */
export function LearningSignalView() {
  const [range, setRange] = useState<RangeValue>("28d");

  const load = useCallback(async (): Promise<Payload> => {
    const days = Number(range.replace("d", "")) || 28;
    const from = daysAgo(days);
    const to = daysAgo(0);

    // Each panel degrades on its own: one failing endpoint should cost its
    // card, not the whole page. /meta is the exception — without it we can't
    // tell a parked metric from a broken one, so it's allowed to reject.
    const meta = await getAnalyticsMeta();

    const [
      summary,
      onboarding,
      placement,
      activation,
      firstSeries,
      secondSeries,
      diagnostics,
    ] = await Promise.all([
      getJourneySummary(range).catch(() => null),
      getPanel("onboarding", range).catch(() => [] as MetricRow[]),
      getPanel("placement", range).catch(() => [] as MetricRow[]),
      getPanel("activation", range).catch(() => [] as MetricRow[]),
      getMetricSeries("ACT-01", { from, to }).catch(() => [] as MetricRow[]),
      getMetricSeries("ACT-02", { from, to }).catch(() => [] as MetricRow[]),
      getDiagnostic("PLC-06", { range: "7d", limit: 25 }).catch(() => [] as DiagnosticRow[]),
    ]);

    return {
      meta,
      summary,
      onboarding,
      placement,
      activation,
      activationSeries: { first: firstSeries, second: secondSeries },
      diagnostics,
    };
  }, [range]);

  const { data, error, isLoading, isRefreshing, lastUpdatedAt, refresh } = usePolling(load);

  const activationSeries = useMemo<SeriesPoint[]>(() => {
    const byDate = new Map<string, SeriesPoint>();
    const put = (rows: MetricRow[], key: "first" | "second") => {
      for (const row of rows) {
        // A suppressed point is not a zero — leave the gap and let the line
        // bridge it rather than drawing a dip that never happened.
        if (row.suppressed || row.value === null) continue;
        const point = byDate.get(row.bucket_date) ?? {
          date: row.bucket_date.slice(5),
          first: null,
          second: null,
        };
        point[key] = row.value;
        byDate.set(row.bucket_date, point);
      }
    };
    put(data?.activationSeries.first ?? [], "first");
    put(data?.activationSeries.second ?? [], "second");
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [data?.activationSeries]);

  const histogram = useMemo<HistogramBucket[]>(() => {
    const row = (data?.placement ?? []).find(
      (r) => r.metric_id === "PLC-04" && r.extra !== null,
    );
    const extra = row?.extra as unknown as
      | (PlacementTimeExtra & Record<string, number>)
      | undefined;
    if (!extra) return [];
    // The backend exposes percentiles, not buckets. Anything more than a
    // p50/p90 readout would be inventing a distribution we weren't given, so
    // only render buckets when the rollup actually ships them.
    const buckets = Object.entries(extra).filter(([k]) => k.startsWith("bucket_"));
    return buckets.map(([k, v]) => ({ label: k.replace("bucket_", "").replace("_", "–"), share: v }));
  }, [data?.placement]);

  const allScalarRows = useMemo(
    () => [...(data?.onboarding ?? []), ...(data?.placement ?? []), ...(data?.activation ?? [])],
    [data],
  );

  return (
    <div className="learning-signal min-h-full w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-[26px] font-bold leading-tight tracking-tight"
            style={{ color: "var(--ls-ink)" }}
          >
            Learning Signal
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--ls-muted)" }}>
            Understand where students progress or drop off in their learning journey.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lastUpdatedAt ? (
            <span className="text-[11px]" style={{ color: "var(--ls-faint)" }}>
              Updated {formatAsOf(lastUpdatedAt.toISOString())}
            </span>
          ) : null}
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh"
            className="rounded-lg border p-2 transition-colors"
            style={{ borderColor: "var(--ls-border-strong)", color: "var(--ls-muted)" }}
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : undefined} />
          </button>
          <RangePicker value={range} onChange={setRange} />
        </div>
      </header>

      {error ? (
        <div
          className="mb-6 flex items-start gap-2.5 rounded-xl border p-4 text-[13px]"
          style={{
            borderColor: "var(--ls-danger)",
            background: "var(--ls-danger-soft)",
            color: "#A33832",
          }}
          role="alert"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <strong>Couldn&apos;t load the metric catalogue.</strong> Without it we can&apos;t tell
            an uninstrumented metric from a broken one, so nothing below is shown. {error}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <LoadingSkeleton />
      ) : data ? (
        <div className="space-y-5">
          <JourneyStageCards summary={data.summary} />

          <div className="grid gap-5 xl:grid-cols-2">
            <OnboardingInsightsPanel
              onboardingRows={data.onboarding}
              placementRows={data.placement}
              meta={data.meta}
            />
            <ActivationPanel rows={data.activation} meta={data.meta} series={activationSeries} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <LearningQualityPanel
              rows={data.placement}
              meta={data.meta}
              histogram={histogram}
            />
            <DiagnosticsTable rows={data.diagnostics} meta={data.meta} />
          </div>

          <InstrumentationHealth
            meta={data.meta}
            rows={allScalarRows}
            lastUpdatedAt={lastUpdatedAt}
          />
        </div>
      ) : null}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="ls-card h-[190px] animate-pulse" />
      <div className="grid gap-5 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="ls-card h-[320px] animate-pulse" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="ls-card h-[260px] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
