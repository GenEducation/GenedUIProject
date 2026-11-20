"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FunFactCard } from "../FunFactCard";
import { COMPLETION_OBJECT, STUDY_OBJECTS } from "./studyObjects";

const SIMULATED_CAP = 90;
// One object per beat: quick enough to feel snappy, long enough to register.
const OBJECT_INTERVAL_MS = 560;
const REDUCED_INTERVAL_MS = 1000;
// The deck always plays through once — every object gets its moment — and
// the destination gets that long, at least, to load its 3D renders.
export const FULL_CYCLE_MS = STUDY_OBJECTS.length * OBJECT_INTERVAL_MS;
// In a hand-off, navigate once the overlay has faded in and covers the page,
// so the destination loads underneath while the deck plays.
const NAVIGATE_AFTER_MS = 320;
// How long the graduation cap + sparks hold before the loader leaves.
const MIN_CELEBRATION_MS = 1200;

const SNAP_IN = { type: "spring", stiffness: 650, damping: 19, mass: 0.7 } as const;
const SNAP_OUT = { duration: 0.11, ease: [0.4, 0, 1, 1] } as const;
const CAP_DROP = { type: "spring", stiffness: 420, damping: 13, mass: 0.8 } as const;

interface StudyDeckLoaderProps {
  isVisible: boolean;
  // With isHandoff: the work is done, navigate (onCelebrated). Without it:
  // the destination is ready, so finish once the deck has played through.
  isComplete: boolean;
  // True while a post-auth navigation is in flight; the destination calls
  // finishLoading() (isHandoff → false) once its visuals have loaded.
  isHandoff?: boolean;
  // Called shortly after a hand-off begins — this is when the caller should
  // navigate, under the overlay.
  onCelebrated?: () => void;
  onFinished: () => void;
  // Subject context for the fun fact. Passed in rather than read from a store
  // so this component stays store-free and trivially testable.
  factSubject?: string | null;
  // Shortest time the deck plays before it may finish. Tests shorten it.
  minCycleMs?: number;
  // The word under the graduation cap.
  completionWord?: string;
}

/**
 * The student (default) full-screen loader: Blender-rendered clay study
 * objects snap onto a small stage one after another, then a graduation cap
 * drops in. It always plays the full deck, and leaves only once the
 * destination says it is ready (see AuthGuard / useLoaderStore.finishLoading).
 */
