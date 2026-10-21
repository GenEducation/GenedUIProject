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
  const peak = Math.max(1, ...days.map((p) => p.answers));

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 divide-x divide-[var(--rs-line)]">
        <Stat label="Day streak" value={streak ? String(streak.current_streak) : "—"} hint={streak ? `Best ${streak.longest_streak}` : undefined} />
        <Stat label="Active days" value={`${active}`} hint={`of ${days.length}`} />
        <Stat label="Study time" value={formatEstimate(minutes)} hint="Estimated" />
      </dl>

      {/* One bar a day, its height the answers given; an empty day keeps a small mark so the gaps read as gaps. */}
      <div>
        <div className="flex h-14 items-end gap-[3px]" role="img" aria-label={`Answers each day over the last ${days.length} days: ${active} active`}>
          {days.map((p) => (
            <span
              key={p.period}
              title={`${dayLabel(p.period)}: ${plural(p.answers, "answer")}${p.minutes > 0 ? `, about ${formatEstimate(p.minutes)}` : ""}`}
              className="min-w-0 flex-1 rounded-[3px]"
              style={{
                height: p.answers > 0 ? `${Math.max(18, (p.answers / peak) * 100)}%` : p.active_days > 0 ? "12%" : "6%",
                background: p.answers > 0 ? "var(--rs-brand)" : p.active_days > 0 ? "var(--rs-line-strong)" : "var(--rs-track)",
              }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-[var(--rs-ink-soft)]">
          <span>{dayLabel(days[0].period)}</span>
          <span>Today</span>
        </div>
      </div>

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
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12.5px]">
        <span className="font-semibold text-[var(--rs-ink)]">{alone}% of right answers on their own</span>
        <span className="text-[var(--rs-ink-soft)]">{help.correct_alone} alone · {help.correct_with_help} with help · {plural(help.hints_used, "hint")}</span>
      </div>
      <div className="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-[var(--rs-track)]" role="img" aria-label={`${help.correct_alone} right alone, ${help.correct_with_help} right with help`}>
        <span className="rounded-full" style={{ width: `${alone}%`, background: "var(--rs-brand)" }} />
        <span className="rounded-full" style={{ width: `${100 - alone}%`, background: "var(--rs-citron-deep)" }} />
      </div>
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
