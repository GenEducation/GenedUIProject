"use client";

import { useRef, type CSSProperties } from "react";
import { useScrollProgress } from "../hooks";

/* Decorative, hand-drawn bits for the Zoovi pages. All aria-hidden: none of them carry copy. */

/** A loose, hand-drawn question mark. */
export function QuestionGlyph({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={`zv-qglyph ${className ?? ""}`} style={style} viewBox="0 0 60 90" aria-hidden="true">
      <path d="M14 26c0-12 8-19 18-19 11 0 18 7 18 16 0 9-6 13-12 17-5 3-8 7-8 14v6" />
      <circle cx="30" cy="78" r="5" />
    </svg>
  );
}

/** Question marks drifting around the hero, which fold down into a single glowing dot as you scroll away. */
export function FloatingQuestions() {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(ref);
  const marks = [
    { x: 4, y: 10, s: 1.1, r: -14, d: 0 },
    { x: 86, y: 4, s: 0.7, r: 12, d: 1.2 },
    { x: 92, y: 62, s: 1.3, r: 18, d: 0.6 },
    { x: -2, y: 70, s: 0.8, r: -8, d: 2 },
    { x: 48, y: -6, s: 0.55, r: 6, d: 1.6 },
    { x: 70, y: 92, s: 0.65, r: -20, d: 0.3 },
  ];
  return (
    <div ref={ref} className="zv-floatq" aria-hidden="true">
      {marks.map((m, i) => (
        <span
          key={i}
          className="zv-floatq__item"
          style={{ ["--x" as string]: `${m.x}%`, ["--y" as string]: `${m.y}%`, ["--s" as string]: m.s, ["--r" as string]: `${m.r}deg`, ["--d" as string]: `${m.d}s` }}
        >
          <QuestionGlyph />
        </span>
      ))}
      <span className="zv-floatq__dot" />
    </div>
  );
}

/** A question mark whose dot sprouts into a seedling as the section scrolls in — "room to grow". */
export function GrowingQuestion({ tone = "forest" }: { tone?: "forest" | "sun" }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(ref);
  return (
    <div ref={ref} className={`zv-grow zv-grow--${tone}`} aria-hidden="true">
      <svg viewBox="0 0 200 300">
        <path className="zv-grow__q" pathLength={1} d="M48 92c0-40 26-62 56-62 33 0 54 22 54 50 0 28-18 40-36 52-14 9-22 20-22 40v16" />
        <path className="zv-grow__stem" pathLength={1} d="M100 262c0-30 2-52 8-76" />
        <path className="zv-grow__leaf zv-grow__leaf--l" d="M104 222c-24-2-44-14-50-36 22-2 42 8 50 36z" />
        <path className="zv-grow__leaf zv-grow__leaf--r" d="M106 200c10-26 32-40 58-38-4 24-26 38-58 38z" />
        <ellipse className="zv-grow__soil" cx="100" cy="266" rx="34" ry="10" />
      </svg>
    </div>
  );
}

/** A drawn underline that writes itself in when its parent `.zv-reveal` arrives. */
export function Scribble({ className }: { className?: string }) {
  return (
    <svg className={`zv-scribble ${className ?? ""}`} viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
      <path d="M4 14c40-8 90-10 140-8 50 2 100 4 152-6" />
    </svg>
  );
}

/** Live-looking voice waveform bars. */
export function Waveform({ bars = 36 }: { bars?: number }) {
  return (
    <div className="zv-wave" aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} style={{ ["--i" as string]: i, ["--h" as string]: (0.25 + 0.75 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23))).toFixed(3) }} />
      ))}
    </div>
  );
}