export const StudyDeckLoader: React.FC<StudyDeckLoaderProps> = ({
  isVisible,
  isComplete,
  isHandoff = false,
  onCelebrated,
  onFinished,
  factSubject,
  minCycleMs = FULL_CYCLE_MS,
  completionWord,
}) => {
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);
  // Starts on a random object so sign-ins don't all open the same way; the
  // beat counter just keeps counting from there.
  const [start] = useState(() => Math.floor(Math.random() * STUDY_OBJECTS.length));
  const [beat, setBeat] = useState(0);
  // Objects shown since the loader appeared, and whether the finale is on.
  const [shownBeats, setShownBeats] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const finishedRef = useRef(false);
  const celebratedRef = useRef(false);

  const interval = reduceMotion ? REDUCED_INTERVAL_MS : OBJECT_INTERVAL_MS;
  // Ready to finish: the destination is ready and the deck has played through.
  const ready =
    isVisible && isComplete && !isHandoff && shownBeats >= Math.ceil(minCycleMs / interval);
  // Read by the beat timer, so the finale lands on a beat: the last object
  // always gets its full moment instead of being cut off mid-pop.
  const readyRef = useRef(ready);
  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  // Steady progress climb, decoupled from which object is showing; it runs
  // to 100 with the finale.
  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setShownBeats(0);
      setIsDone(false);
      finishedRef.current = false;
      celebratedRef.current = false;
      return;
    }

    let raf: ReturnType<typeof setTimeout>;
    const tick = () => {
      setProgress((prev) => {
        const target = isDone ? 100 : SIMULATED_CAP;
        const step = isDone ? 0.6 : 0.06;
        const next = prev + (target - prev) * step;
        return target - next < 0.15 ? target : next;
      });
      raf = setTimeout(tick, 120);
    };
    raf = setTimeout(tick, 120);

    return () => clearTimeout(raf);
  }, [isVisible, isDone]);

  // The beat: next object, or — once ready — the finale. Keeps going no
  // matter how long the destination takes.
  useEffect(() => {
    if (!isVisible || isDone) return;

    const id = setInterval(() => {
      if (readyRef.current) {
        setIsDone(true);
        return;
      }
      setBeat((prev) => prev + 1);
      setShownBeats((prev) => prev + 1);
    }, interval);

    return () => clearInterval(id);
  }, [isVisible, isDone, interval]);

  const pct = Math.min(100, progress);

  // Hand-off: navigate under the overlay as soon as it covers the page, so
  // the destination's loading overlaps the deck instead of following it.
  useEffect(() => {
    if (isVisible && isComplete && isHandoff && !celebratedRef.current) {
      celebratedRef.current = true;
      const t = setTimeout(() => onCelebrated?.(), NAVIGATE_AFTER_MS);
      return () => clearTimeout(t);
    }
  }, [isVisible, isComplete, isHandoff, onCelebrated]);

  // Leave once the cap has held for its moment.
  useEffect(() => {
    if (isDone && !finishedRef.current) {
      finishedRef.current = true;
      const t = setTimeout(onFinished, MIN_CELEBRATION_MS);
      return () => clearTimeout(t);
    }
  }, [isDone, onFinished]);

  const finale = completionWord ? { ...COMPLETION_OBJECT, word: completionWord } : COMPLETION_OBJECT;
  const current = isDone ? finale : STUDY_OBJECTS[(start + beat) % STUDY_OBJECTS.length];

  const enterFrom = reduceMotion
    ? { opacity: 0 }
    : isDone
      ? { opacity: 0, y: -70, rotate: -24, scale: 0.8 }
      : { opacity: 0, y: 18, rotate: 16, scale: 0.35 };
  const exitTo = reduceMotion
    ? { opacity: 0, transition: { duration: 0.2 } }
    : { opacity: 0, y: -10, rotate: -14, scale: 0.55, transition: SNAP_OUT };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="study-deck fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          data-testid="study-deck-loader"
          data-loader-overlay=""
        >
          <style>{styles}</style>

          {/* Keeps every render decoded so a swap never waits on the image. */}
          <div aria-hidden="true" className="sd-warm">
            {[...STUDY_OBJECTS, COMPLETION_OBJECT].map((o) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={o.id} src={o.src} alt="" />
            ))}
          </div>

          <div className="sd-stage" aria-hidden="true">
            <motion.div
              key={`shadow-${current.id}`}
              className="sd-ground"
              initial={reduceMotion ? false : { scaleX: 0.6, opacity: 0.05 }}
              animate={
                reduceMotion
                  ? { scaleX: 1, opacity: 0.14 }
                  : { scaleX: [0.6, 1.2, 0.96, 1], opacity: [0.05, 0.22, 0.14, 0.14] }
              }
              transition={{ duration: isDone ? 0.55 : 0.36, times: [0, 0.45, 0.75, 1], delay: isDone ? 0.12 : 0.04 }}
            />

            <div className={reduceMotion ? "sd-float" : "sd-float sd-bob"}>
              {/* initial stays on: the very first object pops in too. */}
              <AnimatePresence>
                <motion.img
                  key={current.id}
                  src={current.src}
                  alt=""
                  draggable={false}
                  className="sd-object"
                  initial={enterFrom}
                  animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                  exit={exitTo}
                  transition={
                    reduceMotion
                      ? { duration: 0.2 }
                      : { ...(isDone ? CAP_DROP : SNAP_IN), opacity: { duration: 0.08 }, delay: 0.04 }
                  }
                />
              </AnimatePresence>
            </div>

            {isDone && !reduceMotion && (
              <div className="sd-sparks">
                {SPARKS.map((s, i) => (
                  <span
                    key={i}
                    className="sd-spark"
                    style={
                      {
                        background: s.color,
                        "--a": `${s.angle}deg`,
                        "--d": `${s.dist}px`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="sd-word" aria-hidden="true">
            <AnimatePresence initial={false}>
              <motion.span
                key={current.word}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                className={isDone ? "sd-word-done" : undefined}
              >
                {current.word}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="w-full max-w-sm px-4 flex flex-col items-center">
            <div className="sd-track">
              <motion.div
                className="sd-fill"
                animate={{ width: `${pct}%` }}
                transition={{ ease: "linear", duration: 0.1 }}
              />
            </div>

            {/* One stable status instead of a live region echoing the cycling
                words. FunFactCard has an aria-live of its own. */}
            <div role="status" className="sr-only">
              {isDone ? "Loading complete" : "Loading"}
            </div>

            {/* Hidden during the completion moment so it doesn't compete. */}
            {!isDone && <FunFactCard subject={factSubject} className="mt-8 w-full" />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const SPARKS = Array.from({ length: 8 }, (_, i) => ({
  angle: i * 45 + (i % 2 ? 12 : -6),
  dist: i % 2 ? 92 : 112,
  color: ["var(--accent)", "#FBE023", "var(--primary)"][i % 3],
}));

const styles = `
  .study-deck {
    background:
      radial-gradient(ellipse 60% 45% at 50% 38%, rgba(166, 207, 8, 0.10), transparent 70%),
      var(--canvas, #F7F4EA);
  }
  .study-deck .sd-warm {
    position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none;
  }
  .study-deck .sd-warm img { width: 1px; height: 1px; }
  .study-deck .sd-stage {
    position: relative; width: 220px; height: 220px;
  }
  .study-deck .sd-ground {
    position: absolute; left: 50%; bottom: 34px; width: 140px; height: 20px; margin-left: -70px;
    border-radius: 50%; background: var(--ink, #1D6315); filter: blur(7px); opacity: 0.14;
  }
  .study-deck .sd-float { position: absolute; inset: 0; }
  .study-deck .sd-bob { animation: sd-bob 1.6s ease-in-out infinite; }
  .study-deck .sd-object {
    /* renders sit low in a roomy frame: overhang the stage, biased upward */
    position: absolute; top: -34%; left: -24%; width: 148%; height: 148%; max-width: none; object-fit: contain;
    user-select: none; transform-origin: 50% 75%; will-change: transform, opacity;
  }
  .study-deck .sd-word {
    margin-top: 2px; margin-bottom: 22px; height: 28px; overflow: hidden;
    display: grid; place-items: center;
    font-family: var(--font-display); font-weight: 600; font-size: 19px; letter-spacing: 0.01em;
    color: var(--ink, #1D6315);
  }
  /* Outgoing and incoming words share one cell so they cross in place. */
  .study-deck .sd-word span { grid-area: 1 / 1; white-space: nowrap; }
  .study-deck .sd-word-done { color: var(--primary, #287624); }
  .study-deck .sd-track {
    position: relative; width: 100%; height: 4px; border-radius: 999px;
    background: rgba(29, 99, 21, 0.08);
  }
  .study-deck .sd-fill {
    position: relative; height: 100%; border-radius: 999px; background: var(--primary, #287624);
  }
  .study-deck .sd-fill::after {
    content: ""; position: absolute; right: -5px; top: 50%; width: 10px; height: 10px; margin-top: -5px;
    border-radius: 50%; background: var(--accent, #A6CF08);
    box-shadow: 0 0 0 3px rgba(166, 207, 8, 0.25);
  }
  .study-deck .sd-sparks { position: absolute; left: 50%; top: 46%; width: 0; height: 0; }
  .study-deck .sd-spark {
    position: absolute; left: -3px; top: -9px; width: 6px; height: 18px; border-radius: 3px; opacity: 0;
    transform: rotate(var(--a)) translateY(0) scaleY(0.4);
    animation: sd-spark 0.7s cubic-bezier(0.2, 0.8, 0.3, 1) 0.18s forwards;
  }
  @keyframes sd-bob {
    0%, 100% { transform: translateY(0) rotate(-1.5deg); }
    50%      { transform: translateY(-3px) rotate(1.5deg); }
  }
  @keyframes sd-spark {
    0%   { opacity: 1; transform: rotate(var(--a)) translateY(-30px) scaleY(0.4); }
    40%  { opacity: 1; transform: rotate(var(--a)) translateY(calc(var(--d) * -0.8)) scaleY(1); }
    100% { opacity: 0; transform: rotate(var(--a)) translateY(calc(var(--d) * -1)) scaleY(0.2); }
  }
`;
