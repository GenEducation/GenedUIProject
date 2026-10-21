"use client";

import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { BAND_TONES } from "@/components/report-card/subjectVisuals";
import type { Section } from "../../hooks/useSubjectInsights";
import { GlassSkeleton } from "../loader/GlassSkeleton";
import { BAND_SCALE, bandOf, cap, shortDate, trendDelta, type Mover, type TrendPoint } from "./insights";
import { DeltaPill, EmptyNote, SectionCard } from "./parts";
import { MoversGrid } from "./MoversGrid";

export function ProgressSection({
  trend,
  moverSection,
  childName,
}: {
  trend: Section<TrendPoint[]>;
  moverSection: Section<Mover[]>;
  childName: string;
}) {
  const delta = useMemo(() => trendDelta(trend.data), [trend.data]);

  let lede: string;
  if (trend.state !== "ready" || trend.data.length === 0) lede = "How the overall score has changed with each check-in.";
  else if (!delta) lede = `Only one check-in so far. The trend line appears after ${childName}'s next one.`;
  else if (delta.delta > 2) lede = `Up ${delta.delta} points since ${shortDate(delta.since)}. ${cap(childName)} is moving in the right direction.`;
  else if (delta.delta < -2) lede = `Down ${Math.abs(delta.delta)} points since ${shortDate(delta.since)}. A little extra practice will help steady things.`;
  else lede = `Holding steady since ${shortDate(delta.since)}.`;

  return (
    <SectionCard
      id="progress"
      icon={TrendingUp}
      eyebrow="Skill progression"
      title={`Is ${childName} improving?`}
      lede={lede}
      aside={delta ? <DeltaPill delta={delta.delta} large /> : undefined}
    >
      {trend.state === "loading" ? (
        <GlassSkeleton className="h-[260px] rounded-2xl" />
      ) : trend.state === "error" ? (
        <EmptyNote>The progress history isn&apos;t available right now.</EmptyNote>
      ) : trend.data.length === 0 ? (
        <EmptyNote>No check-ins yet. Progress will be charted here as {childName} completes lessons.</EmptyNote>
      ) : (
        <TrendChart points={trend.data} />
      )}

      <div className="mt-7">
        <h3 className="text-[15px] font-extrabold text-[var(--pp-ink)]">Skill by skill</h3>
        <p className="mt-0.5 text-[13px] text-[var(--pp-ink-soft)]">The skills that changed the most, from the first check to the latest.</p>
        <div className="mt-3.5">
          {moverSection.state === "loading" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => <GlassSkeleton key={i} className="h-[132px] rounded-2xl" />)}
            </div>
          ) : moverSection.state === "error" ? (
            <EmptyNote>Skill history isn&apos;t available right now.</EmptyNote>
          ) : moverSection.data.length === 0 ? (
            <EmptyNote>No skill history yet.</EmptyNote>
          ) : (
            <MoversGrid movers={moverSection.data} />
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload?: TrendPoint }[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  const band = bandOf(p.score);
  return (
    <div className="rounded-xl border border-[var(--pp-line)] bg-white px-3 py-2 shadow-[0_8px_24px_-12px_rgba(19,41,61,0.35)]">
      <p className="text-[12px] font-semibold text-[var(--pp-ink-soft)]">
        {new Date(p.t).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
      </p>
      <p className="mt-0.5 flex items-center gap-2 text-[14px] font-extrabold text-[var(--pp-ink)]">
        {p.score}
        <span className="text-[11px] font-bold" style={{ color: BAND_TONES[band].ink }}>{band}</span>
      </p>
    </div>
  );
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  const single = points.length === 1;
  // A lone check-in still needs an x-range to sit in.
  const domain: [number, number] = single
    ? [points[0].t - 3 * 864e5, points[0].t + 3 * 864e5]
    : [points[0].t, points[points.length - 1].t];
  const latest = points[points.length - 1];

  return (
    <div className="relative rounded-2xl border border-white/90 bg-white/60 p-3 pt-4">
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 10, right: 16, bottom: 0, left: -14 }}>
            {BAND_SCALE.map((z) => (
              <ReferenceArea
                key={z.band}
                y1={z.from}
                y2={z.to}
                fill={BAND_TONES[z.band].tint}
                fillOpacity={0.4}
                stroke="none"
                ifOverflow="extendDomain"
              />
            ))}
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={domain}
              tickFormatter={(t: number) => shortDate(t)}
              tick={{ fill: "#5E7477", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 40, 60, 80, 100]}
              tick={{ fill: "#5E7477", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#075E63", strokeDasharray: "4 4", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#075E63"
              strokeWidth={3}
              fill="none"
              dot={{ r: single ? 6 : 3, fill: "#075E63", stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#075E63", stroke: "#fff", strokeWidth: 2 }}
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-2 text-[11.5px] text-[var(--pp-ink-soft)]">
        {BAND_SCALE.slice().reverse().map((z) => (
          <span key={z.band} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: BAND_TONES[z.band].tint, boxShadow: `inset 0 0 0 1px ${BAND_TONES[z.band].edge}` }} />
            {z.band}
          </span>
        ))}
        <span className="ml-auto font-semibold text-[var(--pp-ink)]">
          {single ? "First check-in" : "Latest"}: {latest.score} on {shortDate(latest.t)}
        </span>
      </div>
    </div>
  );
}
