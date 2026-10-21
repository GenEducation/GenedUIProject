"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { ChapterSkill, ReportCardUI } from "../types";
import { relativeDay, type ChapterRowModel, type ChapterStatus } from "../selectors";
import { BAND_TONES } from "../subjectVisuals";
import { ChapterAnalysis } from "../parts/ChapterAnalysis";
import { Reveal } from "../parts/Reveal";
import { TintIcon } from "./icons";
import { FOCUS_RING, SkillLevelChip, plural } from "./primitives";
import { formatMinutes } from "./SubjectPreview";
import { IndependenceBar } from "./SectionCards";

const STATUS_TONE: Record<ChapterStatus, { bg: string; fg: string }> = {
  Completed: { bg: BAND_TONES.Advanced.tint, fg: BAND_TONES.Advanced.ink },
  "In progress": { bg: BAND_TONES.Approaching.tint, fg: BAND_TONES.Approaching.ink },
  "Not started": { bg: BAND_TONES["Not started"].tint, fg: BAND_TONES["Not started"].ink },
};

/** One chapter. A chapter not started is a single quiet line. A started one reads top to bottom: what it is and where it
 *  stands (title, status, last active, time), one row of figures (progress through its steps, mastery, answers right,
 *  outcomes met), and what's inside (its skills and outcomes, or an older record's learning arc and session report). */
