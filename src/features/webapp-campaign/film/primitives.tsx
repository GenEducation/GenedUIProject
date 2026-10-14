"use client";

// Building blocks for film scenes. Every scene receives `p`, its own 0..1
// progress, and animates children by mapping slices of it (`at={[a, b]}`)
// onto transform/opacity only — so the same scene can be scrubbed by scroll,
// played by the player, or played once when scrolled into view on mobile.

import type { CSSProperties, ReactNode } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";

export type Progress = MotionValue<number>;
export type Range = [number, number];

/** Apple-ish ease-out: fast start, long soft landing. */
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3.2);
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** 0→1 over `at`, eased. */
export function useRange(p: Progress, at: Range, ease = easeOut) {
  return useTransform(p, at, [0, 1], { ease });
}

interface RevealProps {
  p: Progress;
  at: Range;
  x?: number;
  y?: number;
  scale?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Fades and slides a child in over `at`. Offsets are in em so mocks scale. */
export function Reveal({ p, at, x = 0, y = 0.9, scale = 1, className, style, children }: RevealProps) {
  const t = useRange(p, at);
  const opacity = t;
  const tx = useTransform(t, (v) => `${(1 - v) * x}em`);
  const ty = useTransform(t, (v) => `${(1 - v) * y}em`);
  const sc = useTransform(t, (v) => scale + (1 - scale) * v);
  return (
    <motion.div className={className} style={{ ...style, opacity, x: tx, y: ty, scale: sc }}>
      {children}
    </motion.div>
  );
}

/** A bar that grows from 0 to `to` (0..1) along x or y. */
export function Grow({
  p,
  at,
  to = 1,
  axis = "x",
  className,
  style,
}: {
  p: Progress;
  at: Range;
  to?: number;
  axis?: "x" | "y";
  className?: string;
  style?: CSSProperties;
}) {
  const t = useRange(p, at);
  const s = useTransform(t, (v) => v * to);
  return (
    <motion.div
      className={className}
      style={{
        ...style,
        transformOrigin: axis === "x" ? "left center" : "center bottom",
        ...(axis === "x" ? { scaleX: s } : { scaleY: s }),
      }}
    />
  );
}

/** A number that counts up over `at`. */
export function Count({
  p,
  at,
  to,
  from = 0,
  decimals = 0,
  suffix = "",
}: {
  p: Progress;
  at: Range;
  to: number;
  from?: number;
  decimals?: number;
  suffix?: string;
}) {
  const t = useRange(p, at);
  const text = useTransform(t, (v) => `${(from + (to - from) * v).toFixed(decimals)}${suffix}`);
  return <motion.span>{text}</motion.span>;
}

/** Words that appear one after another across `at`, like a streamed reply. */
export function Stream({
  p,
  at,
  text,
  className,
}: {
  p: Progress;
  at: Range;
  text: string;
  className?: string;
}) {
  // `**bold**` spans (may cover several words) render as <b>.
  const words = parseBold(text);
  const step = (at[1] - at[0]) / words.length;
  return (
    <span className={className}>
      {words.map((t, i) => (
        <Word
          key={i}
          p={p}
          at={[at[0] + i * step, at[0] + (i + 4) * step]}
          word={t.w}
          bold={t.isBold}
        />
      ))}
    </span>
  );
}

/** Splits text into words, marking those inside `**…**` as bold. */
function parseBold(text: string): { w: string; isBold: boolean }[] {
  const out: { w: string; isBold: boolean }[] = [];
  let bold = false;
  for (const raw of text.split(" ")) {
    const opens = raw.startsWith("**");
    const closes = /\*\*[.,!?]?$/.test(raw) && (!opens || raw.length > 4);
    out.push({ w: raw.replace(/\*\*/g, ""), isBold: bold || opens });
    if (opens) bold = true;
    if (closes) bold = false;
  }
  return out;
}

function Word({ p, at, word, bold }: { p: Progress; at: Range; word: string; bold: boolean }) {
  // Each word eases in over a few words' time, so a reply flows on rather than ticks.
  const opacity = useTransform(p, at, [0, 1], { ease: easeOut });
  return <motion.span style={{ opacity }}>{bold ? <b>{word}</b> : word} </motion.span>;
}

/** An SVG stroke that draws itself over `at`. */
export function Draw({
  p,
  at,
  to = 1,
  ...rest
}: { p: Progress; at: Range; to?: number } & React.SVGProps<SVGPathElement>) {
  const t = useRange(p, at, easeInOut);
  const pathLength = useTransform(t, (v) => v * to);
  const opacity = useTransform(p, [at[0], at[0] + 0.001], [0, 1]);
  const { style, ...attrs } = rest;
  return (
    <motion.path
      {...(attrs as object)}
      style={{ ...(style as object), pathLength, opacity }}
    />
  );
}

/** Browser-window chrome around a mocked web-app screen. */
export function BrowserFrame({
  url,
  children,
  className = "",
  p,
  camera,
}: {
  url: string;
  children: ReactNode;
  className?: string;
  /** With `camera`, the screen's contents zoom and pan over the scene. */
  p?: Progress;
  camera?: CameraKey[];
}) {
  return (
    <div className={`gc-browser ${className}`}>
      <div className="gc-browser-bar">
        <span className="gc-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="gc-url">
          <svg viewBox="0 0 24 24" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 018 0v3" />
          </svg>
          {url}
        </span>
      </div>
      <div className="gc-browser-body">
        <div className="gc-screen">
          {p && camera ? (
            <Camera p={p} keys={camera}>
              {children}
            </Camera>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

/** Text typed in character by character over `at`. */
export function Typed({ p, at, text, className }: { p: Progress; at: Range; text: string; className?: string }) {
  const shown = useTransform(p, at, [0, text.length], { clamp: true });
  const value = useTransform(shown, (n) => text.slice(0, Math.round(n)));
  return <motion.span className={className}>{value}</motion.span>;
}

/** The tutor's face from the lesson screen: mortarboard on a mint disc with a citron sparkle. */
export function TutorMark({ size = "2.3em" }: { size?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="gc-tutormark">
      <circle cx="20" cy="20" r="19.5" fill="#DCEBE7" />
      <circle cx="20" cy="20" r="19" fill="none" stroke="#FFFFFF" strokeWidth="1" />
      <path d="M7 15.2 L20 9.5 L33 15.2 L20 20.8 Z" fill="#075E63" />
      <path d="M12.6 18.4 V24.3 C12.6 26.6 16 28.3 20 28.3 C24 28.3 27.4 26.6 27.4 24.3 V18.4 L20 21.6 Z" fill="#075E63" />
      <path d="M12.6 18.4 L20 21.6 L27.4 18.4" fill="none" stroke="#0B7378" strokeWidth="0.8" />
      <path d="M9.4 16.3 V24.4" stroke="#075E63" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M9.4 24.2 C9.9 26.4 10.4 26.9 12.6 27.4 C10.4 27.9 9.9 28.4 9.4 30.6 C8.9 28.4 8.4 27.9 6.2 27.4 C8.4 26.9 8.9 26.4 9.4 24.2 Z"
        fill="#D9F279"
        stroke="#B8D63F"
        strokeWidth="0.5"
      />
    </svg>
  );
}

/** A figure "inking" onto the whiteboard: left-to-right reveal, blur → sharp. */
export function Ink({ p, at, children, className, style }: { p: Progress; at: Range; children: ReactNode; className?: string; style?: CSSProperties }) {
  const t = useRange(p, at, (v) => 1 - Math.pow(1 - v, 2));
  const clipPath = useTransform(t, (v) => `inset(-25% ${(1 - v) * 125 - 25}% -25% -25%)`);
  const opacity = useTransform(t, [0, 0.05, 1], [0, 0.6, 1]);
  return (
    <motion.div className={className} style={{ ...style, clipPath, opacity }}>
      {children}
    </motion.div>
  );
}

/** A camera move inside an app window: at `at`, scale `s`, centred on (`x`, `y`) as 0..1 of the screen. */
export interface CameraKey {
  at: number;
  s: number;
  x: number;
  y: number;
}

/**
 * Pushes in on the action inside a mock screen, like a zoomed screen recording.
 * Keys are eased; the view is clamped so the screen's edges never show.
 */
export function Camera({ p, keys, children }: { p: Progress; keys?: CameraKey[]; children: ReactNode }) {
  const list = keys && keys.length ? keys : [{ at: 0, s: 1, x: 0.5, y: 0.5 }];
  const ats = list.map((k) => k.at);
  const s = useTransform(p, ats.length > 1 ? ats : [0, 1], ats.length > 1 ? list.map((k) => k.s) : [list[0].s, list[0].s], { ease: easeInOut });
  const fx = useTransform(p, ats.length > 1 ? ats : [0, 1], ats.length > 1 ? list.map((k) => k.x) : [list[0].x, list[0].x], { ease: easeInOut });
  const fy = useTransform(p, ats.length > 1 ? ats : [0, 1], ats.length > 1 ? list.map((k) => k.y) : [list[0].y, list[0].y], { ease: easeInOut });
  const shift = (scale: number, f: number) => {
    const room = (scale - 1) / 2;
    return `${Math.max(-room, Math.min(room, scale * (0.5 - f))) * 100}%`;
  };
  const x = useTransform([s, fx], ([sv, f]: number[]) => shift(sv, f));
  const y = useTransform([s, fy], ([sv, f]: number[]) => shift(sv, f));
  return (
    <motion.div className="gc-cam" style={{ x, y, scale: s }}>
      {children}
    </motion.div>
  );
}
