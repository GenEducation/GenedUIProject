"use client";

import { useEffect } from "react";
import { useAnimate, useReducedMotion } from "framer-motion";

/**
 * Looping "we're building it" scene for the paused /register page: a small
 * flat skyline builds itself. The sun comes up, faint back towers rise, then
 * the five front buildings spring up from the ground one by one, rooftop
 * details pop on, and the windows switch on in a random cascade and twinkle.
 * After a beat the city sinks back down and it starts again. Clouds drift
 * the whole time.
 *
 * The default markup is the finished skyline (windows lit), so reduced-motion
 * users get a complete still; the loop resets everything each cycle.
 */

const GROUND = 176;
const INK = "#042E5C";
const LIT = "#FFD66B";
const DIM = "rgba(255,255,255,0.16)";

type Roof = "antenna" | "flag" | "tank" | "sign" | null;
const BUILDINGS: { x: number; w: number; h: number; c: string; cols: number; roof: Roof; door?: boolean }[] = [
  { x: 34, w: 46, h: 74, c: "#0B4A86", cols: 2, roof: "tank", door: true },
  { x: 84, w: 52, h: 124, c: INK, cols: 3, roof: "antenna" },
  { x: 140, w: 46, h: 94, c: "#059F6D", cols: 2, roof: "sign", door: true },
  { x: 190, w: 42, h: 140, c: "#2C6CB0", cols: 2, roof: "flag" },
  { x: 236, w: 50, h: 82, c: "#0DB37D", cols: 3, roof: null, door: true },
];
// Order the front buildings rise in: tallest first, then outwards.
const RISE_ORDER = [3, 1, 2, 0, 4];
const BACK = [
  { x: 58, w: 30, h: 104 },
  { x: 120, w: 26, h: 132 },
  { x: 168, w: 34, h: 156 },
  { x: 252, w: 30, h: 116 },
];

// Window grid per building; `on` is a fixed pseudo-random pattern of lit windows.
const WIN_W = 6;
const WIN_H = 8;
const WINDOWS = BUILDINGS.flatMap((b, bi) => {
  const pad = 8;
  const gap = b.cols > 1 ? (b.w - 2 * pad - b.cols * WIN_W) / (b.cols - 1) : 0;
  const rows = Math.floor((b.h - (b.door ? 34 : 18)) / 14);
  const out: { bi: number; x: number; y: number; on: boolean }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < b.cols; c++)
      out.push({
        bi,
        x: b.x + pad + c * (WIN_W + gap),
        y: GROUND - b.h + 12 + r * 14,
        on: (bi * 7 + r * 5 + c * 3) % 9 < 6,
      });
  return out;
});
// Shuffled-but-stable switch-on order.
const LIGHT_ORDER = WINDOWS.map((_, i) => i).sort((a, b) => ((a * 53) % 31) - ((b * 53) % 31));

const sel = (p: string) => `[data-p="${p}"]`;

