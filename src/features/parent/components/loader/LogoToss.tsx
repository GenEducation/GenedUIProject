"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CAP_CENTRE,
  createCapToss,
  LETTER_CENTRES,
  LOGO_H,
  LOGO_W,
  prepareCapToss,
  SETTLED_AT,
  SPARKLE_CENTRE,
  type Point,
  type TossFrame,
} from "./capTossPhysics";

/**
 * "Cap toss": the GenEd logo assembling itself, driven by a real physics
 * simulation (see capTossPhysics.ts). The G pops in alone; the cap is thrown
 * onto it and bounces to rest; then the G slides left wearing the cap,
 * uncovering "e n E d", which spring up in place one after another. The tassel is a real rope with the star
 * hanging from it, from the first frame.
 *
 * The letters, cap and star are the real logo image clipped to each part (no
 * redrawn art), so once the motion settles they line up into exactly the
 * logo. Only the cord is drawn, so it can bend like a rope.
 */

const SRC = "/brand/gened-logo-deep-ocean-transparent.png";
export const LOGO_BOX = { width: LOGO_W, height: LOGO_H };

/** The cord's colour and width in the logo image. */
const CORD = { colour: "#03595F", width: 2.6 };

const poly = (points: [number, number][]) => `polygon(${points.map(([x, y]) => `${x}px ${y}px`).join(", ")})`;

// The cap and the G share one boundary — the middle of the thin gap between
// them, measured per column of the logo — so together they cover every pixel
// exactly once.
const CAP_G_GAP: [number, number][] = [
  [30, 66], [34, 63.5], [37, 60.5], [40, 61], [43, 57.5], [46, 54], [49, 51], [52, 49],
  [55, 47], [58, 46], [61, 43.5], [64, 42.5], [67, 41.5], [70, 40.5], [73, 40.5], [76, 39.5],
  [79, 38.5], [82, 39.5], [85, 39.5], [88, 38.5], [91, 39.5], [94, 39.5], [97, 40.5],
  [100, 41.5], [103, 42.5], [106, 41.5], [109, 42.5], [112, 42.5], [116, 44], [120, 46],
];
// The cap stops at the knot; the cord below it is drawn as a rope.
const CAP = poly([[4, 34], [70, 0], [142, 16], [142, 44], ...[...CAP_G_GAP].reverse(), [26, 47], [24, 44], [14, 43], [3, 44]]);
const SPARKLE = poly([[3, 63], [30, 63], [30, 91], [3, 91]]);
// Letter slices start below the cap — its right tip reaches over the "e".
const LETTERS: string[] = [
  poly([[30, 140], ...CAP_G_GAP, [120, 140]]),
  poly([[120, 44], [177, 44], [177, 140], [120, 140]]),
  poly([[177, 44], [233, 44], [233, 140], [177, 140]]),
  poly([[233, 44], [288, 44], [288, 140], [233, 140]]),
  poly([[288, 44], [354, 44], [354, 140], [288, 140]]),
];
const BASELINE = 132;

// Solving the throw takes a few tens of milliseconds; do it while the
// browser is idle after start-up so the loader never stutters on its first
// frame.
if (typeof window !== "undefined") {
  const whenIdle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
  whenIdle(() => prepareCapToss());
}

/** The loader holds at least this long, so the logo is always seen assembled. */
export const TOSS_SETTLE_MS = Math.round(SETTLED_AT * 1000);

