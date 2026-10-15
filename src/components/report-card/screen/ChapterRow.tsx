"use client";

import React from "react";
import { motion } from "framer-motion";
import type { ReportCardUI } from "../types";
import { relativeDay, type ChapterRowModel, type ChapterStatus } from "../selectors";
import { BAND_TONES } from "../subjectVisuals";
import { ChapterAnalysis } from "../parts/ChapterAnalysis";
import { Reveal } from "../parts/Reveal";
import { Icon, TintIcon } from "./icons";
import { Bar, COVERAGE_COLOR, FOCUS_RING, MetaStat, Ring, SkillLevelChip, plural } from "./primitives";
import { formatMinutes } from "./SubjectPreview";
import { IndependenceBar } from "./SectionCards";

const STATUS_TONE: Record<ChapterStatus, { bg: string; fg: string }> = {
  Completed: { bg: BAND_TONES.Advanced.tint, fg: BAND_TONES.Advanced.ink },
  "In progress": { bg: BAND_TONES.Approaching.tint, fg: BAND_TONES.Approaching.ink },
  "Not started": { bg: BAND_TONES["Not started"].tint, fg: BAND_TONES["Not started"].ink },
};

/** One chapter: number, status, coverage, mastery ring. A chapter with the new backend's facts shows its steps,
 *  answers and outcomes, and expands to its skills; an older record expands to its learning arc and session report. */
export function ChapterRow({ row, ui, index }: { row: ChapterRowModel; ui: ReportCardUI; index: number }) {
  const { tone } = row;
  const expandKey = `${row.key}::open`;
  const open = ui.isExpOpen(expandKey);
  // The new backend's chapter: it knows the chapter's steps (the old records never did).
  const v1 = row.steps != null;
  const measured = row.skills.some((k) => k.level !== "not_started");
  const expandable = v1 ? row.skills.length > 0 || row.outcomes != null : row.started;
  const status = STATUS_TONE[row.status];
  const panelId = `rc-ch-${index}`;
  // Opening a chapter is already a deliberate click, so its learning arc (or,
  // before there is one, its session report) starts open; toggling closes it.
  const primaryKey = `${row.key}::${row.evo ? "arc" : "report"}`;
  const analysisUi: ReportCardUI = { ...ui, isExpOpen: (k) => (k === primaryKey ? !ui.isExpOpen(k) : ui.isExpOpen(k)) };

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04 }}
      className="overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-[0_14px_30px_-24px_rgba(18,45,48,0.5)]"
      style={{ borderColor: open ? tone.edge : "var(--rs-line)" }}
    >
      {/* eslint-disable-next-line no-restricted-syntax -- disclosure header for a composite chapter card */}
      <button
        type="button"
        disabled={!expandable}
        onClick={() => ui.toggleExp(expandKey)}
        aria-expanded={expandable ? open : undefined}
        aria-controls={expandable ? panelId : undefined}
        className={`group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3.5 p-4 text-left disabled:cursor-default ${FOCUS_RING} @container/ch`}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[17px] font-extrabold tabular-nums"
          style={{ background: tone.tint, color: tone.ink }}
        >
          {row.n}
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h4 className={`text-[14.5px] font-bold leading-snug ${row.started ? "text-[var(--rs-ink)]" : "text-[var(--rs-ink-soft)]"}`}>{row.title}</h4>
            <span className="rounded-md px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: status.bg, color: status.fg }}>
              {row.status}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12px] text-[var(--rs-ink-soft)]">
            {v1 ? (
              <>
                {row.chapter.book_title && <span className="truncate">{row.chapter.book_title}</span>}
                {row.started && row.steps && <span>Step {row.steps.done} of {row.steps.total}</span>}
                {row.started && row.minutes != null && row.minutes > 0 && (
                  <span className="inline-flex items-center gap-1" title="Estimated active study time"><Icon name="session-content/time" size={12} />≈ {formatMinutes(row.minutes)}</span>
                )}
              </>
            ) : (
              <>
                {row.minutes != null && <span className="inline-flex items-center gap-1"><Icon name="session-content/time" size={12} />{formatMinutes(row.minutes)}</span>}
                <span>{plural(row.sessions, "session")}</span>
              </>
            )}
          </p>
          <div className="mt-2.5 flex items-center gap-2.5">
            <Bar value={row.coverage} color={COVERAGE_COLOR} className="h-1.5 flex-1" />
            <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold tabular-nums text-[var(--rs-ink-soft)]">{row.coverage}% covered</span>
          </div>
          {row.started && v1 && (
            <div className="mt-3 hidden grid-cols-3 gap-3 @[420px]/ch:grid">
              <MetaStat
                icon={<Icon name="metrics/tests" size={14} />}
                value={row.answers ? `${row.answers.correct}/${row.answers.answered}` : "—"}
                caption="Answers right"
              />
              <MetaStat
                icon={<Icon name="metrics/chapters-completed" size={14} />}
                value={row.outcomes ? `${row.outcomes.mastered}/${row.outcomes.total}` : "—"}
                caption="Outcomes met"
              />
              <MetaStat
                icon={<Icon name="subject-card-stats/stat-latest-activity" size={14} />}
                value={row.updatedAt ? relativeDay(row.updatedAt) : "—"}
                caption="Last active"
              />
            </div>
          )}
          {row.started && !v1 && (
            <div className="mt-3 hidden grid-cols-3 gap-3 @[420px]/ch:grid">
              <MetaStat icon={<Icon name="subject-card-stats/stat-sessions" size={14} />} value={row.sessions} caption="Sessions Done" />
              <MetaStat icon={<Icon name="session-content/time" size={14} />} value={row.minutes != null ? formatMinutes(row.minutes) : "—"} caption="Time Spent" />
              <MetaStat
                icon={<Icon name="subject-card-stats/stat-latest-activity" size={14} />}
                value={row.updatedAt ? relativeDay(row.updatedAt) : "—"}
                caption="Last Analysed"
              />
            </div>
          )}
        </div>

        {/* The chevron lines up with the ring itself (56px), not the ring and its "Mastery" label together, so it sits
            level with the ring pointing either way. */}
        <div className="flex items-start gap-2 self-center">
          <Ring
            value={row.mastery}
            color={row.started ? tone.accent : "var(--rs-ink-soft)"}
            size={56}
            stroke={5}
            label="Mastery"
            valueClassName="text-[12.5px]"
          >
            {/* No answered skill yet: nothing measured, so no figure (not a 0% that reads as failing). */}
            {v1 && !measured ? <span className="text-[13px] font-bold text-[var(--rs-ink-soft)]">—</span> : undefined}
          </Ring>
          <span className="flex h-14 w-5 items-center justify-center">
            {expandable && (
              <TintIcon
                name="actions/dropdown"
                color="var(--rs-ink-soft)"
                size={14}
                className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
              />
            )}
          </span>
        </div>
      </button>

      {expandable && (
        <Reveal open={open} print={false}>
          <div id={panelId} className="rc-legacy border-t px-4 pb-4 pt-1" style={{ borderColor: tone.edge, background: `linear-gradient(180deg, ${tone.wash[1]}, #fff)` }}>
            {v1 ? <ChapterSkills row={row} /> : <ChapterAnalysis ch={row.chapter} evo={row.evo} chapterKey={row.key} ui={analysisUi} />}
          </div>
        </Reveal>
      )}
    </motion.li>
  );
}

