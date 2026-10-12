"use client";

import { motion, useTransform } from "framer-motion";
import { Reveal, useRange, type Progress } from "../primitives";

/** Closing title card. The whole film is the join button, so the CTA here is a visual cue. */
export function SceneClose({ p }: { p: Progress }) {
  const glow = useRange(p, [0.05, 0.6]);
  const glowScale = useTransform(glow, [0, 1], [0.6, 1.1]);
  return (
    <div className="gc-title-scene gc-close">
      <motion.div className="gc-open-glow gc-close-glow" style={{ opacity: glow, scale: glowScale }} aria-hidden />
      <div className="gc-title-copy">
        <Reveal p={p} at={[0, 0.14]} y={0.6} scale={0.92}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand art in the film */}
          <img src="/brand/gened-logo.png" alt="GenEd" className="gc-film-logo" />
        </Reveal>
        <Reveal p={p} at={[0.04, 0.2]} y={1.2}>
          <h2 className="gc-title-xl">Their journey.</h2>
        </Reveal>
        <Reveal p={p} at={[0.14, 0.32]} y={1.2}>
          <h2 className="gc-title-xl">
            <em>Your front-row seat.</em>
          </h2>
        </Reveal>
        <Reveal p={p} at={[0.3, 0.46]} y={0.8} className="gc-close-cta">
          <p>
            Free for the whole pilot · Maths, Science &amp; English · Class 6–9
            <br />
            <b>Only the first 100 families</b> · Access starts 16 October
          </p>
          <span className="gc-btn gc-btn-citron gc-btn-lg gc-close-btn">
            Tap to join the free pilot
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </Reveal>
      </div>
    </div>
  );
}
