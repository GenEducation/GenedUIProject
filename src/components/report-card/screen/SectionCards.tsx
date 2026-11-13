"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatEstimate } from "@/features/learning/activity/useChapterTime";
import { relativeDay } from "../selectors";
import { useReportExtras } from "../sections/ReportExtras";
import { STUDY_TIME_DAYS, recentMinutes, type ActivityData, type Misconception } from "../sections/reportSections";
import type { Section } from "../sections/useSection";
import type { AnswerHelp, ReportCardData } from "../types";
import { BAND_TONES } from "../subjectVisuals";
import { CARD, SkillLevelChip, plural } from "./primitives";
import { Icon, type ReportIconName } from "./icons";

// The sections the new backend added to the card. Each one reads on its own, so one failing shows "Couldn't load" with
// Retry and the rest of the card stands; a section with nothing yet says what fills it.

// ─────────────────────────────────────────────────────────
// SHARED — the card header every overview section uses
// ─────────────────────────────────────────────────────────

/** Icon well, title and a one-line subtitle, with an optional action on the right. */
export function SectionHeader({
  id, icon, title, subtitle, action,
}: {
  id?: string;
  icon: ReportIconName;
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--rs-mint)]">
        <Icon name={icon} size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-[17px] font-bold leading-tight text-[var(--rs-ink)]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-[var(--rs-ink-soft)]">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}

/** "Loading…", or "Couldn't load" with Retry, for a section that hasn't got its data. */
export function SectionStatus<T>({ section, what = "this section" }: { section: Section<T>; what?: string }) {
  if (section.state.status === "loading") return <p className="text-[13px] text-[var(--rs-ink-soft)]">Loading…</p>;
  if (section.state.status !== "error") return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-[13px] text-[var(--rs-ink-soft)]">Couldn&apos;t load {what}.</p>
      <Button variant="outline" size="sm" pill onClick={section.retry}>Retry</Button>
    </div>
  );
}

const EMPTY = "text-[13px] leading-relaxed text-[var(--rs-ink-soft)]";

// ─────────────────────────────────────────────────────────
// STUDY HABITS — the last 30 days at a glance
// ─────────────────────────────────────────────────────────

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export function ActivityCard() {
  const { activity, help } = useReportExtras();
  if (!activity) return null;
  return (
    <section aria-labelledby="rc-habits-title" className={`${CARD} p-5`}>
      <SectionHeader id="rc-habits-title" icon="session-content/time" title="Study habits" subtitle={`The last ${STUDY_TIME_DAYS} days`} />
      <div className="mt-4">
        {activity.state.status === "ready" ? <HabitsBody data={activity.state.data} help={help} /> : <SectionStatus section={activity} />}
      </div>
    </section>
  );
}

function HabitsBody({ data, help }: { data: ActivityData; help: AnswerHelp | null }) {
  const { series, streak } = data;
  const days = series.periods.slice(-STUDY_TIME_DAYS);
  const active = days.filter((p) => p.active_days > 0).length;
  const { minutes, partial } = recentMinutes(series);
  if (days.length === 0 || days.every((p) => p.answers === 0 && p.active_days === 0 && p.minutes === 0)) {
    return <p className={EMPTY}>This fills in as lessons are worked through: the days studied, the time spent and the streak.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 divide-x divide-[var(--rs-line)]">
        <Stat label="Day streak" value={streak ? String(streak.current_streak) : "—"} hint={streak ? `Best ${streak.longest_streak}` : undefined} />
        <Stat label="Active days" value={`${active}`} hint={`of ${days.length}`} />
        <Stat label="Study time" value={formatEstimate(minutes)} hint="Estimated" />
      </dl>

      <DailyBars days={days} active={active} streak={streak?.current_streak ?? 0} />

      {help && help.correct_alone + help.correct_with_help > 0 && (
        <div className="border-t border-[var(--rs-line)] pt-4">
          <IndependenceBar help={help} />
        </div>
      )}

      {series.measured_since && (partial || minutes === 0) && (
        <p className="text-[11.5px] leading-snug text-[var(--rs-ink-soft)]">Study time is tracked from {dayLabel(series.measured_since)}; earlier days show answers only.</p>
      )}
    </div>
  );
}