export function SkylineBuild() {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();

  useEffect(() => {
    if (reduce) return;
    let alive = true;
    const a = (p: string, kf: Record<string, unknown>, opts: Record<string, unknown> = {}) =>
      animate(p.startsWith("[") ? p : sel(p), kf as never, opts as never);
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Ambient motion that runs independently of the build loop.
    a("cloud", { x: [-14, 14] }, { duration: 7, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: (i: number) => i * 1.3 });
    a("beacon", { opacity: [1, 0.15, 1] }, { duration: 1.4, repeat: Infinity, ease: "easeInOut" });
    a("flag", { skewY: [0, -10, 0, 8, 0], scaleX: [1, 0.9, 1, 0.94, 1] }, { duration: 1.6, repeat: Infinity, ease: "easeInOut" });

    const cycle = async () => {
      await Promise.all([
        a("sun", { y: 70, opacity: 0 }, { duration: 0 }),
        a("back", { originY: 1, scaleY: 0 }, { duration: 0 }),
        a("bld", { originY: 1, scaleY: 0, scaleX: 1 }, { duration: 0 }),
        a("roof", { originY: 1, scale: 0 }, { duration: 0 }),
        a("win", { fill: DIM }, { duration: 0 }),
        a("ground", { originX: 0.5, scaleX: 0 }, { duration: 0 }),
      ]);
      if (!alive) return;
      a("stage", { opacity: 1 }, { duration: 0.3 });

      // ground line draws out, sun comes up
      a("ground", { scaleX: 1 }, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
      a("sun", { y: 0, opacity: 1 }, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
      await wait(250);

      // faint back towers
      a("back", { scaleY: 1 }, { duration: 0.8, delay: (i: number) => i * 0.08, ease: [0.22, 1, 0.36, 1] });
      await wait(350);
      if (!alive) return;

      // front buildings spring up, each with a little settle
      RISE_ORDER.forEach((bi, n) => {
        a(`[data-p="bld"][data-i="${bi}"]`, { scaleY: [0, 1] }, { type: "spring", stiffness: 240, damping: 15, mass: 0.9, delay: n * 0.16 });
      });
      await wait(RISE_ORDER.length * 160 + 380);
      if (!alive) return;

      // rooftop details pop on
      a("roof", { scale: 1 }, { type: "spring", stiffness: 520, damping: 14, delay: (i: number) => i * 0.08 });
      await wait(200);

      // windows switch on in a cascade
      LIGHT_ORDER.forEach((wi, n) => {
        if (!WINDOWS[wi].on) return;
        a(`[data-w="${wi}"]`, { fill: [DIM, "#FFF4C2", LIT] }, { duration: 0.28, delay: n * 0.022, times: [0, 0.4, 1] });
      });
      await wait(LIGHT_ORDER.length * 22 + 500);
      if (!alive) return;

      // a few windows flick off and on while it holds
      const twinkle = WINDOWS.map((w, i) => (w.on && i % 6 === 2 ? i : -1)).filter((i) => i >= 0);
      twinkle.forEach((wi, n) => {
        a(`[data-w="${wi}"]`, { fill: [LIT, DIM, LIT] }, { duration: 0.5, delay: 0.2 + n * 0.28 });
      });
      await wait(2300);
      if (!alive) return;

      // lights out, city sinks, sun sets
      a("win", { fill: DIM }, { duration: 0.25 });
      a("roof", { scale: 0 }, { duration: 0.2, ease: "easeIn" });
      [...RISE_ORDER].reverse().forEach((bi, n) => {
        a(`[data-p="bld"][data-i="${bi}"]`, { scaleY: 0 }, { duration: 0.42, delay: 0.15 + n * 0.07, ease: [0.55, 0, 0.85, 0.3] });
      });
      a("back", { scaleY: 0 }, { duration: 0.45, delay: 0.45, ease: [0.55, 0, 0.85, 0.3] });
      a("sun", { y: 70, opacity: 0 }, { duration: 0.7, delay: 0.4, ease: "easeIn" });
      await wait(1200);
      a("ground", { scaleX: 0 }, { duration: 0.35, ease: "easeIn" });
      await wait(450);
    };

    (async () => {
      while (alive) await cycle();
    })();
    return () => {
      alive = false;
    };
  }, [reduce, animate]);

  return (
    <div ref={scope}>
      <svg
        className="mx-auto block h-auto w-full max-w-[340px] overflow-visible"
        viewBox="0 0 320 190"
        role="img"
        aria-label="A small city skyline building itself up"
      >
        <defs>
          <clipPath id="bb-sky">
            <rect x="0" y="-40" width="320" height={GROUND + 40} />
          </clipPath>
        </defs>

        {/* Hidden until the loop starts so the first paint never flashes the
            finished skyline; reduced motion shows the finished still. */}
        <g data-p="stage" opacity={reduce ? 1 : 0}>
          {/* sun sets behind the ground line */}
          <g clipPath="url(#bb-sky)">
            <g data-p="sun">
              <circle cx="248" cy="52" r="26" fill="#FFD66B" opacity="0.25" />
              <circle cx="248" cy="52" r="17" fill="#F5B521" />
            </g>
          </g>

          {/* clouds */}
          <g fill={INK} fillOpacity="0.07">
            <path data-p="cloud" d="M40 52 a10 10 0 0 1 18 -6 a13 13 0 0 1 24 4 a8 8 0 0 1 2 16 H44 a8 8 0 0 1 -4 -14 z" />
            <path data-p="cloud" d="M196 30 a8 8 0 0 1 14 -5 a10 10 0 0 1 19 3 a6 6 0 0 1 1 12 H199 a6 6 0 0 1 -3 -10 z" />
          </g>

          {/* back towers */}
          {BACK.map((b, i) => (
            <rect key={i} data-p="back" x={b.x} y={GROUND - b.h} width={b.w} height={b.h} rx="2" fill={INK} fillOpacity="0.09" />
          ))}

          {/* front buildings */}
          {BUILDINGS.map((b, bi) => (
            <g key={bi} data-p="bld" data-i={bi}>
              <rect x={b.x} y={GROUND - b.h} width={b.w} height={b.h} rx="2" fill={b.c} />
              {/* lit edge + roof cap */}
              <rect x={b.x} y={GROUND - b.h} width="3" height={b.h} fill="#fff" fillOpacity="0.1" />
              <rect x={b.x - 2} y={GROUND - b.h - 3} width={b.w + 4} height="4" rx="1.5" fill={b.c} style={{ filter: "brightness(0.8)" }} />
              {WINDOWS.map((w, wi) =>
                w.bi === bi ? (
                  <rect key={wi} data-p="win" data-w={wi} x={w.x} y={w.y} width={WIN_W} height={WIN_H} rx="1" fill={w.on ? LIT : DIM} />
                ) : null,
              )}
              {b.door ? (
                <rect x={b.x + b.w / 2 - 6} y={GROUND - 16} width="12" height="16" rx="2" fill="#fff" fillOpacity="0.22" />
              ) : null}
              <RoofDetail b={b} />
            </g>
          ))}

          {/* ground */}
          <rect data-p="ground" x="14" y={GROUND} width="292" height="3" rx="1.5" fill={INK} fillOpacity="0.22" />
        </g>
      </svg>
    </div>
  );
}

function RoofDetail({ b }: { b: (typeof BUILDINGS)[number] }) {
  const top = GROUND - b.h - 3;
  const cx = b.x + b.w / 2;
  if (b.roof === "antenna")
    return (
      <g data-p="roof">
        <rect x={cx - 1} y={top - 20} width="2" height="20" fill={INK} />
        <rect x={cx - 6} y={top - 6} width="12" height="6" rx="1" fill={INK} />
        <circle data-p="beacon" cx={cx} cy={top - 22} r="2.6" fill="#FF6B6B" />
      </g>
    );
  if (b.roof === "flag")
    return (
      <g data-p="roof">
        <rect x={cx - 0.75} y={top - 22} width="1.5" height="22" fill={INK} />
        <path data-p="flag" d={`M${cx + 0.75} ${top - 22} h14 l-3 5 l3 5 h-14 z`} fill="#F5B521" />
      </g>
    );
  if (b.roof === "tank")
    return (
      <g data-p="roof">
        <rect x={cx - 8} y={top - 13} width="16" height="10" rx="2" fill="#2C6CB0" />
        <path d={`M${cx - 6} ${top - 3} v3 M${cx + 6} ${top - 3} v3`} stroke={INK} strokeWidth="1.5" />
        <path d={`M${cx - 9} ${top - 13} L${cx} ${top - 19} L${cx + 9} ${top - 13} Z`} fill={INK} />
      </g>
    );
  if (b.roof === "sign")
    return (
      <g data-p="roof">
        <path d={`M${cx - 10} ${top} v-4 M${cx + 10} ${top} v-4`} stroke={INK} strokeWidth="1.5" />
        <rect x={cx - 15} y={top - 14} width="30" height="10" rx="2" fill="#F5B521" />
        <text x={cx} y={top - 6.5} textAnchor="middle" fontSize="6.5" fontWeight="800" fill={INK} letterSpacing="0.6" style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
          GENED
        </text>
      </g>
    );
  return null;
}
