"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ParentLoaderStage } from "@/stores/useLoaderStore";
import { LOGO_BOX, LogoToss, TOSS_SETTLE_MS } from "./LogoToss";
import { SLOW_AFTER_MS, SLOW_LINE, stageLines } from "./loaderMessages";

/**
 * The parent portal's full-screen loader: the GenEd logo assembling itself
 * (the cap is tossed onto the G, which slides left as "enEd" pops up behind
 * it — see LogoToss); then, on portal entry, the family's avatars arriving
 * beneath it. A live status line says what is
 * actually happening. No trophy, no confetti — parents get calm.
 *
 * Timing contract (shared with the student LoaderJourney):
 *  - `isComplete && isHandoff`: call `onCelebrated` (navigate) once the cap
 *    has been on screen for MIN_HOLD_MS; never dismiss itself.
 *  - `isComplete && !isHandoff`: the destination is ready — leave once the
 *    hold (and the family's arrival) has been seen, then `onFinished`.
 */

// Long enough for the logo to finish assembling.
export const MIN_HOLD_MS = TOSS_SETTLE_MS;
const FAMILY_HOLD_MS = 700;
const LINE_STEP_MS = 1400;
const LOGO_WIDTH = 300;

export interface LoaderChild {
  id: string;
  name: string;
  avatar: string;
}

interface ParentLoaderProps {
  isVisible: boolean;
  isComplete: boolean;
  isHandoff: boolean;
  stage: ParentLoaderStage;
  /** Delay before appearing, so a quick load never flashes the loader. */
  appearDelayMs?: number;
  /** The parent's children, once known (portal entry). */
  childrenList?: LoaderChild[] | null;
  onCelebrated?: () => void;
  onFinished: () => void;
}

const BG = "#F5FAF9";
const INK = "#13293D";
const INK_SOFT = "#5E7186";

