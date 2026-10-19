"use client";

import { Target, Clock } from "lucide-react";

import { formatDuration, formatPct, latestRow, rowsForMetric } from "@/features/admin/analytics/aggregate";
import { LS_COLORS } from "@/features/admin/analytics/colors";
import type { MetricMeta, MetricRow, PlacementTimeExtra } from "@/features/admin/analytics/types";
import { resolveValueState } from "@/features/admin/analytics/valueState";

import { TimeHistogram, type HistogramBucket } from "./charts";
import { MetricValue } from "./MetricValue";
import { Meter, Panel, PanelEmpty, PanelIcon } from "./Panel";

const SUBJECT_COLOR: Record<string, string> = {
  Mathematics: LS_COLORS.emerald,
  Science: LS_COLORS.blue,
  English: LS_COLORS.amber,
};

/**
 * PLC-05 accuracy by subject + PLC-04's completion-time distribution.
 *
 * PLC-05 is suppressed per *distinct student*, not per response, so a strand
 * with fifty answers can still be suppressed if one student gave them all —
 * that's why each row goes through MetricValue rather than printing a number.
 */
export function LearningQualityPanel({
  rows,
  meta,
  histogram,
}: {
  rows: MetricRow[];
  meta: MetricMeta[];
  histogram: HistogramBucket[];
}) {
  const accuracyMeta = meta.find((m) => m.metric_id === "PLC-05") ?? null;
  const accuracyRows = rowsForMetric(rows, "PLC-05");

  // Roll the strand-level rows up to one row per subject: the panel answers
  // "are students performing as expected", which is a subject-level question.
  const latestDate = latestRow(accuracyRows)?.bucket_date;
  const bySubject = new Map<string, MetricRow>();
  for (const row of accuracyRows) {
    if (row.bucket_date !== latestDate) continue;
    const subject = String(row.dims?.subject ?? "Unknown");
    const existing = bySubject.get(subject);
    // Prefer the un-stranded (subject-level) row when the backend emits one.
    if (!existing || (!row.dims?.strand && existing.dims?.strand)) bySubject.set(subject, row);
  }

  const timeRow = latestRow(rowsForMetric(rows, "PLC-04"));
  const timeExtra = (timeRow?.extra ?? null) as PlacementTimeExtra | null;

  return (
    <Panel
      title="Learning Quality"
      subtitle="Are students performing as expected?"
      icon={
        <PanelIcon tone="teal">
          <Target size={15} aria-hidden />
        </PanelIcon>
      }
      right={
        <span className="text-[11px]" style={{ color: "var(--ls-faint)" }}>
          from placement assessment
        </span>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-[12px] font-semibold" style={{ color: "var(--ls-ink)" }}>
            Accuracy by subject
          </h3>

          {bySubject.size === 0 ? (
            <PanelEmpty>No placement accuracy recorded for this range.</PanelEmpty>
          ) : (
            <div className="space-y-3.5">
              {[...bySubject.entries()].map(([subject, row]) => {
                const state = resolveValueState(row, accuracyMeta);
                const color = SUBJECT_COLOR[subject] ?? LS_COLORS.teal;
                return (
                  <div key={subject} data-subject={subject} data-testid={`subject-${subject}`}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-[12px]" style={{ color: "var(--ls-ink)" }}>
                        {subject}
                      </span>
                      <MetricValue state={state} format={(v) => formatPct(v, 0)} size="sm" />
                    </div>
                    {state.kind === "ok" ||
                    state.kind === "stale" ||
                    state.kind === "low_confidence" ? (
                      <Meter fraction={state.value} color={color} />
                    ) : (
                      // No rail at all rather than an empty one — a 0%-wide bar
                      // is exactly the false zero this dashboard must not draw.
                      <div
                        className="h-2 w-full rounded-full border border-dashed"
                        style={{ borderColor: "var(--ls-border-strong)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3
            className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold"
            style={{ color: "var(--ls-ink)" }}
          >
            <Clock size={13} style={{ color: "var(--ls-muted)" }} aria-hidden />
            Completion time{" "}
            <span className="font-normal" style={{ color: "var(--ls-muted)" }}>
              (wall-clock)
            </span>
          </h3>

          {timeExtra ? (
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px]" style={{ color: "var(--ls-muted)" }}>
                  Median
                </div>
                <div className="text-xl font-bold tracking-tight" style={{ color: "var(--ls-ink)" }}>
                  {formatDuration(timeExtra.wall_p50_sec)}
                </div>
              </div>
              <div>
                <div className="text-[11px]" style={{ color: "var(--ls-muted)" }}>
                  90% complete within
                </div>
                <div className="text-xl font-bold tracking-tight" style={{ color: "var(--ls-ink)" }}>
                  {formatDuration(timeExtra.wall_p90_sec)}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-3">
              <MetricValue
                state={resolveValueState(timeRow, meta.find((m) => m.metric_id === "PLC-04") ?? null)}
                format={(v) => formatDuration(v)}
              />
            </div>
          )}

          {histogram.length === 0 ? (
            timeExtra ? (
              // The rollup ships percentiles, not buckets, so there is no honest
              // histogram to draw. Show the active-time pair we do have rather
              // than an empty chart frame.
              <div
                className="rounded-xl p-3 text-[11px] leading-relaxed"
                style={{ background: "var(--ls-track)", color: "var(--ls-muted)" }}
              >
                <div style={{ color: "var(--ls-ink)", fontWeight: 600 }}>
                  Active time (excludes idling)
                </div>
                <div className="mt-1">
                  Median {formatDuration(timeExtra.active_p50_ms / 1000)} · p90{" "}
                  {formatDuration(timeExtra.active_p90_ms / 1000)}
                </div>
                <div className="mt-1.5" style={{ color: "var(--ls-faint)" }}>
                  {formatPct(timeExtra.null_elapsed_share, 0)} of responses have no client timer.
                </div>
              </div>
            ) : (
              <PanelEmpty>No completion-time distribution yet.</PanelEmpty>
            )
          ) : (
            <>
              <div className="h-[130px] w-full">
                <TimeHistogram data={histogram} />
              </div>
              <div className="mt-1 text-center text-[10px]" style={{ color: "var(--ls-faint)" }}>
                % of students
              </div>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