/** A chapter's skills at their levels, what to keep practising, and its learning outcomes (all the backend's). */
function ChapterSkills({ row }: { row: ChapterRowModel }) {
  const practise = row.skills.filter((k) => k.status === "keep_practising" || k.due);
  const help = row.skills.filter((k) => k.needs_adult_support);
  const outcomes = row.chapter.outcomes ?? [];
  return (
    <div className="flex flex-col gap-4 pt-3">
      {(practise.length > 0 || help.length > 0) && (
        <div className="rounded-xl border border-[var(--rs-line)] bg-white px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--rs-ink)]">
          {practise.length > 0 && (
            <p><b>Keep practising:</b> {practise.map((k) => k.title).join(", ")}</p>
          )}
          {help.length > 0 && (
            <p className={practise.length > 0 ? "mt-1" : ""}><b>Could use an adult&apos;s help:</b> {help.map((k) => k.title).join(", ")}</p>
          )}
        </div>
      )}
      {row.chapter.help && row.answers && row.answers.correct > 0 && <IndependenceBar help={row.chapter.help} />}
      {row.skills.length > 0 && (
        <div>
          <h5 className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--rs-ink-soft)]">Skills</h5>
          <ul className="mt-2 flex flex-col divide-y divide-[var(--rs-line)] rounded-xl border border-[var(--rs-line)] bg-white">
            {row.skills.map((k) => (
              <li key={k.component_id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="min-w-0 text-[13px] text-[var(--rs-ink)]">{k.title}</span>
                <SkillLevelChip level={k.level} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {outcomes.length > 0 && (
        <div>
          <h5 className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--rs-ink-soft)]">Learning outcomes</h5>
          <ul className="mt-2 flex flex-col gap-1.5">
            {outcomes.map((o) => (
              <li key={o.code} className="flex items-start gap-2 text-[13px] leading-snug text-[var(--rs-ink)]">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
                  style={o.mastered ? { background: BAND_TONES.Advanced.tint, color: BAND_TONES.Advanced.ink } : { background: "var(--rs-track)", color: "transparent" }}
                >
                  ✓
                </span>
                <span>
                  {o.title}
                  <span className="sr-only">{o.mastered ? " (mastered)" : " (not yet)"}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
