"use client";

import React from "react";
import Link from "next/link";
import { formatDuration } from "../../utils/homeMetrics";
import { BAND_TONES, masteryBand, subjectIcon, type MasteryBand } from "../../utils/subjectVisuals";
import type { LoadState, SubjectSummary } from "../../hooks/useParentHomeData";
import { GLASS, ICON, LIFT, MaskIcon } from "./theme";
import { GlassSkeleton } from "../loader/GlassSkeleton";

export function subjectStatus(item: SubjectSummary): MasteryBand {
  const started = item.mastery !== null || !!item.sessions || !!item.chapters?.started;
  return masteryBand(item.mastery, started);
}

export function SubjectOverview({
  studentId,
  state,
  items,
}: {
  studentId: string;
  state: LoadState;
  items: SubjectSummary[];
}) {
  return (
    <section aria-label="Subject Overview" className={`rounded-2xl p-5 ${GLASS}`}>
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--pp-mint)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
          <img src={ICON("subject_overview_icon")} alt="" width={22} height={22} />
        </span>
        <div>
          <h3 className="text-[17px] font-bold text-[var(--pp-ink)]">Subject Overview</h3>
          <p className="text-[12px] text-[var(--pp-ink-soft)]">Click any subject to explore detailed chapter-level progress</p>
        </div>
      </header>

      {state === "error" ? (
        <p className="mt-5 rounded-xl border border-dashed border-[var(--pp-line)] p-6 text-center text-[13px] text-[var(--pp-ink-soft)]">
          Subjects aren&apos;t available right now.
        </p>
      ) : state === "ready" && items.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-[var(--pp-line)] p-6 text-center text-[13px] text-[var(--pp-ink-soft)]">
          No subjects yet. They&apos;ll appear here once your child starts learning.
        </p>
      ) : (
        <ul className="-mx-5 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4">
          {state === "loading"
            ? [0, 1, 2, 3].map((i) => (
                <li key={i} className="w-[78%] shrink-0 snap-start md:w-auto">
                  <GlassSkeleton className="h-[190px] rounded-2xl" />
                </li>
              ))
            : items.map((item) => (
                <li key={item.subject} className="w-[78%] shrink-0 snap-start md:w-auto">
                  <SubjectCard studentId={studentId} item={item} />
                </li>
              ))}
        </ul>
      )}
    </section>
  );
}

export function SubjectCard({ studentId, item }: { studentId: string; item: SubjectSummary }) {
  const status = subjectStatus(item);
  const mastery = item.mastery ?? 0;
  const loading = item.state === "loading";
  // Every colour on the card follows the mastery band; grey while loading.
  const tone = BAND_TONES[loading ? "Not started" : status];

  return (
    <Link
      href={`/parent/${studentId}/subject/${encodeURIComponent(item.subject)}`}
      aria-label={`${item.subject}: ${loading ? "loading" : `${status}, ${mastery}% mastery`}. View details`}
      className={`group block h-full rounded-2xl border p-4 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_22px_-16px_rgba(19,41,61,0.25)] ${LIFT} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pp-green)]`}
      // Tinted glass: the band's wash, slightly see-through.
      style={{ background: `linear-gradient(180deg, ${tone.wash[0]}D9, ${tone.wash[1]}B3)`, borderColor: tone.edge }}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors" style={{ background: tone.tint }}>
          <MaskIcon src={subjectIcon(item.subject)} color={tone.accent} size={20} />
        </span>
        {/* Chip beside the name when there's room, under it otherwise. */}
        <div className="min-w-0 flex-1 2xl:flex 2xl:items-center 2xl:justify-between 2xl:gap-2">
          <p title={item.subject} className="truncate text-[14.5px] font-bold text-[var(--pp-ink)]">{item.subject}</p>
          {!loading && (
            <span className="mt-0.5 inline-block shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold 2xl:mt-0" style={{ background: tone.tint, color: tone.ink }}>
              {status}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-[13px] text-[var(--pp-ink-soft)]">Mastery</span>
        {loading ? (
          <GlassSkeleton className="h-4 w-10 rounded" />
        ) : (
          <span className="text-[16px] font-bold" style={{ color: tone.ink }}>{mastery}%</span>
        )}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-inset ring-black/[0.03]">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${loading ? 0 : mastery}%`, background: tone.accent }} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-1.5">
        <Stat label="Sessions" value={loading ? null : String(item.sessions ?? 0)} />
        <Stat label="Study time" value={loading || item.minutes === null ? null : formatDuration(item.minutes)} />
        <Stat
          label="Chapters"
          value={loading ? null : item.chapters ? `${item.chapters.started}/${item.chapters.total}` : "—"}
        />
      </dl>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-white/90 bg-white/60 px-1 py-2 text-center">
      <dt className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.04em] text-[var(--pp-ink-soft)]">{label}</dt>
      <dd className="mt-1 text-[13px] font-bold text-[var(--pp-ink)]">
        {value ?? <GlassSkeleton className="mx-auto h-3.5 w-8 rounded" />}
      </dd>
    </div>
  );
}
