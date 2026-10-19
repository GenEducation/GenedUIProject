"use client";

import { Rocket } from "lucide-react";

import { formatPct, latestRow, rowsForMetric } from "@/features/admin/analytics/aggregate";
import { LS_COLORS } from "@/features/admin/analytics/colors";
import type { MetricMeta, MetricRow } from "@/features/admin/analytics/types";
import { hasValue, resolveValueState } from "@/features/admin/analytics/valueState";

import { ActivationTrend, Gauge, type SeriesPoint } from "./charts";
import { MetricValue } from "./MetricValue";
import { Panel, PanelEmpty, PanelIcon } from "./Panel";

/**
 * ACT-01 / ACT-02 as two rings plus one shared trend line.
 *
 * Deliberately one card row + one chart: showing "first session" and
 * "activation" as cards AND as a separate duplicated line chart would be three
 * presentations of the same information.
 */
export function ActivationPanel({
  rows,
  meta,
  series,
}: {
  rows: MetricRow[];
  meta: MetricMeta[];
  series: SeriesPoint[];
}) {
  const firstMeta = meta.find((m) => m.metric_id === "ACT-01") ?? null;
  const secondMeta = meta.find((m) => m.metric_id === "ACT-02") ?? null;

  const firstState = resolveValueState(latestRow(rowsForMetric(rows, "ACT-01")), firstMeta);
  const secondState = resolveValueState(latestRow(rowsForMetric(rows, "ACT-02")), secondMeta);

  return (
    <Panel
      title="Learning Activation"
      subtitle="Are students starting and continuing to learn?"
      icon={
        <PanelIcon tone="emerald">
          <Rocket size={15} aria-hidden />
        </PanelIcon>
      }
    >
      {rows.length === 0 && series.length === 0 ? (
        <PanelEmpty>No activation rollups for this range yet.</PanelEmpty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <RingCard
              title="First Session"
              caption="of placed students"
              state={firstState}
              color={LS_COLORS.emerald}
              tone="emerald"
            />
            <RingCard
              title="Second Session"
              caption="of first session students"
              state={secondState}
              color={LS_COLORS.blue}
              tone="blue"
            />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-[12px] font-semibold" style={{ color: "var(--ls-ink)" }}>
                Activation trend
              </h3>
              <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--ls-muted)" }}>
                <LegendDot color={LS_COLORS.emerald} label="First session" />
                <LegendDot color={LS_COLORS.blue} label="Second session" />
              </div>
            </div>
            {series.length === 0 ? (
              <PanelEmpty>No trend yet — the series needs at least one rollup.</PanelEmpty>
            ) : (
              <div className="h-[130px] w-full">
                <ActivationTrend data={series} />
              </div>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

function RingCard({
  title,
  caption,
  state,
  color,
  tone,
}: {
  title: string;
  caption: string;
  state: ReturnType<typeof resolveValueState>;
  color: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl p-3" style={{ background: `var(--ls-${tone}-soft)` }}>
      <div className="mb-2 text-[12px] font-semibold" style={{ color: "var(--ls-ink)" }}>
        {title}
      </div>
      {hasValue(state) ? (
        <div className="flex items-center gap-2.5">
          <Gauge fraction={state.value} color={color} label={formatPct(state.value, 0)} size={74} />
          <span className="text-[11px] leading-tight" style={{ color: "var(--ls-muted)" }}>
            {caption}
          </span>
        </div>
      ) : (
        <MetricValue state={state} format={(v) => formatPct(v, 0)} />
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
