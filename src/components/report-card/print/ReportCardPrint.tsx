"use client";

import React from "react";
import type { ReportCardData } from "../types";
import { chapterRows, overallSummary, subjectSummaries, type SubjectSummary } from "../selectors";
import { useReportExtras } from "../sections/ReportExtras";
import {
  factText, recentMinutes, trendLine,
  type ActivitySeries, type InsightFact, type InsightItem, type InsightView, type Misconception, type TrendPoint,
} from "../sections/reportSections";
import { SKILL_LEVELS } from "../screen/primitives";
import { formatEstimate } from "@/features/learning/activity/useChapterTime";

/**
 * The printable report card for a student or a parent (the browser's Save as PDF, see `usePrintPdf`). It is written from
 * the same data as the screen: the report, the activity, trends and mix-ups sections, and the stored note. Everything is
 * laid out open, so the page needs no clicking. A section that has no data (or whose read failed) is left out, never
 * shown empty, and every time figure says it is an estimate.
 */
export function ReportCardPrint({ data }: { data: ReportCardData }) {
  const extras = useReportExtras();
  const subjects = subjectSummaries(data);
  const overall = overallSummary(data, subjects);
  const activity = extras.activity?.state.status === "ready" ? extras.activity.state.data : null;
  const trends = extras.trends?.state.status === "ready" ? extras.trends.state.data : null;
  const mixups = extras.misconceptions?.state.status === "ready" ? extras.misconceptions.state.data : null;
  const note = extras.insights?.state.status === "ready" ? extras.insights.state.data.insight : null;
  const study = activity ? recentMinutes(activity.series) : null;
  const codeOf = (subject: string) => data.chapters.find((c) => c.subject === subject)?.subject_code;
  const nameOf = (code: string) => data.chapters.find((c) => c.subject_code === code)?.subject ?? code;
  const meta = [data.displayGrade != null ? `Grade ${data.displayGrade}` : null, data.displayBoard ? `${data.displayBoard} Board` : null].filter(Boolean);
  const right = extras.help ? extras.help.correct_alone + extras.help.correct_with_help : 0;

  return (
    <div className="rcp">
      <header className="rcp-head">
        <div>
          <p className="rcp-eyebrow">GenEd report card</p>
          <h1 className="rcp-name">{data.displayName}</h1>
          {meta.length > 0 && <p className="rcp-meta">{meta.join("  •  ")}</p>}
        </div>
        <p className="rcp-when"><b>{data.reportPeriod}</b>Generated {data.generatedAt}</p>
      </header>

      <section className="rcp-kpis" aria-label="Summary">
        <Kpi value={`${overall.progress}%`} label="Overall progress" />
        <Kpi value={overall.measured ? `${overall.avgMastery}%` : "—"} label="Average mastery" />
        <Kpi value={`${overall.chaptersCompleted} of ${overall.chaptersTotal}`} label="Chapters completed" />
        <Kpi value={study ? formatEstimate(study.minutes) : "—"} label="Study time, last 30 days (estimated)" />
        <Kpi value={activity ? `${activity.series.periods.slice(-30).reduce((n, p) => n + p.active_days, 0)} of 30` : "—"} label="Days active" />
        <Kpi
          value={extras.help && right > 0 ? `${Math.round((extras.help.correct_alone / right) * 100)}%` : "—"}
          label={extras.help && right > 0 ? `of ${right} right answers on their own` : "Right answers on their own"}
        />
      </section>

      {note && <NoteBlock note={note} />}
      {activity && <ActivityBlock series={activity.series} streak={activity.streak} />}

      <section className="rcp-sec" aria-label="Subjects">
        <h2>Subjects and chapters</h2>
        {subjects.map((s) => (
          <SubjectBlock
            key={s.subject}
            data={data}
            summary={s}
            trend={trends?.subjects.find((t) => t.subject_code === codeOf(s.subject))?.points ?? null}
            entry={note?.subjects.find((e) => e.subject_code === codeOf(s.subject)) ?? null}
          />
        ))}
      </section>

      {mixups && mixups.length > 0 && <MixupsBlock items={mixups} nameOf={nameOf} />}

      <p className="rcp-foot">
        Every figure comes from lesson activity. Study time is an estimate of active time, not a clock.
        {study?.partial ? " Time was not measured for the whole period." : ""}
        {note ? " The written note is made by AI from these figures and checked against them; it describes what was measured, not the child." : ""}
      </p>
      <div className="rc-print-footer">{data.displayName} · GenEd report card · {data.generatedAt}</div>
    </div>
  );
}