export function ParentLoader({
  isVisible,
  isComplete,
  isHandoff,
  stage,
  appearDelayMs = 0,
  childrenList,
  onCelebrated,
  onFinished,
}: ParentLoaderProps) {
  const reduceMotion = !!useReducedMotion();
  const [shown, setShown] = useState(false);
  const [now, setNow] = useState(0);
  const shownAt = useRef<number | null>(null);
  const familyAt = useRef<number | null>(null);
  const celebrated = useRef(false);
  const finished = useRef(false);

  const children = childrenList ?? [];
  const hasFamily = stage === "entry" && children.length > 0;

  // ── Appear (after an optional delay) and reset when hidden ───────────────
  useEffect(() => {
    if (!isVisible) {
      setShown(false);
      shownAt.current = null;
      familyAt.current = null;
      celebrated.current = false;
      finished.current = false;
      return;
    }
    const t = setTimeout(() => {
      shownAt.current = Date.now();
      setShown(true);
    }, appearDelayMs);
    return () => clearTimeout(t);
  }, [isVisible, appearDelayMs]);

  useEffect(() => {
    if (hasFamily && familyAt.current === null && shown) familyAt.current = Date.now();
  }, [hasFamily, shown]);

  // A coarse clock drives holds, the status line and the progress line.
  useEffect(() => {
    if (!shown) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 120);
    return () => clearInterval(t);
  }, [shown]);

  const elapsed = shown && shownAt.current ? now - shownAt.current : 0;
  const holdDone = elapsed >= MIN_HOLD_MS;
  const familyDone = !hasFamily || (familyAt.current !== null && now - familyAt.current >= FAMILY_HOLD_MS);

  // ── Hand-off: navigate once the cap has been seen ───────────────────────
  useEffect(() => {
    if (!isVisible || !isComplete || !isHandoff || celebrated.current) return;
    if (shown && holdDone) {
      celebrated.current = true;
      onCelebrated?.();
    }
  }, [isVisible, isComplete, isHandoff, shown, holdDone, onCelebrated]);

  // ── Finish: leave once ready and seen (or immediately if never shown) ───
  const ready = isVisible && isComplete && !isHandoff;
  const leaving = ready && (!shown || (holdDone && familyDone));
  useEffect(() => {
    if (!leaving || finished.current) return;
    finished.current = true;
    const t = setTimeout(onFinished, shown ? 320 : 0);
    return () => clearTimeout(t);
  }, [leaving, shown, onFinished]);

  // ── Status line ─────────────────────────────────────────────────────────
  const lines = stageLines(stage, hasFamily ? children.map((c) => c.name) : []);
  const stepped = Math.min(lines.length - 1, Math.floor(elapsed / LINE_STEP_MS));
  // Once the family is known, jump straight to naming them.
  const lineIndex = hasFamily ? lines.length - 1 : stepped;
  const line = elapsed > SLOW_AFTER_MS && !leaving ? SLOW_LINE : lines[lineIndex];

  // ── Progress: eases toward 90%, completes when leaving ──────────────────
  const progress = leaving ? 100 : 90 * (1 - Math.exp(-elapsed / 1600));

  const t = (s: number) => (reduceMotion ? 0 : s);

  return (
    <AnimatePresence>
      {isVisible && shown && (
        <motion.div
          key="parent-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: t(0.35) }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden font-[family-name:var(--font-display)]"
          style={{ background: BG }}
        >
          <ParentLoaderBackdrop animated={!reduceMotion} />

          <motion.div
            className="relative flex flex-col items-center"
            animate={leaving ? { y: -6, opacity: 0.9 } : { y: 0, opacity: 1 }}
            transition={{ duration: t(0.3) }}
          >
            {/* The logo assembling itself (cap toss) */}
            <div
              className="relative"
              style={{ width: `min(${LOGO_WIDTH}px, 78vw)`, aspectRatio: `${LOGO_BOX.width} / ${LOGO_BOX.height}` }}
            >
              {/* breathing halo */}
              <motion.span
                aria-hidden
                className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(159,227,196,0.45) 0%, rgba(159,227,196,0) 65%)" }}
                animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative h-full w-full">
                <LogoToss reduceMotion={reduceMotion} />
              </div>
            </div>

            {/* The family arrives */}
            {/* Takes no space until there's a family to show, then opens up. */}
            <div
              className={`flex items-center justify-center overflow-visible transition-[height,margin] duration-500 ease-out ${hasFamily ? "mt-7 h-[60px]" : "mt-0 h-0"}`}
              aria-hidden
            >
              <AnimatePresence>
                {hasFamily &&
                  children.slice(0, 4).map((child, i) => (
                    <motion.span
                      key={child.id}
                      className="-mx-1.5 block h-[54px] w-[54px] overflow-hidden rounded-full ring-[3px] ring-white shadow-[0_8px_20px_-10px_rgba(19,41,61,0.45)]"
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.6 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 260, damping: 20, delay: i * 0.12 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- small avatar */}
                      <img src={child.avatar} alt="" className="h-full w-full scale-[1.035] object-cover" />
                    </motion.span>
                  ))}
                {hasFamily && children.length > 4 && (
                  <motion.span
                    key="more"
                    className="-mx-1.5 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white text-[13px] font-bold ring-[3px] ring-white"
                    style={{ color: INK }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    +{children.length - 4}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Live status line */}
            <div className="mt-6 h-6 overflow-hidden text-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={line}
                  aria-hidden
                  className="text-[15px] font-semibold"
                  style={{ color: INK }}
                  initial={{ y: reduceMotion ? 0 : 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: reduceMotion ? 0 : -14, opacity: 0 }}
                  transition={{ duration: t(0.28) }}
                >
                  {line}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Progress line */}
            <div className="mt-4 h-[3px] w-[220px] overflow-hidden rounded-full bg-[#DDEDE7]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#16A36B,#C9E15A)] transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p role="status" aria-live="polite" className="sr-only">{line}</p>
            <p className="mt-3 text-[12px]" style={{ color: INK_SOFT }} aria-hidden>
              GenEd Parent Portal
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * The loader's atmosphere on its own: the portal background with soft mint,
 * citron and sky washes and a few faint stars. Also used as the plain screen
 * while a parent route is checking the session, so nothing flashes between
 * it and the loader.
 */
export function ParentLoaderBackdrop({ animated = false }: { animated?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: BG }}>
      <div className="absolute -top-40 right-[12%] h-[460px] w-[460px] rounded-full bg-[#9FE3C4]/45 blur-[90px]" />
      <div className="absolute left-[-120px] top-[40%] h-[380px] w-[380px] rounded-full bg-[#D7EA7C]/35 blur-[90px]" />
      <div className="absolute bottom-[-140px] right-[28%] h-[420px] w-[420px] rounded-full bg-[#BBD7FF]/40 blur-[100px]" />
      {[
        [12, 22], [22, 70], [36, 14], [64, 82], [78, 26], [88, 64], [52, 90], [8, 52],
      ].map(([left, top], i) => (
        <span
          key={i}
          className={`absolute h-1 w-1 rounded-full bg-[#115A60]/25 ${animated ? "motion-safe:animate-pulse" : ""}`}
          style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </div>
  );
}
