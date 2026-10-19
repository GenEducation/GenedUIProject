"use client";

import React from "react";
import { Info, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { ringArc } from "@/components/report-card/utils";
import { formatDuration, PERIODS, type PeriodKey } from "../../utils/homeMetrics";
import type { LoadState } from "../../hooks/useParentHomeData";
import { GLASS, ICON, LIFT } from "./theme";
import { GlassSkeleton } from "../loader/GlassSkeleton";

function CardShell({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={`relative overflow-hidden rounded-2xl p-5 ${GLASS} ${LIFT}`}
    >
      {/* soft quarter-disc in the corner, as in the design */}
      <span aria-hidden className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-[var(--pp-mint)]/60" />
      <div className="relative flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--pp-mint)]">
          {icon}
        </span>
        <h3 className="text-[12px] font-bold uppercase leading-tight tracking-[0.04em] text-[var(--pp-ink)]">{label}</h3>
      </div>
      <div className="relative mt-4">{children}</div>
    </section>
  );
}

const PngIcon = ({ name, size = 22 }: { name: string; size?: number }) => (
  // eslint-disable-next-line @next/next/no-img-element -- tiny static icon
  <img src={ICON(name)} alt="" width={size} height={size} className="select-none" draggable={false} />
);

function Skeleton({ className }: { className: string }) {
  return <GlassSkeleton className={className} />;
}

/** Shown under a figure the backend doesn't provide yet. */
function ComingSoon({ text = "Available soon" }: { text?: string }) {
  return (
    <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-[var(--pp-ink-soft)]">
      <Info size={14} />
      {text}
    </p>
  );
}

// ── Overall Learning Score ───────────────────────────────────────────────────

export function LearningScoreCard({ score }: { score?: number | null }) {
  const has = typeof score === "number";
  const r = 32;
  const { circ, offset } = ringArc(r, has ? score : 0);
  return (
    <CardShell icon={<PngIcon name="metric_overall_score_star" />} label="Overall Learning Score">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[40px] font-bold leading-none tracking-tight text-[var(--pp-ink)]">
            {has ? Math.round(score) : "—"}
            <span className="text-[28px] font-semibold text-[var(--pp-ink-soft)]">/100</span>
          </p>
          {!has && <ComingSoon />}
        </div>
        <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0 -rotate-90" aria-hidden>
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--pp-mint)" strokeWidth="8" />
          {has && (
            <circle
              cx="40" cy="40" r={r} fill="none" stroke="var(--pp-green)" strokeWidth="8"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            />
          )}
          <text
            x="40" y="40" textAnchor="middle" dominantBaseline="central" transform="rotate(90 40 40)"
            className="fill-[var(--pp-ink)] text-[15px] font-bold"
          >
            {has ? `${Math.round(score)}%` : "—"}
          </text>
        </svg>
      </div>
    </CardShell>
  );
}

// ── Skill Index ──────────────────────────────────────────────────────────────

export function SkillIndexCard({ value }: { value?: number | null }) {
  const has = typeof value === "number";
  return (
    <CardShell
      icon={<PngIcon name="metric_skill_index" />}
      label="Skill Index"
    >
      <div className="flex items-center gap-3">
        <p className="text-[40px] font-bold leading-none tracking-tight text-[var(--pp-ink)]">
          {has ? value.toFixed(2) : "—"}
        </p>
        {!has && (
          <span className="rounded-full bg-[var(--pp-mint)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--pp-ink-soft)]">
            Coming soon
          </span>
        )}
      </div>
      <div className={`mt-4 ${has ? "" : "opacity-45"}`} aria-hidden>
        <div className="h-2 rounded-full bg-[linear-gradient(90deg,#F9C6D3_0%,#E6ECEA_45%,#E6ECEA_55%,#A7E3C8_100%)]" />
        <div className="mt-1.5 flex justify-between text-[11px] font-medium leading-tight text-[var(--pp-ink-soft)]">
          <span>&lt; 1.00<br />Below Grade</span>
          <span className="text-center">1.00<br />Grade Level</span>
          <span className="text-right">&gt; 1.00<br />Above Grade</span>
        </div>
      </div>
    </CardShell>
  );
}

// ── Completed Sessions ───────────────────────────────────────────────────────

export function SessionsCard({
  state,
  total,
  trendPct,
}: {
  state: LoadState;
  total: number | null;
  trendPct: number | null;
}) {
  return (
    <CardShell icon={<PngIcon name="metric_completed_sessions_calendar" />} label="Completed Sessions">
      {state === "loading" ? (
        <>
          <Skeleton className="h-10 w-24" />
          <Skeleton className="mt-4 h-4 w-32" />
        </>
      ) : (
        <>
          <p className="text-[40px] font-bold leading-none tracking-tight text-[var(--pp-ink)]">
            {total ?? "—"}
          </p>
          {state === "error" ? (
            <ComingSoon text="Not available right now" />
          ) : (
            <Trend pct={trendPct} />
          )}
        </>
      )}
    </CardShell>
  );
}

function Trend({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <p className="mt-4 text-[13px] font-medium text-[var(--pp-ink-soft)]">All time</p>;
  }
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const tone = pct > 0 ? "text-[var(--pp-green)]" : pct < 0 ? "text-[#E0406E]" : "text-[var(--pp-ink-soft)]";
  return (
    <p className={`mt-4 flex items-center gap-1.5 text-[14px] font-semibold ${tone}`}>
      <Icon size={16} strokeWidth={2.4} />
      {pct === 0 ? "Same as last month" : `${pct > 0 ? "+" : ""}${pct}% this month`}
    </p>
  );
}

// ── Study Time ───────────────────────────────────────────────────────────────

/** The supplied clock icon is cropped, so it's redrawn here in its style. */
export function ClockIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function StudyTimeCard({
  state,
  minutes,
  period,
  onPeriodChange,
}: {
  state: LoadState;
  minutes: number | null;
  period: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
}) {
  return (
    <CardShell icon={<ClockIcon className="text-[var(--pp-green)]" />} label="Study Time">
      {state === "loading" ? (
        <Skeleton className="h-10 w-32" />
      ) : (
        <p className="text-[40px] font-bold leading-none tracking-tight text-[var(--pp-ink)]">
          {state === "error" || minutes === null ? "—" : formatDuration(minutes)}
        </p>
      )}
      <div className="mt-4 w-fit">
        <Select<PeriodKey>
          aria-label="Study time period"
          size="sm"
          value={period}
          onChange={onPeriodChange}
          options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
          accentColor="#16A36B"
          panelWidth={170}
          buttonStyle={{ borderColor: "#16A36B", color: "#0E7C55", fontWeight: 600, borderRadius: 10 }}
        />
      </div>
    </CardShell>
  );
}
