"use client";

import { ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Dark-theme recharts wrappers for the admin console. The app's existing charts
 * (src/components/analytics/*) are all light-themed against a white surface, so
 * none of their styling carries over — only the recharts API does.
 */

const GRID = "rgba(255,255,255,0.08)";
const AXIS_TICK = { fill: "rgba(255,255,255,0.4)", fontSize: 11 };

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#13283a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    fontSize: 12,
    color: "#fff",
  },
  itemStyle: { color: "#fff" },
  labelStyle: { color: "rgba(255,255,255,0.5)" },
  cursor: { fill: "rgba(255,255,255,0.04)" },
} as const;

export const CHART_COLORS = {
  good: "#059F6D",
  warn: "#FBBF24",
  bad: "#FB7185",
  muted: "rgba(255,255,255,0.22)",
  neutral: "#38BDF8",
} as const;

export function ChartCard({
  title,
  subtitle,
  children,
  empty,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-white/40">{subtitle}</p> : null}
      </div>
      {empty ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-white/30">
          No data
        </div>
      ) : (
        <div className="h-[220px] w-full">{children}</div>
      )}
    </div>
  );
}

export interface Slice {
  name: string;
  value: number;
  color: string;
}

export function DonutChart({ data }: { data: Slice[] }) {
  const shown = data.filter((d) => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={shown}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          stroke="none"
        >
          {shown.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export interface StackedRow {
  label: string;
  healthy: number;
  unhealthy: number;
}

/** Horizontal bars — a school with zero healthy devices reads instantly. */
export function BySchoolChart({ data }: { data: StackedRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
        <XAxis
          type="number"
          tick={AXIS_TICK}
          axisLine={{ stroke: GRID }}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={130}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar dataKey="healthy" stackId="a" name="Online" fill={CHART_COLORS.good} radius={[0, 0, 0, 0]} />
        <Bar dataKey="unhealthy" stackId="a" name="Not online" fill={CHART_COLORS.muted} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface FirmwareRow {
  label: string;
  count: number;
  isCurrent: boolean;
}

/** The modal version is "current"; everything else is a laggard. */
export function FirmwareChart({ data }: { data: FirmwareRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -16, right: 12, top: 4, bottom: 4 }}>
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          axisLine={{ stroke: GRID }}
          tickLine={false}
          interval={0}
        />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar dataKey="count" name="Devices" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.isCurrent ? CHART_COLORS.good : CHART_COLORS.warn} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
