"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { ReportCardData } from "../types";
import { keyInsights, subjectTrend, type SubjectSummary } from "../selectors";
import { BAND_TONES } from "../subjectVisuals";
import { deriveUnlocks } from "../utils";
import { Button } from "@/components/ui/Button";
import { CARD, Sparkline, SubjectGlyph } from "./primitives";
import { Icon, TintIcon } from "./icons";

const BULLETS = 2;

export function InsightsPanel({ data, subjects }: { data: ReportCardData; subjects: SubjectSummary[] }) {
  const unlocks = deriveUnlocks(data);
  return (
    <div className="flex flex-col gap-4">
      <KeyInsights data={data} />
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
      <header className="flex items-center justify-between gap-3">
        <h2 id="rc-insights-title" className="flex items-center gap-2.5 text-[18px] font-bold text-[var(--rs-ink)]">
          <Icon name="insights/key-insight" size={26} />
          Key Insights
        </h2>
        {hasMore && (
          <Button variant="tertiary" size="sm" pill onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
            {showAll ? "Show less" : "View all"}
          </Button>
        )}
      </header>

      {!insights ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-dashed border-[var(--rs-line-strong)] p-4">
          <Icon name="insights/ai-insight" size={20} className="mt-0.5" />
          <p className="text-[13px] leading-relaxed text-[var(--rs-ink-soft)]">
            AI insights are generated once there&apos;s enough signal — 2+ sessions on a chapter unlock its analysis, and
            cross-subject insights follow once a subject is fully analysed.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {insights.working.length > 0 && (
            <InsightBlock icon={<TintIcon name="insights/positive-insight" color="#fff" size={14} />} title="What's working well" bg={good.wash[0]} edge={good.edge} accent={good.accent}>
              <Bullets items={clip(insights.working)} />
            </InsightBlock>
          )}
          {attention.length > 0 && (
            <InsightBlock icon={<TintIcon name="insights/needs-attention" color="#fff" size={14} />} title="Needs attention" bg={warn.wash[0]} edge={warn.edge} accent={warn.accent}>
              <Bullets items={clip(attention)} />
            </InsightBlock>
          )}
          {(insights.headline || insights.assessment) && (
            <InsightBlock
              icon={<TintIcon name="insights/ai-insight" color="#fff" size={15} />}
              title="AI Learning Insight"
              bg="#F1F6FE"
              edge="#DCE6FB"
              accent="#2563EB"
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
          <span className="ml-auto rounded-full border px-2 py-0.5 text-[10.5px] font-semibold" style={{ borderColor: edge, color: accent, background: "#fff" }}>
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
  if (subjects.length === 0) return null;
  return (
    <section aria-labelledby="rc-trends-title" className={`${CARD} p-5`}>
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--rs-mint)]">
          <Icon name="trends/subject-trends" size={24} />
        </span>
        <div>
          <h2 id="rc-trends-title" className="text-[17px] font-bold leading-tight text-[var(--rs-ink)]">Subject Trends</h2>
          <p className="text-[12.5px] text-[var(--rs-ink-soft)]">How mastery has moved across recent sessions</p>
        </div>
      </header>

      <ul className="mt-4 flex flex-col gap-2">
        {subjects.map((s, i) => {
          const trend = subjectTrend(data, s.subject);
          return (
            <motion.li
              key={s.subject}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
              className="grid grid-cols-[auto_minmax(0,1fr)_minmax(70px,1.2fr)_auto] items-center gap-3 rounded-2xl border border-[var(--rs-line)] bg-[var(--rs-surface-2)] px-3 py-2.5"
            >
              <SubjectGlyph subject={s.subject} tone={s.tone} size={38} />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13.5px] font-semibold text-[var(--rs-ink)]">{s.subject}</p>
                <p className="mt-1 text-[13px] font-bold tabular-nums" style={{ color: s.tone.ink }}>{s.mastery}%</p>
              </div>
              {trend ? (
                <>
                  <Sparkline points={trend.points} color={s.tone.accent} height={34} />
                  <Delta value={trend.delta} />
                </>
              ) : (
                <p className="col-span-2 text-right text-[11.5px] leading-snug text-[var(--rs-ink-soft)]">Trend appears after a few sessions</p>
              )}
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

function Delta({ value }: { value: number }) {
  const tone = value > 0 ? BAND_TONES.Advanced : value < 0 ? BAND_TONES.Developing : BAND_TONES["Not started"];
  const glyph = value > 0 ? "trends/increase" : value < 0 ? "trends/decrease" : "trends/no-change";
  return (
    <span className="inline-flex w-[52px] items-center justify-end gap-0.5 text-[12.5px] font-bold tabular-nums" style={{ color: tone.ink }}>
      <TintIcon name={glyph} color={tone.ink} size={11} className="mr-0.5" />
      {value > 0 ? "+" : ""}{value}%
    </span>
  );
}
