"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";
import { ringArc } from "../utils";
import type { BandTone, MasteryBand } from "../subjectVisuals";
import { MaskIcon } from "../MaskIcon";
import { reportSubjectIcon } from "./icons";

/** Neutral colour for coverage, so it never competes with the mastery band. */
export const COVERAGE_COLOR = "#7C93B8";

/** The white card every screen panel sits on. */
export const CARD =
  "rounded-[20px] border border-[var(--rs-line)] bg-white shadow-[0_1px_2px_rgba(19,41,61,0.04),0_12px_32px_-22px_rgba(19,41,61,0.22)]";

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rs-brand)]";

// ─────────────────────────────────────────────────────────
// RING — circular gauge, value centred inside
// ─────────────────────────────────────────────────────────

export function Ring({
  value, color, size = 56, stroke = 6, label, valueClassName = "text-[13px]", children,
}: {
  value: number;
  color: string;
  size?: number;
  stroke?: number;
  /** Caption under the ring ("Mastery"). */
  label?: string;
  valueClassName?: string;
  /** Replaces the centred percentage. */
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const { circ, offset } = ringArc(r, value);
  const c = size / 2;
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--rs-track)" strokeWidth={stroke} />
          <motion.circle
            cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {children ?? (
            <span className={`font-bold tabular-nums ${valueClassName}`} style={{ color }}>{value}%</span>
          )}
        </div>
      </div>
      {label && <span className="text-[11.5px] font-medium" style={{ color }}>{label}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// BAR — horizontal progress
// ─────────────────────────────────────────────────────────

export function Bar({ value, color, className = "h-2" }: { value: number; color: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-full bg-[var(--rs-track)] ${className}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// BAND CHIP + SUBJECT GLYPH — both coloured by mastery
// ─────────────────────────────────────────────────────────

export function BandChip({ band, tone, small = false }: { band: MasteryBand | string; tone: BandTone; small?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-semibold ${small ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-0.5 text-[11.5px]"}`}
      style={{ background: tone.tint, color: tone.ink }}
    >
      {band}
    </span>
  );
}

export function SubjectGlyph({ subject, tone, size = 48 }: { subject: string; tone: BandTone; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full transition-colors duration-500"
      style={{ width: size, height: size, background: tone.tint }}
    >
      <MaskIcon src={reportSubjectIcon(subject)} color={tone.accent} size={Math.round(size * 0.52)} />
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// SPARKLINE — mastery across sessions
// ─────────────────────────────────────────────────────────

export function Sparkline({
  points, color, width = 140, height = 40,
}: {
  points: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const id = useId().replace(/:/g, "");
  if (points.length < 2) return null;
  const pad = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(max - min, 10);
  const lo = Math.max(0, (min + max) / 2 - span / 2);
  const x = (i: number) => pad + (i * (width - pad * 2)) / (points.length - 1);
  const y = (v: number) => height - pad - ((v - lo) / span) * (height - pad * 2);
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${height} L${x(0).toFixed(1)} ${height} Z`;
  const last = points.length - 1;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden className="block overflow-visible">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${id})`} />
      <motion.path
        d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
      <circle cx={x(last)} cy={y(points[last])} r="2.5" fill={color} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// SMALL BITS
// ─────────────────────────────────────────────────────────

/** Icon + value + caption, the meta columns under subject and chapter rows. */
export function MetaStat({ icon, value, caption }: { icon: React.ReactNode; value: React.ReactNode; caption: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-[1px] shrink-0 text-[var(--rs-ink)]">{icon}</span>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[12.5px] font-semibold text-[var(--rs-ink)]">{value}</div>
        <div className="truncate text-[11px] text-[var(--rs-ink-soft)]">{caption}</div>
      </div>
    </div>
  );
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