const weekday = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** How many of the last days make the current streak: the trailing run of active days (ending today or yesterday), at most `streak`. */
function streakRun(days: ActivityData["series"]["periods"], streak: number): number {
  if (streak <= 0) return 0;
  const on = (i: number) => days[i] && (days[i].active_days > 0 || days[i].answers > 0);
  let end = days.length - 1;
  if (!on(end)) end -= 1; // today not studied yet: the streak still stands from yesterday
  let run = 0;
  while (end - run >= 0 && on(end - run) && run < streak) run += 1;
  return run;
}

/**
 * One bar a day, its height the answers given, on a scale that starts at zero and is named by its busiest day. A day opened
 * without answers keeps a short grey mark and an empty day a stub, so gaps read as gaps. A week's first day is labelled,
 * today is marked, and the days of the current streak are underlined: the streak number above points at real days.
 */
function DailyBars({ days, active, streak }: { days: ActivityData["series"]["periods"]; active: number; streak: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(1, ...days.map((p) => p.answers));
  const run = streakRun(days, streak);
  const last = days.length - 1;
  const runEnd = days[last].active_days > 0 || days[last].answers > 0 ? last : last - 1;
  const runStart = runEnd - run + 1;
  const ticks = days.map((_, i) => i).filter((i) => (last - i) % 7 === 0 && i !== last && i > 3 && i < last - 3);
  const shown = hover === null ? null : days[hover];
  const at = (i: number) => ((i + 0.5) / days.length) * 100;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-[12.5px] font-semibold text-[var(--rs-ink)]">Answers each day</p>
        <ul className="flex items-center gap-3 text-[11px] text-[var(--rs-ink-soft)]" aria-hidden>
          <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--rs-brand)]" />Answered</li>
          <li className="flex items-center gap-1.5"><span className="h-1.5 w-2.5 rounded-[2px] bg-[var(--rs-line-strong)]" />Opened only</li>
          {run > 0 && <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--rs-citron-deep)]" />Streak day</li>}
        </ul>
      </div>

      {/* The plot leaves a gutter on the right for the scale's number; bars, streak and dates share the plot's width. */}
      <div className="relative pr-7" onMouseLeave={() => setHover(null)}>
        <span aria-hidden className="pointer-events-none absolute right-0 top-0 -translate-y-1/2 text-[10.5px] tabular-nums text-[var(--rs-ink-soft)]">{peak}</span>
        <div className="relative">
          {/* The scale: zero at the foot, the busiest day at the top, nothing in between. */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-[var(--rs-line-strong)]" />
          <div
            className="flex h-[72px] items-end gap-[2px] border-b border-[var(--rs-line-strong)]"
            role="img"
            aria-label={`Answers each day over the last ${days.length} days: ${active} active`}
          >
            {days.map((p, i) => {
              const answered = p.answers > 0;
              const opened = !answered && p.active_days > 0;
              return (
                <span
                  key={p.period}
                  onMouseEnter={() => setHover(i)}
                  className={`flex h-full min-w-0 flex-1 cursor-default items-end ${i === last ? "rounded-t-[5px] bg-[var(--rs-citron)]/30" : ""}`}
                >
                  <span
                    className="w-full rounded-t-[4px] transition-opacity duration-150"
                    style={{
                      height: answered ? `${Math.max(10, (p.answers / peak) * 100)}%` : opened ? "8%" : "3%",
                      background: answered ? "var(--rs-brand)" : opened ? "var(--rs-line-strong)" : "var(--rs-track)",
                      opacity: hover === null || hover === i ? 1 : 0.45,
                    }}
                  />
                </span>
              );
            })}
          </div>

          {/* Under each bar: a dot for a day of the current streak, and a pointer under today. Same columns as the bars. */}
          <div aria-hidden className="mt-1 flex h-2 gap-[2px]">
            {days.map((p, i) => (
              <span key={p.period} className="flex min-w-0 flex-1 justify-center">
                {i === last ? (
                  <span className="h-0 w-0 border-x-[4px] border-b-[5px] border-x-transparent border-b-[var(--rs-ink)]" />
                ) : run > 0 && i >= runStart && i <= runEnd ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--rs-citron-deep)]" />
                ) : null}
              </span>
            ))}
          </div>

          <div aria-hidden className="relative mt-1.5 h-4 text-[11px] text-[var(--rs-ink-soft)]">
            <span className="absolute left-0">{dayLabel(days[0].period)}</span>
            {ticks.map((i) => (
              <span key={i} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${at(i)}%` }}>{dayLabel(days[i].period)}</span>
            ))}
            <span className="absolute right-0 font-semibold text-[var(--rs-ink)]">Today</span>
          </div>
        </div>

        {shown && hover !== null && (
          <div
            role="status"
            className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-[var(--rs-ink)] px-2.5 py-1.5 text-[11.5px] leading-tight text-white shadow-lg"
            style={{ left: `clamp(60px, ${at(hover)}%, calc(100% - 60px))` }}
          >
            <span className="block font-semibold">{hover === last ? "Today" : weekday(shown.period)}</span>
            <span className="block text-white/80">
              {shown.answers > 0 ? plural(shown.answers, "answer") : shown.active_days > 0 ? "Opened, no answers" : "Not studied"}
              {shown.minutes > 0 ? ` · about ${formatEstimate(shown.minutes)}` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-3 first:pl-0 last:pr-0">
      <dt className="text-[11.5px] font-medium text-[var(--rs-ink-soft)]">{label}</dt>
      <dd className="mt-0.5 text-[20px] font-extrabold leading-tight tabular-nums text-[var(--rs-ink)]">{value}</dd>
      {hint && <dd className="text-[11.5px] text-[var(--rs-ink-soft)]">{hint}</dd>}
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
      <p className="text-[12.5px] font-semibold text-[var(--rs-ink)]">{alone}% of right answers on their own</p>
      <div className="mt-2 flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-[var(--rs-track)]" role="img" aria-label={`${help.correct_alone} right alone, ${help.correct_with_help} right with help`}>
        {help.correct_alone > 0 && <span className="rounded-full" style={{ width: `${alone}%`, background: "var(--rs-brand)" }} />}
        {help.correct_with_help > 0 && <span className="rounded-full" style={{ width: `${100 - alone}%`, background: "var(--rs-citron-deep)" }} />}
      </div>
      {/* The legend names both parts with their counts; hints are a separate count, not a third part of the bar. */}
      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[var(--rs-ink-soft)]">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--rs-brand)]" />
          On their own <span className="font-semibold tabular-nums text-[var(--rs-ink)]">{help.correct_alone}</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--rs-citron-deep)]" />
          With help <span className="font-semibold tabular-nums text-[var(--rs-ink)]">{help.correct_with_help}</span>
        </li>
        <li className="ml-auto">{plural(help.hints_used, "hint")} used</li>
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// WHAT TO WORK ON — skills to practise and mix-ups to clear, in one place
// ─────────────────────────────────────────────────────────

const SHOWN = 3;

/** The backend's revisit list (due first) and the wrong ideas answers showed that are still open. */
export function FocusCard({ data }: { data: ReportCardData }) {
  const { misconceptions } = useReportExtras();
  const [all, setAll] = useState(false);

  const skills = data.chapters.flatMap((c) =>
    (c.skills ?? [])
      .filter((k) => k.status === "keep_practising" || k.due || k.needs_adult_support)
      .map((k) => ({ ...k, chapter: c.document_title, subject: c.subject })),
  ).sort((a, b) => Number(b.due) - Number(a.due) || Number(b.needs_adult_support) - Number(a.needs_adult_support));

  const mixups = misconceptions?.state.status === "ready" ? misconceptions.state.data : [];
  const open = mixups.filter((m) => !m.resolved);
  const cleared = mixups.length - open.length;
  const more = skills.length > SHOWN || open.length > SHOWN;
  const clip = <T,>(xs: T[]) => (all ? xs : xs.slice(0, SHOWN));
  const nothing = skills.length === 0 && open.length === 0 && misconceptions?.state.status !== "loading" && misconceptions?.state.status !== "error";

  return (
    <section aria-labelledby="rc-focus-title" className={`${CARD} @container/focus p-5`}>
      <SectionHeader
        id="rc-focus-title"
        icon="session-content/practice"
        title="What to work on"
        subtitle="Skills to practise again and mix-ups to clear"
        action={more && (
          <Button variant="tertiary" size="sm" pill onClick={() => setAll((v) => !v)} aria-expanded={all}>
            {all ? "Show less" : "View all"}
          </Button>
        )}
      />

      {nothing ? (
        <p className={`mt-4 ${EMPTY}`}>
          Nothing to revisit right now. Skills that need another go, and any mix-ups an answer points to, show up here as chapters are worked through.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 @[560px]/focus:grid-cols-2">
          <Group title="Skills to practise" count={skills.length}>
            {skills.length === 0 ? (
              <p className={EMPTY}>No skills to revisit right now.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {clip(skills).map((k) => (
                  <Row
                    key={`${k.chapter}::${k.component_id}`}
                    title={k.title}
                    meta={`${k.subject} · ${k.chapter}`}
                    flags={[k.due && "Revisit due", k.needs_adult_support && "Could use an adult's help"]}
                    trailing={<SkillLevelChip level={k.level} />}
                  />
                ))}
              </ul>
            )}
          </Group>

          <Group title="Mix-ups to clear" count={open.length}>
            {misconceptions && misconceptions.state.status !== "ready" ? (
              <SectionStatus section={misconceptions} what="the mix-ups" />
            ) : open.length === 0 ? (
              <p className={EMPTY}>{cleared > 0 ? "Every mix-up so far has been cleared." : "No mix-ups recorded yet."}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {clip(open).map((m) => <MixUp key={`${m.misconception_id}:${m.chapter_id}`} m={m} />)}
              </ul>
            )}
            {cleared > 0 && open.length > 0 && (
              <p className="mt-2 text-[12px] font-semibold" style={{ color: BAND_TONES.Proficient.ink }}>
                {plural(cleared, "mix-up")} already cleared
              </p>
            )}
          </Group>
        </div>
      )}
    </section>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--rs-ink-soft)]">
        {title}
        {count > 0 && <span className="rounded-full bg-[var(--rs-surface-2)] px-1.5 text-[11px] tabular-nums ring-1 ring-[var(--rs-line)]">{count}</span>}
      </h3>
      {children}
    </div>
  );
}

function Row({ title, meta, flags = [], trailing }: { title: string; meta: string; flags?: Array<string | false>; trailing?: React.ReactNode }) {
  const shown = flags.filter((f): f is string => !!f);
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--rs-line)] bg-[var(--rs-surface-2)] px-3.5 py-2.5">
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[13.5px] font-semibold text-[var(--rs-ink)]">{title}</p>
        <p className="mt-0.5 truncate text-[11.5px] text-[var(--rs-ink-soft)]">{meta}</p>
        {shown.length > 0 && (
          <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11.5px] font-semibold" style={{ color: BAND_TONES.Approaching.ink }}>
            {shown.map((f) => <span key={f}>{f}</span>)}
          </p>
        )}
      </div>
      {trailing}
    </li>
  );
}

function MixUp({ m }: { m: Misconception }) {
  const tone = BAND_TONES.Developing;
  return (
    <Row
      title={m.title}
      meta={`${m.chapter_title} · last ${relativeDay(m.last_seen_at).toLowerCase()}`}
      trailing={
        <span className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: tone.tint, color: tone.ink }}>
          Seen {m.times_seen}×
        </span>
      }
    />
  );
}