export function ChapterRow({ row, ui, index }: { row: ChapterRowModel; ui: ReportCardUI; index: number }) {
  const { tone } = row;
  const expandKey = `${row.key}::open`;
  const open = ui.isExpOpen(expandKey);
  // The new backend's chapter: it knows the chapter's steps (the old records never did).
  const v1 = row.steps != null;
  const measured = row.skills.some((k) => k.level !== "not_started");
  const expandable = row.started && (v1 ? row.skills.length > 0 || row.outcomes != null : true);
  const status = STATUS_TONE[row.status];
  const panelId = `rc-ch-${index}`;
  // Opening a chapter is already a deliberate click, so its learning arc (or,
  // before there is one, its session report) starts open; toggling closes it.
  const primaryKey = `${row.key}::${row.evo ? "arc" : "report"}`;
  const analysisUi: ReportCardUI = { ...ui, isExpOpen: (k) => (k === primaryKey ? !ui.isExpOpen(k) : ui.isExpOpen(k)) };
  const enter = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: Math.min(index, 8) * 0.035 } };

  if (!row.started) {
    return (
      <motion.li {...enter} className="flex items-center gap-3.5 rounded-2xl border border-dashed border-[var(--rs-line-strong)] px-4 py-3">
        <Num n={row.n} bg="var(--rs-surface-2)" fg="var(--rs-ink-soft)" small />
        <h4 className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[var(--rs-ink-soft)]">{row.title}</h4>
        <span className="shrink-0 text-[12px] font-medium text-[var(--rs-ink-soft)]">Not started</span>
      </motion.li>
    );
  }

  // The quiet line under the title: when it was last worked on and for how long.
  const meta: string[] = [];
  if (row.updatedAt) meta.push(v1 ? `Active ${relativeDay(row.updatedAt).toLowerCase()}` : `Analysed ${relativeDay(row.updatedAt).toLowerCase()}`);
  if (row.minutes != null && row.minutes > 0) meta.push(v1 ? `≈ ${formatMinutes(row.minutes)} studied` : `${formatMinutes(row.minutes)} studied`);
  if (!v1) meta.push(plural(row.sessions, "session"));

  // Three figures, each a label, a value and what it means in words.
  const masteryTile: Tile = v1 && !measured
    ? { label: "Mastery", value: "—", caption: "Not measured" }
    : { label: "Mastery", value: `${row.mastery}%`, caption: row.band, color: tone.ink, accent: tone.accent, meter: row.mastery };
  const steps = row.steps;
  const finished = row.status === "Completed";
  const progressTile: Tile = {
    label: "Progress",
    value: `${row.coverage}%`,
    caption: steps && steps.total > 0
      ? finished ? `All ${steps.total} steps` : `Step ${Math.min(steps.done + 1, steps.total)} of ${steps.total}`
      : finished ? "Completed" : "Covered",
    meter: row.coverage,
    done: finished,
  };
  const tiles: Tile[] = v1
    ? [
        progressTile,
        masteryTile,
        row.answers && row.answers.answered > 0
          ? { label: "Answers", value: `${row.answers.correct}/${row.answers.answered}`, caption: "right", meter: Math.round((row.answers.correct / row.answers.answered) * 100) }
          : { label: "Answers", value: "—", caption: "None yet" },
        row.outcomes
          ? { label: "Outcomes", value: `${row.outcomes.mastered}/${row.outcomes.total}`, caption: "met", meter: Math.round((row.outcomes.mastered / row.outcomes.total) * 100) }
          : { label: "Outcomes", value: "—", caption: "None set" },
      ]
    : [progressTile, masteryTile];
  const toPractise = row.skills.filter((k) => k.due || k.status === "keep_practising" || k.needs_adult_support).length;

  return (
    <motion.li
      {...enter}
      className="@container/ch overflow-hidden rounded-2xl border border-[var(--rs-line)] bg-white transition-[box-shadow,border-color] hover:border-[var(--rs-line-strong)] hover:shadow-[0_14px_30px_-24px_rgba(18,45,48,0.5)]"
      style={{ borderColor: open ? "var(--rs-line-strong)" : undefined }}
    >
      {/* eslint-disable-next-line no-restricted-syntax -- disclosure header for a composite chapter card */}
      <button
        type="button"
        disabled={!expandable}
        onClick={() => ui.toggleExp(expandKey)}
        aria-expanded={expandable ? open : undefined}
        aria-controls={expandable ? panelId : undefined}
        className={`group block w-full p-4 text-left disabled:cursor-default @[480px]/ch:p-5 ${FOCUS_RING}`}
      >
        {/* 1. What the chapter is, and where it stands */}
        <div className="flex items-start gap-3.5">
          <Num n={row.n} bg={tone.tint} fg={tone.ink} />
          <div className="min-w-0 flex-1 pt-0.5">
            <h4 className="text-[15.5px] font-bold leading-snug text-[var(--rs-ink)]">{row.title}</h4>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[var(--rs-ink-soft)]">
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: status.bg, color: status.fg }}>{row.status}</span>
              {row.revisiting && (
                <span className="rounded-full bg-[var(--rs-surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--rs-ink-soft)]">Revisiting</span>
              )}
              {meta.map((m) => (
                <React.Fragment key={m}>
                  <span aria-hidden className="text-[var(--rs-line-strong)]">•</span>
                  <span className="whitespace-nowrap">{m}</span>
                </React.Fragment>
              ))}
            </p>
          </div>
        </div>

        {/* 2. How far through it, and how it went: one row of figures (two by two on a narrow card) */}
        <dl
          className={`mt-4 grid gap-px overflow-hidden rounded-xl border border-[var(--rs-line)] bg-[var(--rs-line)] ${tiles.length === 4 ? "grid-cols-2 @[520px]/ch:grid-cols-4" : "grid-cols-2"}`}
        >
          {tiles.map((t) => <StatTile key={t.label} tile={t} />)}
        </dl>

        {/* 3. What's inside */}
        {expandable && (
          <span className="mt-3 flex items-center justify-between gap-3 text-[12.5px]">
            <span className="font-semibold" style={{ color: toPractise > 0 ? BAND_TONES.Approaching.ink : "var(--rs-ink-soft)" }}>
              {toPractise > 0 ? `${plural(toPractise, "skill")} to practise` : v1 ? `${plural(row.skills.length, "skill")}` : ""}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--rs-brand)] group-hover:underline">
              {open ? "Hide details" : v1 ? "Skills & outcomes" : "Session details"}
              <TintIcon name="actions/dropdown" color="currentColor" size={15} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </span>
          </span>
        )}
      </button>

      {expandable && (
        <Reveal open={open} print={false}>
          <div id={panelId} className="rc-legacy border-t border-[var(--rs-line)] bg-[var(--rs-surface-2)] px-4 pb-4 pt-1 @[480px]/ch:px-5">
            {v1 ? <ChapterSkills row={row} /> : <ChapterAnalysis ch={row.chapter} evo={row.evo} chapterKey={row.key} ui={analysisUi} />}
          </div>
        </Reveal>
      )}
    </motion.li>
  );
}

type Tile = { label: string; value: string; caption: string; color?: string; accent?: string; meter?: number; done?: boolean };

