"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BAND_TONES } from "@/components/report-card/subjectVisuals";
import { BAND_SCALE, bandOf } from "./insights";

const TRANSITION = { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const, delay: 0.15 };

/**
 * A mastery bar laid over the report-card scale: four faint zones
 * (Developing → Advanced), filled up to the score in the score's own band
 * colour, with a marker at the end. Reads at a glance as both "how much" and
 * "which level".
 */
export function BandTrack({
  score,
  size = "md",
  marker = true,
  label,
}: {
  score: number | null;
  size?: "sm" | "md" | "lg";
  marker?: boolean;
  /** Accessible name; defaults to "{score} out of 100". */
  label?: string;
}) {
  const reduce = useReducedMotion();
  const h = size === "lg" ? "h-3.5" : size === "sm" ? "h-1.5" : "h-2.5";
  const dot = size === "lg" ? 18 : size === "sm" ? 10 : 14;
  const has = score !== null;
  const tone = has ? BAND_TONES[bandOf(score)] : BAND_TONES["Not started"];
  const value = has ? Math.max(0, Math.min(100, score)) : 0;

  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={has ? value : undefined}
      aria-label={label ?? (has ? `${value} out of 100` : "Not assessed yet")}
      className="relative w-full"
      style={{ paddingInline: marker ? dot / 2 : 0 }}
    >
      <div className="relative">
        <div className={`relative ${h} flex overflow-hidden rounded-full ring-1 ring-inset ring-black/[0.03]`}>
          {BAND_SCALE.map((z, i) => (
            <span
              key={z.band}
              className={i > 0 ? "border-l-2 border-white/90" : ""}
              style={{ width: `${z.to - z.from}%`, background: BAND_TONES[z.band].tint, opacity: 0.55 }}
            />
          ))}
          {has && (
            <motion.span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: tone.accent }}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${value}%` }}
              transition={TRANSITION}
            />
          )}
        </div>
        {has && marker && (
          <motion.span
            aria-hidden
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-white shadow-[0_2px_6px_rgba(19,41,61,0.25)]"
            style={{ width: dot, height: dot, borderColor: tone.accent }}
            initial={reduce ? false : { left: "0%" }}
            animate={{ left: `${value}%` }}
            transition={TRANSITION}
          />
        )}
      </div>
    </div>
  );
}