function Kpi({ value, label }: { value: string; label: string }) {
  return <div className="rcp-kpi"><b>{value}</b><span>{label}</span></div>;
}

/** The figures a sentence rests on, in words, under the sentence. */
function because(ids: string[], facts: Map<string, InsightFact>) {
  const text = ids.map((id) => facts.get(id)).filter((f): f is InsightFact => !!f).map(factText).join(" · ");
  return text ? <span className="rcp-because">{text}</span> : null;
}

function Items({ items, facts }: { items: InsightItem[]; facts: Map<string, InsightFact> }) {
  return (
    <ul>
      {items.map((item, i) => <li key={i}>{item.text}{because(item.evidence, facts)}</li>)}
    </ul>
  );
}

function NoteBlock({ note }: { note: InsightView }) {
  const facts = new Map(note.facts.map((f) => [f.id, f]));
  return (
    <section className="rcp-sec" aria-label="Key insights">
      <h2>Key insights</h2>
      <div className="rcp-note">
        <p className="rcp-headline">{note.headline}</p>
        {because(note.headline_evidence, facts)}
      </div>
      {(note.working_well.length > 0 || note.needs_attention.length > 0) && (
        <div className="rcp-cols">
          {note.working_well.length > 0 && <div className="rcp-box rcp-box--good"><h3>What&apos;s working well</h3><Items items={note.working_well} facts={facts} /></div>}
          {note.needs_attention.length > 0 && <div className="rcp-box rcp-box--warn"><h3>Worth some practice</h3><Items items={note.needs_attention} facts={facts} /></div>}
        </div>
      )}
      {note.next_steps.length > 0 && <div className="rcp-box rcp-box--steps"><h3>Next steps</h3><Items items={note.next_steps} facts={facts} /></div>}
      <p className="rcp-fine">Written {new Date(note.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.</p>
    </section>
  );
}

/** Minutes of estimated study per week over the last twelve weeks, as bars. */
function ActivityBlock({ series, streak }: { series: ActivitySeries; streak: { current_streak: number; longest_streak: number } | null }) {
  const weeks: Array<{ start: string; minutes: number; days: number }> = [];
  const periods = series.periods;
  for (let end = periods.length; end > 0; end -= 7) {
    const chunk = periods.slice(Math.max(0, end - 7), end);
    weeks.unshift({ start: chunk[0].period, minutes: chunk.reduce((n, p) => n + p.minutes, 0), days: chunk.reduce((n, p) => n + p.active_days, 0) });
  }
  const most = Math.max(1, ...weeks.map((w) => w.minutes));
  const W = 600;
  const step = W / Math.max(1, weeks.length);
  const answers = periods.slice(-30).reduce((n, p) => n + p.answers, 0);
  return (
    <section className="rcp-sec" aria-label="Activity">
      <h2>Activity, last {weeks.length} weeks</h2>
      <svg className="rcp-chart" viewBox={`0 0 ${W} 76`} role="img" aria-label="Estimated minutes of study each week" preserveAspectRatio="none">
        <line className="rcp-axis" x1="0" x2={W} y1="60" y2="60" />
        {weeks.map((w, i) => {
          const h = Math.round((w.minutes / most) * 54);
          return (
            <g key={w.start}>
              <rect className={w.minutes > 0 ? "rcp-bar" : "rcp-bar--none"} x={i * step + 4} y={60 - Math.max(h, 2)} width={step - 8} height={Math.max(h, 2)} rx="2" />
              {i % 2 === 0 && <text className="rcp-tick" x={i * step + step / 2} y="72" textAnchor="middle">{new Date(w.start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</text>}
            </g>
          );
        })}
      </svg>
      <p className="rcp-fine">
        Bars are estimated minutes of study each week.
        {answers > 0 ? ` ${answers} questions answered in the last 30 days.` : ""}
        {streak && streak.longest_streak > 0 ? ` Streak ${streak.current_streak} days now, ${streak.longest_streak} at best.` : ""}
        {series.measured_since ? ` Time measured since ${new Date(series.measured_since).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.` : ""}
      </p>
    </section>
  );
}

function Spark({ values }: { values: number[] }) {
  const W = 90, H = 26;
  const lo = Math.min(...values), span = Math.max(10, Math.max(...values) - lo);
  const pts = values.map((v, i) => [(i * (W - 6)) / (values.length - 1) + 3, H - 3 - ((v - lo) / span) * (H - 6)]);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <polyline className="rcp-spark" points={pts.map((p) => p.join(",")).join(" ")} />
      <circle className="rcp-dot" cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" />
    </svg>
  );
}

function SubjectBlock({
  data, summary: s, trend, entry,
}: {
  data: ReportCardData;
  summary: SubjectSummary;
  trend: TrendPoint[] | null;
  entry: InsightView["subjects"][number] | null;
}) {
  const rows = chapterRows(data, s.subject);
  const line = trend ? trendLine(trend) : null;
  const unopened = rows.filter((r) => !r.started).length;
  return (
    <div className="rcp-subject">
      <div className="rcp-subject-head">
        <div>
          <h3>{s.subject}</h3>
          <p>{s.chaptersCompleted} of {s.chaptersTotal} chapters completed{unopened > 0 ? `, ${unopened} not opened yet` : ""} · {s.bandLabel}</p>
        </div>
        {line && (
          <div title="Share of answered skills known, week by week">
            <Spark values={line.values} />
            <p>{line.delta > 0 ? "+" : ""}{line.delta} points in {line.values.length} weeks</p>
          </div>
        )}
        <div className="rcp-mastery">{s.measured ? `${s.mastery}%` : "—"}<small>mastery</small></div>
      </div>
      {entry && (
        <div className="rcp-subject-note">
          <b>{entry.headline}</b>
          {[...entry.working_well, ...entry.needs_attention].map((i, k) => <span key={k}> {i.text}</span>)}
        </div>
      )}
      <table className="rcp-table">
        <thead><tr><th>#</th><th>Chapter</th><th>Status</th><th>Mastery</th><th>Steps</th><th>Right / asked</th><th>Study time</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const measured = r.started && r.skills.some((k) => k.level !== "not_started");
            return (
              <React.Fragment key={r.key}>
                <tr>
                  <td className="rcp-num">{r.n}</td>
                  <td>{r.title}</td>
                  <td>{r.status}</td>
                  <td className="rcp-num">{measured ? `${r.mastery}%` : "—"}</td>
                  <td className="rcp-num">{r.steps && r.started ? `${r.steps.done} of ${r.steps.total}` : "—"}</td>
                  <td className="rcp-num">{r.answers && r.answers.answered > 0 ? `${r.answers.correct} / ${r.answers.answered}` : "—"}</td>
                  <td className="rcp-num">{r.minutes ? `≈ ${formatEstimate(r.minutes)}` : "—"}</td>
                </tr>
                {r.started && r.skills.length > 0 && (
                  <tr className="rcp-skills"><td /><td colSpan={6}>
                    {r.skills.map((k) => {
                      const flag = k.needs_adult_support ? "adult help suggested" : k.due || k.status === "keep_practising" ? "revisit" : null;
                      return <span key={k.component_id} className={`rcp-chip${flag ? " rcp-chip--flag" : ""}`}>{k.title}: {SKILL_LEVELS[k.level]?.label ?? "Not started"}{flag ? ` (${flag})` : ""}</span>;
                    })}
                  </td></tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MixupsBlock({ items, nameOf }: { items: Misconception[]; nameOf: (code: string) => string }) {
  const open = items.filter((m) => !m.resolved);
  const cleared = items.filter((m) => m.resolved);
  const row = (m: Misconception, open: boolean) => (
    <li key={m.misconception_id}>
      <span className={`rcp-tag ${open ? "rcp-tag--open" : "rcp-tag--done"}`}>{open ? "To clear" : "Cleared"}</span>
      {m.title} <span className="rcp-because" style={{ display: "inline" }}>({nameOf(m.subject_code)} · {m.chapter_title} · seen {m.times_seen} {m.times_seen === 1 ? "time" : "times"})</span>
    </li>
  );
  return (
    <section className="rcp-sec" aria-label="Mix-ups">
      <h2>Mix-ups</h2>
      <ul className="rcp-mix">{[...open.map((m) => row(m, true)), ...cleared.map((m) => row(m, false))]}</ul>
    </section>
  );
}
