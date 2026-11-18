"use client";

import { useRef, type CSSProperties } from "react";

/**
 * The Zoovi wordmark cut into its letters (column ranges measured from the 1063×365 artwork), so each paper
 * letter can move on its own: they drop in on load, hop when the pointer touches them, and a tap anywhere on the
 * word sends a wave through them. The i's dot bounces like a ball. Decorative — the heading text is elsewhere.
 */
const W = 1063;
const H = 365;
const PIECES: { x0: number; x1: number; y0?: number; y1?: number; tilt: number; dot?: boolean }[] = [
  { x0: 0, x1: 235, tilt: -8 }, // z
  { x0: 235, x1: 461, tilt: 6 }, // o
  { x0: 461, x1: 693, tilt: -5 }, // o
  { x0: 693, x1: 948, tilt: 7 }, // v
  { x0: 948, x1: W, y0: 112, y1: H, tilt: -6 }, // i stem
  { x0: 948, x1: W, y0: 0, y1: 112, tilt: 0, dot: true }, // i dot
];

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

export function LogoLetters() {
  const root = useRef<HTMLSpanElement>(null);

  const wave = () => {
    const el = root.current;
    if (!el) return;
    el.classList.remove("is-waving");
    void el.offsetWidth; // restart the animation
    el.classList.add("is-waving");
  };

  return (
    <span ref={root} className="zv-letters" aria-hidden="true" onPointerDown={wave} onAnimationEnd={(e) => {
      if (e.animationName === "zv-letter-wave") e.currentTarget.classList.remove("is-waving");
    }}>
      {PIECES.map((p, i) => {
        const y0 = p.y0 ?? 0;
        const y1 = p.y1 ?? H;
        const style = {
          "--clip": `inset(${pct(y0, H)} ${pct(W - p.x1, W)} ${pct(H - y1, H)} ${pct(p.x0, W)})`,
          "--ox": pct((p.x0 + p.x1) / 2, W),
          "--oy": pct(y1, H),
          "--tilt": `${p.tilt}deg`,
          "--i": i,
        } as CSSProperties;
        return <span key={i} className={`zv-letter${p.dot ? " zv-letter--dot" : ""}`} style={style} />;
      })}
    </span>
  );
}
