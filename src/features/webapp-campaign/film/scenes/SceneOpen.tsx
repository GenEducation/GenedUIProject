"use client";

import { motion, useTransform } from "framer-motion";
import { Draw, Reveal, useRange, type Progress } from "../primitives";

const PATH = "M -20 585 C 180 575, 280 520, 420 520 S 640 560, 780 500 S 1000 440, 1240 420";
const STOPS = [
  { x: 150, y: 571, label: "Integers", at: 0.22 },
  { x: 420, y: 520, label: "Ratios", at: 0.36 },
  { x: 700, y: 527, label: "Percentages", at: 0.5 },
  { x: 990, y: 448, label: "Discounts", at: 0.64 },
];

/** Opening: the GenEd logo and the promise, over a learning path drawing itself. */
export function SceneOpen({ p }: { p: Progress }) {
  const glow = useRange(p, [0.1, 0.7]);
  const glowScale = useTransform(glow, [0, 1], [0.7, 1.15]);
  return (
    <div className="gc-title-scene">
      <motion.div className="gc-open-glow" style={{ opacity: glow, scale: glowScale }} aria-hidden />
      <svg className="gc-open-path" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="gc-path-grad" x1="0" x2="1">
            <stop offset="0" stopColor="#075E63" stopOpacity="0" />
            <stop offset="0.35" stopColor="#5FA8A3" />
            <stop offset="1" stopColor="#D9F279" />
          </linearGradient>
        </defs>
        <Draw p={p} at={[0.08, 0.72]} d={PATH} fill="none" stroke="url(#gc-path-grad)" strokeWidth={3} strokeLinecap="round" />
        {STOPS.map((s) => (
          <PathStop key={s.label} p={p} {...s} />
        ))}
      </svg>
      <div className="gc-title-copy">
        <Reveal p={p} at={[0, 0.14]} y={0.6} scale={0.92}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand art in the film */}
          <img src="/brand/gened-logo.png" alt="GenEd" className="gc-film-logo" />
        </Reveal>
        <Reveal p={p} at={[0.1, 0.28]} y={1.2}>
          <h2 className="gc-title-xl">Your child&apos;s own AI tutor.</h2>
        </Reveal>
        <Reveal p={p} at={[0.26, 0.44]} y={1.2}>
          <h2 className="gc-title-xl">
            <em>Patient. Personal. Always there.</em>
          </h2>
        </Reveal>
      </div>
    </div>
  );
}

function PathStop({ p, x, y, label, at }: { p: Progress; x: number; y: number; label: string; at: number }) {
  const t = useRange(p, [at, at + 0.08]);
  const r = useTransform(t, [0, 1], [0, 9]);
  return (
    <motion.g style={{ opacity: t }}>
      <motion.circle cx={x} cy={y} r={r} fill="#082C2F" stroke="#D9F279" strokeWidth={3} />
      <text x={x} y={y - 22} textAnchor="middle" className="gc-path-label">
        {label}
      </text>
    </motion.g>
  );
}
