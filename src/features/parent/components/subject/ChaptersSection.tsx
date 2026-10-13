"use client";

import React, { useState } from "react";
import { Library } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BAND_TONES } from "@/components/report-card/subjectVisuals";
import { formatDuration } from "../../utils/homeMetrics";
import type { Section } from "../../hooks/useSubjectInsights";
import { GlassSkeleton } from "../loader/GlassSkeleton";
import { bandOf, cap, type ChapterInsight } from "./insights";
import { BandChip, EmptyNote, SectionCard } from "./parts";

export function ChaptersSection({ section, childName }: { section: Section<ChapterInsight[]>; childName: string }) {
  const [showRest, setShowRest] = useState(false);
  const rows = section.data;
  const started = rows.filter((r) => r.started);
  const notStarted = rows.filter((r) => !r.started);

  const lede =
    section.state === "ready" && rows.length > 0
      ? `${cap(childName)} has started ${started.length} of ${rows.length} chapter${rows.length === 1 ? "" : "s"}. “Covered” is how much of a chapter has been studied; the level is how well it's understood.`
      : "Each chapter in the syllabus, with how much has been covered and how well it's understood.";

  return (
    <SectionCard id="chapters" icon={Library} eyebrow="Chapters" title="Chapter by chapter" lede={lede}>
      {section.state === "loading" ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <GlassSkeleton key={i} className="h-[72px] rounded-2xl" />)}</div>
      ) : section.state === "error" ? (
        <EmptyNote>Chapter progress isn&apos;t available right now.</EmptyNote>
      ) : rows.length === 0 ? (
        <EmptyNote>No chapters are set up for this subject yet.</EmptyNote>
      ) : (
        <>
          {started.length > 0 ? (
            <ol className="space-y-2">
              {started.map((r) => <ChapterRow key={`${rows.indexOf(r)}-${r.title}`} row={r} n={rows.indexOf(r) + 1} />)}
            </ol>
          ) : (
            <EmptyNote>No chapters started yet.</EmptyNote>
          )}
          {notStarted.length > 0 && (
            <div className="mt-4">
              <Button variant="secondary" size="sm" aria-expanded={showRest} onClick={() => setShowRest((s) => !s)}>
                {showRest ? "Hide" : "Show"} {notStarted.length} chapter{notStarted.length === 1 ? "" : "s"} not started yet
              </Button>
              {showRest && (
                <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                  {notStarted.map((r) => (
                    <li key={`${rows.indexOf(r)}-${r.title}`} className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--pp-line)] bg-white/40 px-3.5 py-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E8EEEC] text-[11px] font-bold text-[var(--pp-ink-soft)] tabular-nums">
                        {rows.indexOf(r) + 1}
                      </span>
                      <span className="min-w-0 truncate text-[13px] font-semibold text-[var(--pp-ink-soft)]" title={r.title}>{r.title}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

function ChapterRow({ row, n }: { row: ChapterInsight; n: number }) {
  const band = row.mastery === null ? "Not started" : bandOf(row.mastery);
  const tone = BAND_TONES[band];
  const meta = [
    row.sessions > 0 && `${row.sessions} session${row.sessions === 1 ? "" : "s"}`,
    row.minutes > 0 && formatDuration(row.minutes),
  ].filter(Boolean).join(" · ");

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3.5 gap-y-2 rounded-2xl border border-white/90 bg-white/65 px-3.5 py-3 sm:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:px-4">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold tabular-nums"
        style={{ background: tone.tint, color: tone.ink }}
      >
        {n}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-bold text-[var(--pp-ink)]" title={row.title}>{row.title}</span>
        {meta && <span className="mt-0.5 block text-[12px] text-[var(--pp-ink-soft)]">{meta}</span>}
      </span>
      <span className="col-span-3 row-start-2 sm:col-span-1 sm:row-start-1 sm:col-start-3">
        <span className="flex items-center justify-between text-[11px] font-semibold text-[var(--pp-ink-soft)]">
          <span>Covered</span>
          <span className="tabular-nums text-[var(--pp-ink)]">{row.coverage}%</span>
        </span>
        <span className="mt-1 block h-2 overflow-hidden rounded-full bg-[var(--pp-mint)]">
          <span className="block h-full rounded-full bg-[var(--pp-green)] transition-[width] duration-700" style={{ width: `${row.coverage}%` }} />
        </span>
      </span>
      <span className="flex items-center justify-end gap-2 sm:col-start-4 sm:w-[152px]">
        {row.mastery !== null && (
          <span className="text-[16px] font-extrabold tabular-nums" style={{ color: tone.ink }}>{row.mastery}</span>
        )}
        <span className="hidden sm:inline"><BandChip band={band} size="sm" /></span>
      </span>
    </li>
  );
}
