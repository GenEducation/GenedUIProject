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

import { LS_COLORS } from "../analytics/colors";

/**
 * Recharts wrappers for the admin console, on the app's light surface. Colours
 * come from LS_COLORS because recharts sets fill/stroke as SVG attributes and
 * cannot resolve a CSS var() through them.
 */

const INK = "#122D30"; // --ink; see LS_COLORS for why this is not a var()
const GRID = LS_COLORS.grid;
const AXIS_TICK = { fill: LS_COLORS.axis, fontSize: 11 };

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#FFFFFF",
    border: `1px solid ${LS_COLORS.grid}`,
    borderRadius: 10,
    fontSize: 12,
    color: INK,
    boxShadow: "0 4px 12px rgba(18,45,48,0.08)",
  },
  itemStyle: { color: INK },
  labelStyle: { color: LS_COLORS.axis },
  cursor: { fill: LS_COLORS.track },
} as const;

export const CHART_COLORS = {
  good: LS_COLORS.emerald,
  warn: LS_COLORS.amber,
  bad: LS_COLORS.danger,
  muted: LS_COLORS.axis,
  neutral: LS_COLORS.blue,
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
    <div className="rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(18,45,48,.06),0_1px_3px_rgba(18,45,48,.05)] p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {empty ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-light">
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
            <span style={{ color: LS_COLORS.axis, fontSize: 12 }}>{value}</span>
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
