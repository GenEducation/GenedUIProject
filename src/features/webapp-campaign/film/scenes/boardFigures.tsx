"use client";

// Whiteboard pieces in the lesson's sketch style: Kalam handwriting, deep-ocean
// ink, citron highlights. Figures "ink in" the way the real board does.

import type { CSSProperties } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { Draw, Ink, useRange, type Progress, type Range } from "../primitives";

/** The step title, handwritten, with the citron squiggle underline. */
export function BoardTitle({ p, at, text }: { p: Progress; at: Range; text: string }) {
  return (
    <div className="gc-b-title">
      <Ink p={p} at={at}>
        <span className="gc-hand">{text}</span>
      </Ink>
      <svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
        <Draw
          p={p}
          at={[at[1] - 0.02, at[1] + 0.08]}
          d="M2 7 C 20 2, 34 11, 52 6 S 86 2, 104 7 S 140 11, 160 5 S 188 4, 198 7"
          fill="none"
          stroke="#B8D63F"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/** Figure 1: a 10×10 hundred-square with 25 squares shaded. */
export function GridFigure({ p, at, fillAt, style }: { p: Progress; at: Range; fillAt: Range; style?: CSSProperties }) {
  const step = (fillAt[1] - fillAt[0]) / 3;
  return (
    <div className="gc-b-fig" style={style}>
      <Ink p={p} at={[at[0], at[0] + 0.03]}>
        <span className="gc-hand gc-b-idx">1</span>
      </Ink>
      <Ink p={p} at={at} className="gc-b-grid">
        {Array.from({ length: 10 }, (_, r) => (
          <GridRow key={r} p={p} r={r} at={[fillAt[0] + Math.min(r, 3) * step, fillAt[0] + (Math.min(r, 3) + 1) * step]} />
        ))}
      </Ink>
      <Ink p={p} at={[fillAt[1] - 0.02, fillAt[1] + 0.1]}>
        <span className="gc-hand gc-b-label">
          25% = <Frac n="25" d="100" /> = <Frac n="1" d="4" />
        </span>
      </Ink>
    </div>
  );
}

function GridRow({ p, r, at }: { p: Progress; r: number; at: Range }) {
  const filled = r < 2 ? 10 : r === 2 ? 5 : 0;
  const t = useRange(p, at, (v) => v);
  return (
    <div className="gc-b-row">
      {Array.from({ length: 10 }, (_, c) => (
        <GridCell key={c} t={t} on={c < filled} c={c} />
      ))}
    </div>
  );
}

function GridCell({ t, on, c }: { t: MotionValue<number>; on: boolean; c: number }) {
  const opacity = useTransform(t, [c / 10, (c + 1) / 10], [0, 1]);
  return <i>{on && <motion.b style={{ opacity }} />}</i>;
}

/** Figure 2: a bar model — ₹540 split into four equal parts, one highlighted. */
export function BarFigure({ p, at, style }: { p: Progress; at: Range; style?: CSSProperties }) {
  const ring = useTransform(p, [at[1], at[1] + 0.02, at[1] + 0.07], [0, 1, 0]);
  return (
    <div className="gc-b-fig" style={style}>
      <motion.span className="gc-b-arrive" style={{ opacity: ring }} />
      <Ink p={p} at={[at[0], at[0] + 0.03]}>
        <span className="gc-hand gc-b-idx">2</span>
      </Ink>
      <Ink p={p} at={at}>
        <span className="gc-hand gc-b-brace">₹540</span>
        <div className="gc-b-bar">
          <span className="gc-b-part gc-b-part-on">₹135</span>
          <span className="gc-b-part">₹135</span>
          <span className="gc-b-part">₹135</span>
          <span className="gc-b-part">₹135</span>
        </div>
        <span className="gc-hand gc-b-label">
          <Frac n="1" d="4" /> of ₹540 = ₹135
        </span>
      </Ink>
    </div>
  );
}

export function Frac({ n, d }: { n: string; d: string }) {
  return (
    <span className="gc-b-frac">
      <span>{n}</span>
      <span>{d}</span>
    </span>
  );
}

/** Round thumbnails of the figures drawn so far, floating at the board's foot. */
export function Filmstrip({ p, count, activeAt }: { p: Progress; count: number; activeAt?: Range }) {
  const a = useRange(p, activeAt ?? [2, 3]);
  const lastScale = useTransform(a, [0, 1], [0.74, 1]);
  const prevScale = useTransform(a, [0, 1], [1, 0.74]);
  return (
    <div className="gc-b-film">
      <span className="gc-b-film-arrow">‹</span>
      {Array.from({ length: count }, (_, i) => {
        const isLast = i === count - 1;
        const isPrev = i === count - 2;
        const scale = activeAt ? (isLast ? lastScale : isPrev ? prevScale : 0.74) : isLast ? 1 : 0.74;
        const opacity = activeAt && isLast ? a : 1;
        return (
          <motion.span key={i} className={`gc-b-thumb gc-b-thumb-${i % 3}`} style={{ scale, opacity }}>
            <i />
          </motion.span>
        );
      })}
      <span className="gc-b-film-arrow">›</span>
    </div>
  );
}
