"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { ReportCardData } from "../types";
import { keyInsights, subjectTrend, type SubjectSummary } from "../selectors";
import { BAND_TONES } from "../subjectVisuals";
import { deriveUnlocks } from "../utils";
import { Button } from "@/components/ui/Button";
import { CARD, ComingSoon, SubjectGlyph } from "./primitives";
import { ActivityCard, FocusCard, SectionHeader, SectionStatus } from "./SectionCards";
import { KeyInsightsCard } from "./InsightsCards";
import { useReportExtras } from "../sections/ReportExtras";
import { trendLine } from "../sections/reportSections";
import { Icon, TintIcon } from "./icons";

const BULLETS = 2;

// The overview, split by column so each side reads top to bottom:
//   main  subjects (the list, rendered by the screen) → what to work on
//   side  key insights → study habits → subject trends
// On a narrow screen it is one column: insights first, then subjects, work, habits and trends.

/** Below the subject list: what to practise and the mix-ups to clear (the new backend only). */
export function OverviewMain({ data }: { data: ReportCardData }) {
  const v1 = data.chapters.some((c) => c.skills !== undefined);
  return v1 ? <FocusCard data={data} /> : null;
}

/** The summary of how things are going: the written note, or the teacher report's own insights. */
export function OverviewInsights({ data }: { data: ReportCardData }) {
  const extras = useReportExtras();
  const v1 = data.chapters.some((c) => c.skills !== undefined);
  return v1 && extras.insights ? <KeyInsightsCard /> : <KeyInsights data={data} />;
}

