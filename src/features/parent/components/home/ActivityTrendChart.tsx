"use client";

import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPeriodLabel, type ActivityPoint } from "../../utils/homeMetrics";
import type { LoadState } from "../../hooks/useParentHomeData";
import { GLASS, ICON, LIFT_SOFT } from "./theme";
import { GlassSkeleton } from "../loader/GlassSkeleton";

interface TooltipPayload {
  payload?: ActivityPoint;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-xl border border-[var(--pp-line)] bg-white px-3 py-2 shadow-[0_8px_24px_-12px_rgba(19,41,61,0.35)]">
      <p className="text-[12px] font-semibold text-[var(--pp-ink)]">{formatPeriodLabel(point.period)}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-bold text-[var(--pp-ink)]">
        <span className="h-2 w-2 rounded-full bg-[var(--pp-green)]" />
        {point.minutes} min
      </p>
    </div>
  );
}

export function ActivityTrendChart({
  state,
  series,
  caption,
}: {
  state: LoadState;
  series: ActivityPoint[];
  caption: string;
}) {
  const empty = state === "ready" && series.every((p) => p.minutes === 0);
  // Around six date labels whatever the period length.
  const tickInterval = Math.max(0, Math.ceil(series.length / 6) - 1);

  return (
    <section
      aria-label="Learning Activity Trend"
      className={`flex min-w-0 flex-col rounded-2xl p-5 ${GLASS} ${LIFT_SOFT}`}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--pp-mint)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
          <img src={ICON("learning_activity_icon")} alt="" width={22} height={22} />
        </span>
        <h3 className="text-[17px] font-bold text-[var(--pp-ink)]">Learning Activity Trend</h3>
        <p className="ml-auto text-[12px] font-medium text-[var(--pp-ink-soft)]">{caption}</p>
      </header>

      <div className="relative mt-4 h-[240px] rounded-xl border border-white/80 bg-white/50 px-1 pb-1 pt-3">
        {state === "loading" ? (
          <GlassSkeleton className="h-full w-full" />
        ) : state === "error" ? (
          <p className="flex h-full items-center justify-center text-[13px] font-medium text-[var(--pp-ink-soft)]">
            Study time isn&apos;t available right now.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 14, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="pp-activity-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A36B" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#16A36B" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#EEF4F2" />
                <XAxis
                  dataKey="period"
                  tickFormatter={formatPeriodLabel}
                  interval={tickInterval}
                  tick={{ fill: "#5E7186", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#5E7186", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: "#16A36B", strokeDasharray: "4 4", strokeWidth: 1 }}
                />
                <Area
                  type="linear"
                  dataKey="minutes"
                  stroke="#16A36B"
                  strokeWidth={2}
                  fill="url(#pp-activity-fill)"
                  dot={series.length <= 45 ? { r: 2.5, fill: "#16A36B", strokeWidth: 0 } : false}
                  activeDot={{ r: 5, fill: "#16A36B", stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            {empty && (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] font-medium text-[var(--pp-ink-soft)]">
                No study time logged in this period.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