/** A smooth curve through the rope's points (quadratic through midpoints). */
function ropePath(points: Point[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${last.x} ${last.y}`;
}

function Slice({ clip }: { clip: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand asset, sliced with clip-path
    <img
      src={SRC}
      alt=""
      draggable={false}
      width={LOGO_W}
      height={LOGO_H}
      className="pointer-events-none absolute left-0 top-0 select-none"
      style={{ width: LOGO_W, height: LOGO_H, maxWidth: "none", clipPath: clip, WebkitClipPath: clip }}
    />
  );
}

const layer: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: LOGO_W, height: LOGO_H };

export function LogoToss({ reduceMotion }: { reduceMotion: boolean }) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const letterEls = useRef<(HTMLDivElement | null)[]>([]);
  const revealEls = useRef<(HTMLDivElement | null)[]>([]);
  const capEl = useRef<HTMLDivElement>(null);
  const ropeEl = useRef<SVGPathElement>(null);
  const sparkleEl = useRef<HTMLDivElement>(null);
  const glowEl = useRef<HTMLSpanElement>(null);

  // The stage is laid out in logo pixels and scaled to the space it's given.
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / LOGO_W || 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Run the simulation and write each frame straight to the DOM.
  useEffect(() => {
    if (reduceMotion) return;
    const sim = createCapToss();
    const apply = (f: TossFrame) => {
      f.letters.forEach((l, i) => {
        const el = letterEls.current[i];
        if (!el) return;
        el.style.transform = `translate(${l.x}px, ${l.y}px) scale(${l.scaleX}, ${l.scaleY})`;
        el.style.opacity = String(l.opacity);
      });
      // e, n, E, d only exist to the right of the G's trailing edge.
      const reveal = `polygon(${f.revealX}px 0, ${LOGO_W}px 0, ${LOGO_W}px ${LOGO_H}px, ${f.revealX}px ${LOGO_H}px)`;
      revealEls.current.forEach((el) => {
        if (!el) return;
        el.style.clipPath = reveal;
        el.style.setProperty("-webkit-clip-path", reveal);
      });
      if (capEl.current) {
        capEl.current.style.transform = `translate(${f.cap.x}px, ${f.cap.y}px) rotate(${f.cap.rotate}deg)`;
        capEl.current.style.opacity = String(f.cap.opacity);
      }
      if (ropeEl.current) {
        ropeEl.current.setAttribute("d", ropePath(f.rope));
        ropeEl.current.style.opacity = String(f.cap.opacity);
      }
      if (sparkleEl.current) {
        sparkleEl.current.style.transform = `translate(${f.sparkle.x}px, ${f.sparkle.y}px) rotate(${f.sparkle.rotate}deg) scale(${f.sparkle.scale})`;
        sparkleEl.current.style.opacity = String(f.sparkle.opacity);
      }
      if (glowEl.current) {
        glowEl.current.style.transform = `translate(${f.glow.x - 30}px, ${f.glow.y - 30}px) scale(${f.glow.scale})`;
        glowEl.current.style.opacity = String(f.glow.opacity);
      }
    };
    apply(sim.frame());
    let last = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      apply(sim.step((now - last) / 1000));
      last = now;
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  if (reduceMotion) {
    return (
      <motion.img
        src={SRC}
        alt="GenEd"
        className="h-full w-full select-none"
        draggable={false}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    );
  }

  return (
    <div ref={outer} className="relative h-full w-full" role="img" aria-label="GenEd">
      <div className="absolute left-0 top-0" style={{ ...layer, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        {/* The G slides off e, n, E, d, uncovering each in its own place */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} ref={(el) => { revealEls.current[i - 1] = el; }} style={{ ...layer, clipPath: "inset(0 0 0 100%)" }}>
            <div
              ref={(el) => { letterEls.current[i] = el; }}
              style={{ ...layer, opacity: 0, transformOrigin: `${LETTER_CENTRES[i]}px ${BASELINE}px`, willChange: "transform" }}
            >
              <Slice clip={LETTERS[i]} />
            </div>
          </div>
        ))}
        <div
          ref={(el) => { letterEls.current[0] = el; }}
          style={{ ...layer, opacity: 0, transformOrigin: `${LETTER_CENTRES[0]}px ${BASELINE}px`, willChange: "transform" }}
        >
          <Slice clip={LETTERS[0]} />
        </div>

        {/* The cord: a real rope, drawn through the simulated points */}
        <svg
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
          width={LOGO_W}
          height={LOGO_H}
          viewBox={`0 0 ${LOGO_W} ${LOGO_H}`}
        >
          <path
            ref={ropeEl}
            fill="none"
            stroke={CORD.colour}
            strokeWidth={CORD.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0 }}
          />
        </svg>

        <div ref={capEl} style={{ ...layer, opacity: 0, transformOrigin: `${CAP_CENTRE.x}px ${CAP_CENTRE.y}px`, willChange: "transform" }}>
          <Slice clip={CAP} />
        </div>

        {/* The star hangs from the rope's end */}
        <div
          ref={sparkleEl}
          style={{ ...layer, opacity: 0, transformOrigin: `${SPARKLE_CENTRE.x}px ${SPARKLE_CENTRE.y}px`, willChange: "transform" }}
        >
          <Slice clip={SPARKLE} />
        </div>

        {/* Burst of citron light from the star as the cap lands */}
        <span
          ref={glowEl}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-full"
          style={{
            width: 60,
            height: 60,
            opacity: 0,
            background: "radial-gradient(circle, rgba(215,234,124,0.8) 0%, rgba(215,234,124,0) 70%)",
          }}
        />

        {/* A soft sheen passes over the wordmark once it's together (masked to the logo) */}
        <div
          aria-hidden
          className="pointer-events-none overflow-hidden"
          style={{ ...layer, WebkitMaskImage: `url(${SRC})`, maskImage: `url(${SRC})`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }}
        >
          <motion.span
            className="absolute inset-y-0 w-1/3 bg-[linear-gradient(100deg,transparent,rgba(255,255,255,0.55),transparent)]"
            initial={{ x: "-120%" }}
            animate={{ x: ["-120%", "420%"] }}
            transition={{ duration: 1.3, delay: SETTLED_AT + 0.3, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}