/** A figure with its label above and its meaning below, and a thin meter where it is a share. */
function StatTile({ tile }: { tile: Tile }) {
  return (
    <div className="min-w-0 bg-[var(--rs-surface-2)] px-3 py-2.5 @[480px]/ch:px-4 @[480px]/ch:py-3">
      <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--rs-ink-soft)]">
        {tile.label}
        {tile.done && <TintIcon name="marks/check" color="var(--rs-brand)" size={12} />}
      </dt>
      <dd className="mt-1 text-[19px] font-extrabold leading-none tabular-nums" style={{ color: tile.color ?? "var(--rs-ink)" }}>{tile.value}</dd>
      {tile.meter != null && (
        <dd className="mt-2 h-1 overflow-hidden rounded-full bg-[#D5E3DF]" aria-hidden>
          <motion.span
            className="block h-full rounded-full"
            style={{ background: tile.accent ?? "var(--rs-brand)" }}
            initial={{ width: 0 }}
            animate={{ width: `${tile.meter}%` }}
            transition={{ duration: 0.7, ease: EASE }}
          />
        </dd>
      )}
      <dd className="mt-1.5 text-[11.5px] leading-tight text-[var(--rs-ink-soft)]">{tile.caption}</dd>
    </div>
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

function Num({ n, bg, fg, small = false }: { n: number; bg: string; fg: string; small?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold tabular-nums ${small ? "h-8 w-8 text-[13px]" : "h-10 w-10 text-[16px]"}`}
      style={{ background: bg, color: fg }}
    >
      {n}
    </span>
  );
}

/** A chapter's skills (with what to practise flagged on each), how its right answers split, and its outcomes. */
function ChapterSkills({ row }: { row: ChapterRowModel }) {
  const outcomes = row.chapter.outcomes ?? [];
  const met = outcomes.filter((o) => o.mastered).length;
  return (
    <div className="flex flex-col gap-4 pt-3">
      {row.chapter.help && row.answers && row.answers.correct > 0 && (
        <div className="rounded-xl border border-[var(--rs-line)] bg-white px-3.5 py-3">
          <IndependenceBar help={row.chapter.help} />
        </div>
      )}
      <div className="grid gap-4 @[560px]/ch:grid-cols-2">
        {row.skills.length > 0 && (
          <div className="min-w-0">
            <Eyebrow>Skills</Eyebrow>
            <SkillList skills={row.skills} />
          </div>
        )}
        {outcomes.length > 0 && (
          <div className="min-w-0">
            <Eyebrow>Learning outcomes · {met} of {outcomes.length} met</Eyebrow>
            <ul className="mt-2 flex flex-col gap-2 rounded-xl border border-[var(--rs-line)] bg-white px-3.5 py-3">
              {outcomes.map((o) => (
                <li key={o.code} className="flex items-start gap-2.5 text-[13px] leading-snug text-[var(--rs-ink)]">
                  <span
                    aria-hidden
                    className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                    style={o.mastered ? { background: BAND_TONES.Advanced.accent } : { border: "1.5px solid var(--rs-line-strong)" }}
                  >
                    {o.mastered && <Check size={11} strokeWidth={3} color="#fff" />}
                  </span>
                  <span className={o.mastered ? "" : "text-[var(--rs-ink-soft)]"}>
                    {o.title}
                    <span className="sr-only">{o.mastered ? " (met)" : " (not yet)"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <h5 className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[var(--rs-ink-soft)]">{children}</h5>;
}

/** Skills at their levels, each with what the backend flags on it: practise again, due a revisit, an adult's help. */
export function SkillList({ skills }: { skills: ChapterSkill[] }) {
  return (
    <ul className="mt-2 flex flex-col divide-y divide-[var(--rs-line)] rounded-xl border border-[var(--rs-line)] bg-white">
      {skills.map((k) => {
        const flags = [
          k.due ? "Revisit due" : k.status === "keep_practising" ? "Keep practising" : null,
          k.needs_adult_support ? "Could use an adult's help" : null,
        ].filter(Boolean);
        return (
          <li key={k.component_id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <div className="min-w-0 leading-tight">
              <p className="text-[13px] text-[var(--rs-ink)]">{k.title}</p>
              {flags.length > 0 && (
                <p className="mt-0.5 text-[11.5px] font-semibold" style={{ color: BAND_TONES.Approaching.ink }}>{flags.join(" · ")}</p>
              )}
            </div>
            <SkillLevelChip level={k.level} />
          </li>
        );
      })}
    </ul>
  );
}
