"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { ReportCardData } from "../types";
import { keyInsights, subjectTrend, type SubjectSummary } from "../selectors";
import { BAND_TONES } from "../subjectVisuals";
import { deriveUnlocks } from "../utils";
import { Button } from "@/components/ui/Button";
import { CARD, ComingSoon, Sparkline, SubjectGlyph } from "./primitives";
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
        return <TrendRow key={s.subject} s={s} i={i} line={trend && { values: trend.points, delta: trend.delta }} none="Trend appears after a few sessions" />;
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
    <TrendsShell note="Skills known in each subject, week by week">
      {subjects.map((s, i) => {
        const points = state.data.subjects.find((t) => t.subject_code === codeOf.get(s.subject))?.points ?? [];
        return <TrendRow key={s.subject} s={s} i={i} line={trendLine(points)} none="Trend appears after answers in a couple of weeks" />;
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

function TrendRow({ s, i, line, none }: { s: SubjectSummary; i: number; line: { values: number[]; delta: number } | null; none: string }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
      className="grid grid-cols-[auto_minmax(0,1fr)_minmax(70px,1.2fr)_auto] items-center gap-3 rounded-2xl border border-[var(--rs-line)] bg-[var(--rs-surface-2)] px-3 py-2.5"
    >
      <SubjectGlyph subject={s.subject} tone={s.tone} size={38} />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[13.5px] font-semibold text-[var(--rs-ink)]">{s.subject}</p>
        <p className="mt-1 text-[13px] font-bold tabular-nums" style={{ color: s.tone.ink }}>{s.measured ? `${s.mastery}%` : "—"}</p>
      </div>
      {line ? (
        <>
          <Sparkline points={line.values} color={s.tone.accent} height={34} />
          <Delta value={line.delta} />
        </>
      ) : (
        <p className="col-span-2 text-right text-[11.5px] leading-snug text-[var(--rs-ink-soft)]">{none}</p>
      )}
    </motion.li>
  );
}

function Delta({ value }: { value: number }) {
  const tone = value > 0 ? BAND_TONES.Advanced : value < 0 ? BAND_TONES.Developing : BAND_TONES["Not started"];
  const glyph = value > 0 ? "trends/increase" : value < 0 ? "trends/decrease" : "trends/no-change";
  // A gain is an earned moment: ink on a citron pill. Drops/flat stay plain text.
  const up = value > 0;
  return (
    <span className="flex w-[60px] justify-end">
      <span
        className={`inline-flex items-center gap-0.5 text-[12.5px] font-bold tabular-nums ${up ? "rounded-full bg-[var(--rs-citron)] px-1.5 py-0.5" : ""}`}
        style={{ color: up ? "var(--rs-ink)" : tone.ink }}
      >
        <TintIcon name={glyph} color={up ? "var(--rs-ink)" : tone.ink} size={11} className="mr-0.5" />
        {up ? "+" : ""}{value}%
      </span>
    </span>
  );
}
