"use client";

import React, { useState } from "react";
import { CalendarDays, Flame, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatEstimate } from "@/features/learning/activity/useChapterTime";
import { relativeDay } from "../selectors";
import { useReportExtras } from "../sections/ReportExtras";
import {
  STUDY_TIME_DAYS,
  recentMinutes,
  type ActivityData,
  type ActivityPeriod,
  type Misconception,
} from "../sections/reportSections";
import type { Section } from "../sections/useSection";
import type { AnswerHelp } from "../types";
import { CARD } from "./primitives";

// The sections the new backend added to the card. Each one reads on its own, so one failing shows "Couldn't load" with
// Retry and the rest of the card stands; a section with nothing yet says what fills it.

/** Loading, "Couldn't load" with Retry, or the section's body once its read is ready. */
export function SectionShell<T>({
  title, icon, section, children,
}: {
  title: string;
  icon: React.ReactNode;
  section: Section<T>;
  children: (data: T) => React.ReactNode;
}) {
  const { state, retry } = section;
  return (
    <section aria-label={title} className={`${CARD} p-5`}>
      <h2 className="flex items-center gap-2.5 text-[18px] font-bold text-[var(--rs-ink)]">
        {icon}
        {title}
      </h2>
      <div className="mt-3">
        {state.status === "loading" && <p className="text-[13px] text-[var(--rs-ink-soft)]">Loading…</p>}
        {state.status === "error" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[13px] text-[var(--rs-ink-soft)]">Couldn&apos;t load this section.</p>
            <Button variant="outline" size="sm" pill onClick={retry}>Retry</Button>
          </div>
        )}
        {state.status === "ready" && children(state.data)}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
// ACTIVITY — calendar, streak, estimated study time
// ─────────────────────────────────────────────────────────

const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY = (iso: string) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
const SHADES = ["var(--rs-track)", "#CFE5E1", "#8FC1BA", "#4F9A91", "#1F6F66"];

/** 0: nothing; 1 to 4 by how many answers the day held (an active day with none still shows). */
export function dayShade(p: ActivityPeriod): number {
  if (p.answers >= 6) return 4;
  if (p.answers >= 3) return 3;
  if (p.answers >= 1) return 2;
  return p.active_days > 0 ? 1 : 0;
}

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function ActivityCard() {
  const { activity } = useReportExtras();
  if (!activity) return null;
  return (
    <SectionShell title="Activity" icon={<CalendarDays size={22} aria-hidden />} section={activity}>
      {(data) => <ActivityBody data={data} />}
    </SectionShell>
  );
}

function ActivityBody({ data }: { data: ActivityData }) {
  const { series, streak } = data;
  const days = series.periods;
  const activeDays = days.filter((p) => p.active_days > 0).length;
  const { minutes, partial } = recentMinutes(series);
  if (days.every((p) => p.answers === 0 && p.active_days === 0 && p.minutes === 0)) {
    return <p className="text-[13px] leading-relaxed text-[var(--rs-ink-soft)]">Activity appears here once lessons are worked through: the days studied, the answers given and the time spent.</p>;
  }
  // Weeks as columns, Monday at the top; the first column is padded up to its Monday.
  const cells: Array<ActivityPeriod | null> = [...Array<null>(WEEKDAY(days[0].period)).fill(null), ...days];
  const columns = Array.from({ length: Math.ceil(cells.length / 7) }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Day streak" value={streak ? String(streak.current_streak) : "—"} icon={<Flame size={14} aria-hidden />} hint={streak ? `best ${streak.longest_streak}` : undefined} />
        <Stat label={`Active days`} value={String(activeDays)} hint={`last ${days.length} days`} />
        <Stat label="Study time (est.)" value={formatEstimate(minutes)} hint={`last ${STUDY_TIME_DAYS} days`} />
      </dl>

      <div className="flex gap-1.5" role="img" aria-label={`Activity over the last ${days.length} days: ${activeDays} active`}>
        <div aria-hidden className="mr-1 grid grid-rows-7 gap-[3px] text-[9.5px] leading-[14px] text-[var(--rs-ink-soft)]">
          {DAY.map((d, i) => <span key={d}>{i % 2 === 0 ? d : ""}</span>)}
        </div>
        {columns.map((col, i) => (
          <div key={i} className="grid grid-rows-7 gap-[3px]">
            {col.map((p, j) => (
              <span
                key={j}
                title={p ? `${dayLabel(p.period)}: ${p.answers} ${p.answers === 1 ? "answer" : "answers"}${p.minutes > 0 ? `, about ${formatEstimate(p.minutes)}` : ""}` : undefined}
                className="h-[14px] w-[14px] rounded-[3px]"
                style={{ background: p ? SHADES[dayShade(p)] : "transparent" }}
              />
            ))}
          </div>
        ))}
      </div>

      <p className="text-[11.5px] leading-snug text-[var(--rs-ink-soft)]">
        Time is an estimate of how long a lesson was actively worked on, never the time it was left open.
        {series.measured_since && (partial || minutes === 0) ? ` Tracked since ${dayLabel(series.measured_since)}; earlier days show their answers but no time.` : ""}
      </p>
    </div>
  );
}

function Stat({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--rs-line)] bg-[var(--rs-surface-2)] px-3 py-2.5">
      <dt className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[var(--rs-ink-soft)]">{icon}{label}</dt>
      <dd className="mt-0.5 text-[18px] font-extrabold tabular-nums text-[var(--rs-ink)]">{value}</dd>
      {hint && <dd className="text-[11px] text-[var(--rs-ink-soft)]">{hint}</dd>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// INDEPENDENCE — right answers alone vs with help
// ─────────────────────────────────────────────────────────

/** Right answers split into those given alone and those with help, side by side and never merged into one score. */
export function IndependenceBar({ help, className = "" }: { help: AnswerHelp; className?: string }) {
  const right = help.correct_alone + help.correct_with_help;
  if (right === 0) {
    return <p className={`text-[12.5px] text-[var(--rs-ink-soft)] ${className}`}>No right answers yet, so nothing to compare alone and with help.</p>;
  }
  const alone = Math.round((help.correct_alone / right) * 100);
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
        <span className="font-semibold text-[var(--rs-ink)]">{alone}% of right answers on their own</span>
        <span className="text-[var(--rs-ink-soft)]">{help.correct_alone} alone · {help.correct_with_help} with help · {help.hints_used} {help.hints_used === 1 ? "hint" : "hints"}</span>
      </div>
      <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-[var(--rs-track)]" role="img" aria-label={`${help.correct_alone} right alone, ${help.correct_with_help} right with help`}>
        <span style={{ width: `${alone}%`, background: "var(--rs-brand)" }} />
        <span style={{ width: `${100 - alone}%`, background: "var(--rs-citron-deep)" }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MISCONCEPTIONS — the wrong ideas answers showed
// ─────────────────────────────────────────────────────────

const SHOWN = 4;

export function MisconceptionsCard() {
  const { misconceptions } = useReportExtras();
  if (!misconceptions) return null;
  return (
    <SectionShell title="Mix-ups to clear" icon={<Lightbulb size={22} aria-hidden />} section={misconceptions}>
      {(items) => <MisconceptionList items={items} />}
    </SectionShell>
  );
}

function MisconceptionList({ items }: { items: Misconception[] }) {
  const [all, setAll] = useState(false);
  if (items.length === 0) {
    return <p className="text-[13px] leading-relaxed text-[var(--rs-ink-soft)]">No mix-ups recorded yet. A common wrong idea shows here when an answer points to it, and moves to fixed once it is answered right.</p>;
  }
  const shown = all ? items : items.slice(0, SHOWN);
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {shown.map((m) => (
          <li key={`${m.misconception_id}:${m.chapter_id}`} className="rounded-2xl border border-[var(--rs-line)] bg-[var(--rs-surface-2)] px-3.5 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-[13.5px] font-semibold leading-snug text-[var(--rs-ink)]">{m.title}</p>
              <span
                className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                style={m.resolved ? { background: "#DDF1E6", color: "#1F6B45" } : { background: "#FDEBD0", color: "#8A5A12" }}
              >
                {m.resolved ? "Fixed" : "Still open"}
              </span>
            </div>
            <p className="mt-1 truncate text-[11.5px] text-[var(--rs-ink-soft)]">
              {m.chapter_title} · seen {m.times_seen} {m.times_seen === 1 ? "time" : "times"}, last {relativeDay(m.last_seen_at).toLowerCase()}
            </p>
          </li>
        ))}
      </ul>
      {items.length > SHOWN && (
        <Button variant="tertiary" size="sm" pill onClick={() => setAll((v) => !v)} aria-expanded={all} className="self-start">
          {all ? "Show less" : `View all ${items.length}`}
        </Button>
      )}
    </div>
  );
}

