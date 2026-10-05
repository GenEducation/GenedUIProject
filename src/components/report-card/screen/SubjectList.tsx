"use client";

import React from "react";
import { motion } from "framer-motion";
import type { SubjectSummary } from "../selectors";
import { relativeDay } from "../selectors";
import { Icon, TintIcon } from "./icons";
import { BandChip, Bar, CARD, COVERAGE_COLOR, FOCUS_RING, MetaStat, Ring, SubjectGlyph, plural } from "./primitives";

export function SubjectList({
  subjects, active, onSelect, firstName,
}: {
  subjects: SubjectSummary[];
  active: string | null;
  onSelect: (subject: string) => void;
  firstName: string;
}) {
  return (
    <section aria-labelledby="rc-subjects-title" className={`${CARD} @container/list p-4 @[520px]/list:p-5`}>
      <header className="mb-4 flex items-center gap-3 px-1">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--rs-mint)] text-[var(--rs-brand-deep)]">
          <Icon name="metrics/chapters-completed" size={24} />
        </span>
        <div>
          <h2 id="rc-subjects-title" className="text-[19px] font-bold leading-tight text-[var(--rs-ink)]">Subjects &amp; Chapters</h2>
          <p className="text-[13px] text-[var(--rs-ink-soft)]">Tap a subject to preview its chapters and mastery</p>
        </div>
      </header>

      {subjects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--rs-line-strong)] p-6 text-center text-[13.5px] text-[var(--rs-ink-soft)]">
          Subject scores are being built from {firstName}&apos;s sessions. They appear once a chapter session completes.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {subjects.map((s, i) => (
            <motion.li
              key={s.subject}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <SubjectRow summary={s} active={active === s.subject} onSelect={onSelect} />
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SubjectRow({
  summary: s, active, onSelect,
}: {
  summary: SubjectSummary;
  active: boolean;
  onSelect: (subject: string) => void;
}) {
  const { tone } = s;
  return (
    // eslint-disable-next-line no-restricted-syntax -- composite subject row (glyph, bars, rings), not a CTA
    <button
      type="button"
      onClick={() => onSelect(s.subject)}
      aria-pressed={active}
      aria-label={`${s.subject}: ${s.band}, ${s.mastery}% mastery, ${s.coverage}% coverage`}
      className={`group relative block w-full overflow-hidden rounded-2xl border text-left transition-[transform,box-shadow,border-color] duration-300 motion-safe:hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-26px_rgba(19,41,61,0.5)] ${FOCUS_RING}`}
      style={{
        background: `linear-gradient(100deg, ${tone.wash[0]}, ${tone.wash[1]} 65%)`,
        borderColor: active ? tone.accent : tone.edge,
        boxShadow: active ? `0 0 0 1.5px ${tone.accent}, 0 18px 36px -26px rgba(19,41,61,0.5)` : undefined,
      }}
    >
      {/* Band edge */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: tone.accent }} />

      <div className="flex items-start gap-3.5 p-4 pl-5 @[560px]/list:gap-4">
        <SubjectGlyph subject={s.subject} tone={tone} size={52} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="truncate text-[17px] font-bold text-[var(--rs-ink)]">{s.subject}</h3>
            <BandChip band={s.band} tone={tone} />
          </div>
          <p className="mt-0.5 text-[12.5px] text-[var(--rs-ink-soft)]">
            {plural(s.chaptersTotal, "Chapter")}  •  {plural(s.sessions, "Session")}
          </p>

          <div className="mt-2 flex items-center gap-3">
            <span className="w-11 shrink-0 text-[14px] font-bold tabular-nums" style={{ color: tone.ink }}>{s.mastery}%</span>
            <Bar value={s.mastery} color={tone.accent} className="h-2 flex-1 @[560px]/list:max-w-[440px]" />
          </div>

          <div className="mt-3 hidden grid-cols-3 gap-3 @[560px]/list:grid">
            <MetaStat icon={<Icon name="subject-card-stats/stat-chapters" size={16} />} value={s.chaptersCompleted} caption="Chapters Completed" />
            <MetaStat icon={<Icon name="subject-card-stats/stat-sessions" size={15} />} value={s.sessions} caption="Sessions Done" />
            {s.latest ? (
              <MetaStat
                icon={<Icon name="subject-card-stats/stat-latest-activity" size={15} />}
                value={s.latest.chapter}
                caption={<>Latest Activity · {relativeDay(s.latest.at)}</>}
              />
            ) : (
              <MetaStat icon={<Icon name="subject-card-stats/stat-latest-activity" size={15} />} value={`${s.chaptersStarted} started`} caption="Chapters In Progress" />
            )}
          </div>
        </div>

        <div className="hidden items-center gap-4 self-center @[460px]/list:flex">
          <Ring value={s.mastery} color={tone.accent} size={54} stroke={5} label="Mastery" valueClassName="text-[13px]" />
          <Ring value={s.coverage} color={COVERAGE_COLOR} size={54} stroke={5} label="Coverage" valueClassName="text-[13px]" />
        </div>

        <TintIcon
          name="actions/right-arrow"
          color={active ? tone.accent : "var(--rs-ink-soft)"}
          size={14}
          className="self-center transition-transform duration-300 group-hover:translate-x-0.5"
        />
      </div>
    </button>
  );
}
