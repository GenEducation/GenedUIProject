"use client";

import React from "react";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { BAND_TONES, type MasteryBand } from "@/components/report-card/subjectVisuals";
import { GLASS } from "../home/theme";

/** A glass section with an icon, a title, and a one-line plain answer. */
export function SectionCard({
  id,
  icon: Icon,
  eyebrow,
  title,
  lede,
  aside,
  children,
}: {
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  lede?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-24 rounded-[24px] p-5 sm:p-6 ${GLASS}`}>
      <header className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--pp-mint)] text-[var(--pp-green)]">
          <Icon size={21} strokeWidth={2.2} />
        </span>
        {/* on phones the aside wraps under the title instead of squeezing it */}
        <div className="min-w-0 flex-1 basis-[calc(100%-4.25rem)] sm:basis-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--pp-green-deep)]">{eyebrow}</p>
          <h2 id={`${id}-title`} className="mt-0.5 text-[20px] font-extrabold leading-tight tracking-[-0.01em] text-[var(--pp-ink)]">
            {title}
          </h2>
          {lede && <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-[var(--pp-ink-soft)]">{lede}</p>}
        </div>
        {aside && <div className="shrink-0 pl-[3.75rem] sm:pl-0">{aside}</div>}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function BandChip({ band, size = "md" }: { band: MasteryBand; size?: "sm" | "md" }) {
  const tone = BAND_TONES[band];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold ${size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11.5px]"}`}
      style={{ background: tone.tint, color: tone.ink }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.accent }} />
      {band}
    </span>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-[var(--pp-line)] bg-white/40 px-5 py-8 text-center text-[13.5px] leading-relaxed text-[var(--pp-ink-soft)]">
      {children}
    </p>
  );
}

/** Highlighted names inside a generated sentence. */
export function PhraseText({ phrase }: { phrase: { text: string; em?: boolean }[] }) {
  return (
    <>
      {phrase.map((p, i) =>
        p.em ? (
          <strong key={i} className="font-bold text-[var(--pp-ink)]">{p.text}</strong>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        ),
      )}
    </>
  );
}

/** Change in points: green up, pink down, grey flat. */
export function DeltaPill({ delta, large = false }: { delta: number; large?: boolean }) {
  const up = delta > 0;
  const flat = delta === 0;
  const tone = flat ? BAND_TONES["Not started"] : up ? BAND_TONES.Advanced : BAND_TONES.Developing;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-extrabold tabular-nums ${large ? "px-3 py-1.5 text-[14px]" : "px-2 py-0.5 text-[11.5px]"}`}
      style={{ background: up ? "#E7F4D0" : tone.tint, color: tone.ink }}
      aria-label={flat ? "No change" : `${up ? "Up" : "Down"} ${Math.abs(delta)} points`}
    >
      <Icon size={large ? 16 : 13} strokeWidth={2.6} aria-hidden />
      {flat ? "0" : `${up ? "+" : "−"}${Math.abs(delta)}`}
      {large && <span className="font-semibold"> pts</span>}
    </span>
  );
}
