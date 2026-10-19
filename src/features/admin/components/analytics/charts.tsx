"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { LS_COLORS } from "@/features/admin/analytics/colors";

/** Recharts types a tooltip value as `ValueType | undefined`; every series here is numeric. */
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0));

/**
 * Light-theme recharts wrappers.
 *
 * The admin console's existing wrappers (`../DeviceCharts.tsx`) are hardcoded
 * against the dark shell — white-alpha axes, a `#13283a` tooltip. Only the
 * recharts API carries over, so these are siblings rather than a shared
 * abstraction; making DeviceCharts theme-aware would ripple through DevicesView
 * and its tests for no benefit here.
 */

const AXIS_TICK = { fill: LS_COLORS.axis, fontSize: 11 };

const TOOLTIP = {
  contentStyle: {
    background: "#FFFFFF",
    border: "1px solid #E4EBE6",
    borderRadius: 10,
    fontSize: 12,
    color: "#12291F",
    boxShadow: "0 6px 20px rgba(18,41,31,0.10)",
  },
  itemStyle: { color: "#12291F" },
  labelStyle: { color: "#6B7F74", fontWeight: 600 },
  cursor: { fill: "rgba(18,41,31,0.04)" },
} as const;

export interface SeriesPoint {
  date: string;
  first: number | null;
  second: number | null;
}

/** Activation trend: first vs second qualifying session, as shares. */
export function ActivationTrend({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: -22, right: 10, top: 8, bottom: 4 }}>
        <CartesianGrid stroke={LS_COLORS.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          axisLine={{ stroke: LS_COLORS.grid }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          domain={[0, 1]}
          ticks={[0, 0.5, 1]}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
        />
        <Tooltip
          {...TOOLTIP}
          formatter={(v, name) => [
            `${(num(v) * 100).toFixed(1)}%`,
            name === "first" ? "First session" : "Second session",
          ]}
        />
        <Line
          type="monotone"
          dataKey="first"
          stroke={LS_COLORS.emerald}
          strokeWidth={2}
          dot={{ r: 2.5, fill: LS_COLORS.emerald, strokeWidth: 0 }}
          isAnimationActive={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="second"
          stroke={LS_COLORS.blue}
          strokeWidth={2}
          dot={{ r: 2.5, fill: LS_COLORS.blue, strokeWidth: 0 }}
          isAnimationActive={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface HistogramBucket {
  label: string;
  share: number;
}

/** Placement completion-time distribution. */
export function TimeHistogram({ data }: { data: HistogramBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid stroke={LS_COLORS.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          axisLine={{ stroke: LS_COLORS.grid }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
        />
        <Tooltip
          {...TOOLTIP}
          formatter={(v) => [`${(num(v) * 100).toFixed(0)}% of students`, "Share"]}
        />
        <Bar
          dataKey="share"
          fill={LS_COLORS.emerald}
          radius={[3, 3, 0, 0]}
          maxBarSize={38}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * A single-value ring. Used for completion and activation rates, where the
 * reference shows a donut with the figure in the middle rather than a bar.
 */
export function Gauge({
  fraction,
  color,
  label,
  size = 92,
}: {
  fraction: number;
  color: string;
  label: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const data = [
    { name: "reached", value: clamped },
    { name: "rest", value: 1 - clamped },
  ];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="70%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={color} />
            <Cell fill={LS_COLORS.track} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-[17px] font-bold tracking-tight" style={{ color: "var(--ls-ink)" }}>
          {label}
        </span>
      </div>
    </div>
  );
}
