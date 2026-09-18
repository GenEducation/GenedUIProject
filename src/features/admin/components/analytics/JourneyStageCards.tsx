"use client";

import { ArrowRight, ArrowUp, ArrowDown, Users, FileText, Rocket, Sparkles } from "lucide-react";

import { formatCount, formatPct } from "@/features/admin/analytics/aggregate";
import { LS_COLORS, STAGE_TONES } from "@/features/admin/analytics/colors";
import type { JourneySummary } from "@/features/admin/analytics/types";

import { Panel, PanelEmpty } from "./Panel";

const STAGE_ICON = [Users, FileText, Rocket, Sparkles];

/**
 * The four headline numbers, with the drop-off into each next stage folded
 * into the card itself — the conversion rate and the students lost.
 *
 * This used to be two panels (this one, and a separate "Where are students
 * dropping off?" bar chart) that were both just views of the same four
 * cohort-based counts. One number restated as a bar chart is not a second
 * insight. The drop-off figures live in each card's own footer — not only in
 * the connector between cards — because the cards stack to one column below
 * `xl`, where a side connector has nowhere to sit; a mobile admin needs this
 * exactly as much as a desktop one. The connector arrow at `xl` is decoration
 * for the flow, not a second copy of the numbers. Placement is deliberately
 * absent from these four stages — it's a diagnostic area, not a fifth
 * headline.
 */
export function JourneyStageCards({ summary }: { summary: JourneySummary | null }) {
  if (!summary || summary.steps.length === 0) {
    return (
      <Panel title="Student Journey" subtitle="From acquisition to activation, with drop-off rates at each stage.">
        <PanelEmpty>
          No cohorts have completed the journey window yet. Numbers appear once the first
          rollup runs.
        </PanelEmpty>
      </Panel>
    );
  }

  return (
    <Panel
      title="Student Journey"
      subtitle="From acquisition to activation, with drop-off rates at each stage."
      right={
        summary.partial_cohorts > 0 ? (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: "var(--ls-amber-soft)", color: "#96651B" }}
            title="Recent cohorts haven't finished their attribution window, so they're excluded from these counts rather than shown as if final."
          >
            {summary.partial_cohorts} recent {summary.partial_cohorts === 1 ? "day" : "days"} still
            catching up
          </span>
        ) : null
      }
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
        {summary.steps.map((step, i) => {
          const tone = STAGE_TONES[i % STAGE_TONES.length];
          const Icon = STAGE_ICON[i % STAGE_ICON.length];
          const next = summary.steps[i + 1];
          const change = step.change_pct;
          const up = (change ?? 0) >= 0;

          const lost = next && step.count > 0 ? step.count - next.count : null;
          const lostShare = next && step.count > 0 ? (step.count - next.count) / step.count : null;
          const conversionToNext = next && step.count > 0 ? next.count / step.count : null;

          return (
            <div key={step.step_key} className="flex flex-1 items-center gap-3">
              <div
                className="flex flex-1 flex-col rounded-xl p-4"
                style={{ background: `var(--ls-${tone}-soft)` }}
                data-stage={step.label}
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ background: "rgba(255,255,255,0.72)", color: `var(--ls-${tone})` }}
                  >
                    <Icon size={17} aria-hidden />
                  </span>
                  <span className="text-[13px] font-semibold" style={{ color: "var(--ls-ink)" }}>
                    {step.label}
                  </span>
                </div>

                <div
                  className="text-[28px] font-bold leading-none tracking-tight"
                  style={{ color: "var(--ls-ink)" }}
                >
                  {formatCount(step.count)}
                </div>
                <div className="mt-1 text-[11px]" style={{ color: "var(--ls-muted)" }}>
                  students
                </div>

                {change === null || change === undefined ? (
                  <div className="mt-2.5 text-[11px]" style={{ color: "var(--ls-faint)" }}>
                    No previous period to compare
                  </div>
                ) : (
                  <>
                    <div
                      className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold"
                      style={{ color: up ? "var(--ls-emerald)" : "var(--ls-danger)" }}
                    >
                      {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                      {formatPct(Math.abs(change), 0)}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--ls-faint)" }}>
                      vs. previous period
                    </div>
                  </>
                )}

                {/* Visible at every breakpoint — the cards stack below `xl`,
                    where a side connector has nowhere to sit. */}
                {next ? (
                  <div
                    className="mt-3 flex items-baseline justify-between gap-2 border-t pt-2.5"
                    style={{ borderColor: "rgba(18,41,31,0.08)" }}
                  >
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: LS_COLORS.danger }}
                    >
                      {lost !== null ? `${formatCount(lost)} lost` : "—"}
                      {lostShare !== null ? ` (${formatPct(lostShare)})` : ""}
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: "var(--ls-muted)" }}>
                      {conversionToNext !== null ? formatPct(conversionToNext) : "—"} to next
                    </span>
                  </div>
                ) : null}
              </div>

              {next ? (
                <ArrowRight
                  size={16}
                  className="hidden shrink-0 xl:block"
                  style={{ color: "var(--ls-faint)" }}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