/** Study habits, the subject trends and (teacher report) what unlocks next. */
export function OverviewHabits({ data, subjects }: { data: ReportCardData; subjects: SubjectSummary[] }) {
  // The new backend (its chapters carry skills) has no learning-arc analyses, so nothing "unlocks" them any more.
  const v1 = data.chapters.some((c) => c.skills !== undefined);
  const unlocks = v1 ? [] : deriveUnlocks(data);
  return (
    <>
      {v1 && <ActivityCard />}
      <SubjectTrends data={data} subjects={subjects} />
      {unlocks.length > 0 && (
        <section aria-label="What unlocks next" className={`${CARD} p-5`}>
          <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--rs-ink-soft)]">
            <Lock size={13} /> What unlocks next
          </h3>
          <ul className="mt-3 flex flex-col gap-2.5">
            {unlocks.map((u) => (
              <li key={u.label} className="flex items-start gap-2.5 text-[13px] leading-snug">
                <span aria-hidden className="mt-[5px] h-2 w-2 shrink-0 rounded-full border-2 border-[var(--rs-line-strong)]" />
                <span>
                  <span className="font-semibold text-[var(--rs-ink)]">{u.label}</span>
                  <span className="text-[var(--rs-ink-soft)]"> — {u.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** The wide screen's right column. */
export function InsightsPanel({ data, subjects }: { data: ReportCardData; subjects: SubjectSummary[] }) {
  return (
    <div className="flex flex-col gap-5">
      <OverviewInsights data={data} />
      <OverviewHabits data={data} subjects={subjects} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// KEY INSIGHTS
// ─────────────────────────────────────────────────────────

function KeyInsights({ data }: { data: ReportCardData }) {
  const [showAll, setShowAll] = useState(false);
  const insights = keyInsights(data);
  const good = BAND_TONES.Advanced;
  const warn = BAND_TONES.Approaching;
  const coverage = data.progressReport?.subject_count ?? 0;

  const attention = insights
    ? [...insights.attention, ...insights.focusAreas.map((f) => f.area).filter((a): a is string => !!a)]
    : [];
  const hasMore = !!insights && (insights.working.length > BULLETS || attention.length > BULLETS);
  const clip = (xs: string[]) => (showAll ? xs : xs.slice(0, BULLETS));

  return (
    <section aria-labelledby="rc-insights-title" className={`${CARD} p-5`}>
      <SectionHeader
        id="rc-insights-title"
        icon="insights/key-insight"
        title="Key Insights"
        subtitle="A short summary of how things are going"
        action={hasMore && (
          <Button variant="tertiary" size="sm" pill onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
            {showAll ? "Show less" : "View all"}
          </Button>
        )}
      />

      {!insights ? (
        <div className="mt-4">
          <ComingSoon
            compact
            icon={<Icon name="insights/ai-insight" size={20} />}
            title="AI learning insights"
            text="What's working well, what needs attention and where to focus next, across every subject."
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {insights.working.length > 0 && (
            <InsightBlock icon={<TintIcon name="marks/check" color="#fff" size={14} />} title="What's working well" bg="var(--rs-surface-2)" edge="var(--rs-line)" accent={good.accent}>
              <Bullets items={clip(insights.working)} />
            </InsightBlock>
          )}
          {attention.length > 0 && (
            <InsightBlock icon={<TintIcon name="marks/flag" color="#fff" size={13} />} title="Needs attention" bg="var(--rs-surface-2)" edge="var(--rs-line)" accent={warn.accent}>
              <Bullets items={clip(attention)} />
            </InsightBlock>
          )}
          {(insights.headline || insights.assessment) && (
            <InsightBlock
              icon={<TintIcon name="insights/ai-insight" color="#A9CCC7" size={15} />}
              title="AI Learning Insight"
              bg="var(--rs-surface-2)"
              edge="var(--rs-line-strong)"
              accent="var(--rs-ink)"
              badge="Powered by GenEd AI"
            >
              {insights.headline && <p className="text-[13px] font-semibold leading-snug text-[var(--rs-ink)]">{insights.headline}</p>}
              {insights.assessment && (
                <p className={`mt-1 text-[12.5px] leading-relaxed text-[var(--rs-ink-soft)] ${showAll ? "" : "line-clamp-3"}`}>
                  {insights.assessment}
                </p>
              )}
            </InsightBlock>
          )}
          {data.subjects.length > 0 && coverage > 0 && coverage < data.subjects.length && (
            <p className="px-1 text-[11.5px] text-[var(--rs-ink-soft)]">
              Based on {coverage} of {data.subjects.length} subjects — the rest unlock as sessions accumulate.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function InsightBlock({
  icon, title, bg, edge, accent, badge, children,
}: {
  icon: React.ReactNode;
  title: string;
  bg: string;
  edge: string;
  accent: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-4" style={{ background: bg, borderColor: edge }}>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ background: accent }}>{icon}</span>
        <h3 className="text-[14px] font-bold text-[var(--rs-ink)]">{title}</h3>
        {badge && (
          <span className="ml-auto rounded-full border border-[var(--rs-line-strong)] bg-[var(--rs-mint)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--rs-brand)]">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-2.5 pl-[38px]">{children}</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-4 text-[12.5px] leading-relaxed text-[var(--rs-ink)] marker:text-[var(--rs-ink-soft)]">
      {items.map((x, i) => <li key={i}>{x}</li>)}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────
// SUBJECT TRENDS
// ─────────────────────────────────────────────────────────

function SubjectTrends({ data, subjects }: { data: ReportCardData; subjects: SubjectSummary[] }) {
  const { trends } = useReportExtras();
  if (subjects.length === 0) return null;
  if (trends) return <WeeklyTrends data={data} subjects={subjects} section={trends} />;
  // The teacher's report: session scores from the old analyses.
  if (!subjects.some((s) => subjectTrend(data, s.subject))) {
    return (
      <section aria-label="Subject trends" className={`${CARD} p-5`}>
        <ComingSoon
          compact
          icon={<Icon name="trends/subject-trends" size={22} />}
          title="Subject trends"
          text="How each subject is moving over time, session by session."
        />
      </section>
    );
  }
  return (
    <TrendsShell>
      {subjects.map((s, i) => {
        const trend = subjectTrend(data, s.subject);
        return <TrendRow key={s.subject} s={s} i={i} line={trend && { values: trend.points, delta: trend.delta }} unit="session" none="Shows after a few sessions" />;
      })}
    </TrendsShell>
  );
}

/** The new backend's trends: week by week, the share of the skills answered on that the learner knows. */
function WeeklyTrends({ data, subjects, section }: { data: ReportCardData; subjects: SubjectSummary[]; section: NonNullable<ReturnType<typeof useReportExtras>["trends"]> }) {
  const { state } = section;
  if (state.status !== "ready") {
    return (
      <section aria-labelledby="rc-trends-title" className={`${CARD} p-5`}>
        <SectionHeader id="rc-trends-title" icon="trends/subject-trends" title="Subject Trends" />
        <div className="mt-4"><SectionStatus section={section} /></div>
      </section>
    );
  }
  // The trends are keyed by subject code; the card's subjects by name, which each chapter carries both of.
  const codeOf = new Map(data.chapters.filter((c) => c.subject_code).map((c) => [c.subject, c.subject_code as string]));
  return (
    <TrendsShell note="Share of practised skills known, week by week">
      {subjects.map((s, i) => {
        const points = state.data.subjects.find((t) => t.subject_code === codeOf.get(s.subject))?.points ?? [];
        const line = trendLine(points);
        const weeks = points.filter((p) => p.known_share != null).map((p) => weekLabel(p.week));
        return <TrendRow key={s.subject} s={s} i={i} line={line && { ...line, labels: weeks }} unit="week" none="Shows after two weeks of answers" />;
      })}
    </TrendsShell>
  );
}

function TrendsShell({ note = "How mastery has moved across recent sessions", children }: { note?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby="rc-trends-title" className={`${CARD} p-5`}>
      <SectionHeader id="rc-trends-title" icon="trends/subject-trends" title="Subject Trends" subtitle={note} />
      <ul className="mt-4 flex flex-col gap-2">{children}</ul>
    </section>
  );
}

const weekLabel = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : `Week of ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}`;
};

type TrendLine = { values: number[]; delta: number; labels?: string[] };

/**
 * One subject's line on the card's shared 0-100% scale, so two subjects' slopes compare honestly (a dip of a few points
 * stays a few points). Faint guides at 0, 50 and 100; the first value a hollow dot, the latest a filled one; every value
 * named on hover.
 */
function TrendChart({ line, color, unit }: { line: TrendLine; color: string; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const { values } = line;
  const n = values.length;
  const x = (i: number) => (n === 1 ? 50 : 4 + (i * 92) / (n - 1)); // % across, with room for the end dots
  const y = (v: number) => 100 - Math.min(100, Math.max(0, v)); // % down
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  const label = (i: number) => `${line.labels?.[i] ?? `${unit[0].toUpperCase()}${unit.slice(1)} ${i + 1}`}: ${values[i]}%`;
  return (
    <div className="relative h-11 w-full" onMouseLeave={() => setHover(null)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full overflow-visible">
        {[0, 50, 100].map((g) => (
          <line key={g} x1="0" x2="100" y1={g} y2={g} stroke="var(--rs-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray={g === 100 ? undefined : "2 3"} />
        ))}
        <motion.path
          d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </svg>
      {values.map((v, i) => (
        <span
          key={i}
          onMouseEnter={() => setHover(i)}
          className="absolute h-full -translate-x-1/2"
          style={{ left: `${x(i)}%`, width: `${Math.max(8, 92 / Math.max(1, n - 1))}%`, top: 0 }}
        >
          {(i === 0 || i === n - 1 || hover === i) && (
            <span
              aria-hidden
              className="absolute left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                top: `${y(v)}%`,
                background: i === n - 1 || hover === i ? color : "var(--rs-surface-2)",
                border: `2px solid ${color}`,
                boxShadow: "0 0 0 2px var(--rs-surface-2)",
              }}
            />
          )}
        </span>
      ))}
      {hover !== null && (
        <span
          role="status"
          className="pointer-events-none absolute bottom-full z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--rs-ink)] px-2 py-1 text-[11px] font-semibold text-white shadow-md"
          style={{ left: `clamp(48px, ${x(hover)}%, calc(100% - 48px))` }}
        >
          {label(hover)}
        </span>
      )}
      <span className="sr-only">{values.map((_, i) => label(i)).join("; ")}</span>
    </div>
  );
}

function TrendRow({ s, i, line, unit, none }: { s: SubjectSummary; i: number; line: TrendLine | null; unit: string; none: string }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
      className="grid grid-cols-[auto_minmax(0,1fr)_minmax(84px,1.3fr)_auto] items-center gap-3 rounded-2xl border border-[var(--rs-line)] bg-[var(--rs-surface-2)] px-3 py-2.5"
    >
      <SubjectGlyph subject={s.subject} tone={s.tone} size={38} />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[13.5px] font-semibold text-[var(--rs-ink)]">{s.subject}</p>
        <p className="mt-1 text-[12px] text-[var(--rs-ink-soft)]">
          {s.measured ? <><span className="text-[14px] font-bold tabular-nums text-[var(--rs-ink)]">{s.mastery}%</span> known</> : "Not measured yet"}
        </p>
      </div>
      {line ? (
        <>
          <TrendChart line={line} color={s.tone.accent} unit={unit} />
          <Delta
            value={line.delta}
            span={line.labels?.[0] ? `since ${line.labels[0].replace(/^Week of /, "")}` : `over ${line.values.length - 1} ${unit}${line.values.length - 1 === 1 ? "" : "s"}`}
          />
        </>
      ) : (
        <div className="col-span-2 flex items-center gap-3">
          <span aria-hidden className="h-0 flex-1 border-t-2 border-dashed border-[var(--rs-line-strong)]" />
          <p className="max-w-[150px] text-right text-[11.5px] leading-snug text-[var(--rs-ink-soft)]">{none}</p>
        </div>
      )}
    </motion.li>
  );
}

function Delta({ value, span }: { value: number; span: string }) {
  const tone = value > 0 ? BAND_TONES.Advanced : value < 0 ? BAND_TONES.Developing : BAND_TONES["Not started"];
  const glyph = value > 0 ? "trends/increase" : value < 0 ? "trends/decrease" : "trends/no-change";
  // A gain is an earned moment: ink on a citron pill. A drop or no change stays plain. Points, not percent: the line is already a share.
  const up = value > 0;
  return (
    <span className="flex min-w-[68px] flex-col items-end whitespace-nowrap leading-tight">
      <span
        className={`inline-flex items-center gap-0.5 text-[12.5px] font-bold tabular-nums ${up ? "rounded-full bg-[var(--rs-citron)] px-1.5 py-0.5" : ""}`}
        style={{ color: up ? "var(--rs-ink)" : tone.ink }}
        aria-label={value === 0 ? `No change ${span}` : `${up ? "Up" : "Down"} ${Math.abs(value)} points ${span}`}
      >
        <TintIcon name={glyph} color={up ? "var(--rs-ink)" : tone.ink} size={11} className="mr-0.5" />
        {value === 0 ? "No change" : `${up ? "+" : "−"}${Math.abs(value)} pts`}
      </span>
      <span aria-hidden className="mt-0.5 text-[10.5px] text-[var(--rs-ink-soft)]">{span}</span>
    </span>
  );
}
