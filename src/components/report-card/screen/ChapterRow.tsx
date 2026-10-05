"use client";

import React from "react";
import { motion } from "framer-motion";
import type { ReportCardUI } from "../types";
import { relativeDay, type ChapterRowModel, type ChapterStatus } from "../selectors";
import { BAND_TONES } from "../subjectVisuals";
import { ChapterAnalysis } from "../parts/ChapterAnalysis";
import { Reveal } from "../parts/Reveal";
import { Icon, TintIcon } from "./icons";
import { Bar, COVERAGE_COLOR, FOCUS_RING, MetaStat, Ring, plural } from "./primitives";
import { formatMinutes } from "./SubjectPreview";

const STATUS_TONE: Record<ChapterStatus, { bg: string; fg: string }> = {
  Completed: { bg: BAND_TONES.Advanced.tint, fg: BAND_TONES.Advanced.ink },
  "In progress": { bg: BAND_TONES.Approaching.tint, fg: BAND_TONES.Approaching.ink },
  "Not started": { bg: BAND_TONES["Not started"].tint, fg: BAND_TONES["Not started"].ink },
};

/** One chapter: number, status, coverage, mastery ring. Started chapters
 *  expand to the learning arc and session report. */
export function ChapterRow({ row, ui, index }: { row: ChapterRowModel; ui: ReportCardUI; index: number }) {
  const { tone } = row;
  const expandKey = `${row.key}::open`;
  const open = ui.isExpOpen(expandKey);
  const expandable = row.started;
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
      className="overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-[0_14px_30px_-24px_rgba(19,41,61,0.5)]"
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
            {row.minutes != null && <span className="inline-flex items-center gap-1"><Icon name="session-content/time" size={12} />{formatMinutes(row.minutes)}</span>}
            <span>{plural(row.sessions, "session")}</span>
          </p>
          <div className="mt-2.5 flex items-center gap-2.5">
            <Bar value={row.coverage} color={COVERAGE_COLOR} className="h-1.5 flex-1" />
            <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold tabular-nums text-[var(--rs-ink-soft)]">{row.coverage}% covered</span>
          </div>
          {row.started && (
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

        <div className="flex items-center gap-2 self-center">
          <Ring
            value={row.mastery}
            color={row.started ? tone.accent : "var(--rs-ink-soft)"}
            size={56}
            stroke={5}
            label="Mastery"
            valueClassName="text-[12.5px]"
          />
          <span className="w-5">
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
            <ChapterAnalysis ch={row.chapter} evo={row.evo} chapterKey={row.key} ui={analysisUi} />
          </div>
        </Reveal>
      )}
    </motion.li>
  );
}
