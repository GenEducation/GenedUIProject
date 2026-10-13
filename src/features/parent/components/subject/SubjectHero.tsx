"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, BookOpen, Clock3, Sparkles } from "lucide-react";
import { BAND_TONES, subjectIcon } from "@/components/report-card/subjectVisuals";
import { ringArc } from "@/components/report-card/utils";
import { GlassSkeleton } from "../loader/GlassSkeleton";
import { MaskIcon } from "../home/theme";
import { BAND_SCALE, bandOf, type Phrase } from "./insights";
import { BandChip, PhraseText } from "./parts";

/** Display values; null while loading. */
export interface HeroStats {
  chapters: string | null;
  sessions: string | null;
  time: string | null;
}

export function SubjectHero({
  studentId,
  subject,
  childName,
  mastery,
  loading,
  sentence,
  stats,
}: {
  studentId: string;
  subject: string;
  childName: string;
  mastery: number | null;
  loading: boolean;
  sentence: Phrase | null;
  stats: HeroStats;
}) {
  const band = mastery === null ? "Not started" : bandOf(mastery);
  const tone = BAND_TONES[loading ? "Not started" : band];

  return (
    <section
      aria-label={`${subject} summary`}
      className="relative overflow-hidden rounded-[28px] border p-5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_40px_-26px_rgba(19,41,61,0.35)] sm:p-7"
      style={{ background: `linear-gradient(135deg, ${tone.wash[0]}F2 0%, rgba(255,255,255,0.7) 55%, ${tone.wash[1]}CC 100%)`, borderColor: tone.edge }}
    >

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/parent/${studentId}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/90 bg-white/70 px-3.5 py-1.5 text-[13px] font-semibold text-[var(--pp-ink)] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pp-green)]"
        >
          <ArrowLeft size={15} /> All subjects
        </Link>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--pp-ink-soft)]">Subject report</p>
      </div>

      <div className="relative mt-5 grid gap-6 md:grid-cols-[auto_1fr] md:items-center md:gap-8">
        <MasteryRing score={loading ? null : mastery} accent={tone.accent} track={tone.tint} loading={loading} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: tone.tint }}>
              <MaskIcon src={subjectIcon(subject)} color={tone.accent} size={24} />
            </span>
            <h1 className="text-[28px] font-extrabold leading-none tracking-[-0.02em] text-[var(--pp-ink)] sm:text-[34px]">{subject}</h1>
            {!loading && <BandChip band={band} />}
          </div>
          {loading || !sentence ? (
            <div className="mt-4 space-y-2">
              <GlassSkeleton className="h-4 w-[85%] rounded" />
              <GlassSkeleton className="h-4 w-[60%] rounded" />
            </div>
          ) : (
            <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-[var(--pp-ink-soft)] sm:text-[17px]">
              <PhraseText phrase={sentence} />
            </p>
          )}

          <dl className="mt-5 grid grid-cols-3 gap-2 sm:max-w-[480px]">
            <Stat icon={BookOpen} label="Chapters" value={stats.chapters} hint="started" />
            <Stat icon={Sparkles} label="Sessions" value={stats.sessions} hint="completed" />
            <Stat icon={Clock3} label="Time" value={stats.time} hint="studied" />
          </dl>
        </div>
      </div>

      <ScaleStrip score={loading ? null : mastery} childName={childName} />
    </section>
  );
}

function MasteryRing({ score, accent, track, loading }: { score: number | null; accent: string; track: string; loading: boolean }) {
  const reduce = useReducedMotion();
  const r = 54;
  const { circ, offset } = ringArc(r, score ?? 0);
  return (
    <div className="relative mx-auto h-[148px] w-[148px] shrink-0 md:mx-0">
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="66" cy="66" r={r} fill="rgba(255,255,255,0.75)" stroke={track} strokeWidth="12" />
        {score !== null && (
          <motion.circle
            cx="66" cy="66" r={r} fill="none" stroke={accent} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circ}
            initial={reduce ? false : { strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {loading ? (
          <GlassSkeleton className="h-9 w-14 rounded-lg" />
        ) : (
          <>
            <p className="text-[40px] font-extrabold leading-none tracking-[-0.03em] text-[var(--pp-ink)] tabular-nums">
              {score ?? "—"}
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--pp-ink-soft)]">
              {score === null ? "No score yet" : "out of 100"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof BookOpen; label: string; value: string | null; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/90 bg-white/65 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--pp-ink-soft)]">
        <Icon size={12} strokeWidth={2.4} /> {label}
      </dt>
      <dd className="mt-1 flex items-baseline gap-1">
        {value === null ? (
          <GlassSkeleton className="h-5 w-10 rounded" />
        ) : (
          <>
            <span className="whitespace-nowrap text-[16px] font-extrabold text-[var(--pp-ink)] tabular-nums sm:text-[18px]">{value}</span>
            <span className="hidden text-[11px] text-[var(--pp-ink-soft)] sm:inline">{hint}</span>
          </>
        )}
      </dd>
    </div>
  );
}

/**
 * The one scale the whole page uses, with the child's position pinned on it,
 * so "Proficient" means the same thing in every section below.
 */
function ScaleStrip({ score, childName }: { score: number | null; childName: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative mt-7 rounded-2xl border border-white/90 bg-white/55 px-4 pb-3 pt-4 sm:px-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--pp-ink-soft)]">How to read the scores</p>
      <div className="relative mt-7">
        {score !== null && (
          <motion.div
            className="absolute -top-6 z-10 -translate-x-1/2"
            initial={reduce ? false : { left: "0%", opacity: 0 }}
            animate={{ left: `${Math.min(96, Math.max(4, score))}%`, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            <span className="flex flex-col items-center">
              <span className="whitespace-nowrap rounded-full bg-[var(--pp-ink)] px-2 py-0.5 text-[10.5px] font-bold text-white">
                {childName} · {score}
              </span>
              <span className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-[var(--pp-ink)]" />
            </span>
          </motion.div>
        )}
        <div className="flex h-3 overflow-hidden rounded-full">
          {BAND_SCALE.map((z, i) => (
            <span
              key={z.band}
              className={i > 0 ? "border-l-2 border-white" : ""}
              style={{ width: `${z.to - z.from}%`, background: BAND_TONES[z.band].accent, opacity: score === null || bandOf(score) === z.band ? 1 : 0.35 }}
            />
          ))}
        </div>
        <div className="mt-2 hidden text-[11px] leading-tight sm:flex">
          {BAND_SCALE.map((z) => (
            <span key={z.band} className="min-w-0 pr-1" style={{ width: `${z.to - z.from}%` }}>
              <span className="block truncate font-bold" style={{ color: BAND_TONES[z.band].ink }}>{z.band}</span>
              <span className="block text-[var(--pp-ink-soft)] tabular-nums">{z.from}{z.to === 100 ? "+" : `–${z.to - 1}`}</span>
            </span>
          ))}
        </div>
        {/* phones: the four bands as a 2×2 legend, since the segments are too narrow to label */}
        <ul className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] sm:hidden">
          {BAND_SCALE.map((z) => (
            <li key={z.band} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: BAND_TONES[z.band].accent }} />
              <span className="font-bold" style={{ color: BAND_TONES[z.band].ink }}>{z.band}</span>
              <span className="text-[var(--pp-ink-soft)] tabular-nums">{z.from}{z.to === 100 ? "+" : `–${z.to - 1}`}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
