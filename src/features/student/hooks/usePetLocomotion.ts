"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PetMove, PetParticle } from "../theme/petExpressions";
import {
  PHYSICS,
  REST,
  isHome,
  poseOf,
  startMove,
  step,
  travelTo,
  type LocoBounds,
  type LocoPose,
  type LocoState,
} from "../utils/petLocomotion";

/**
 * Drives `petLocomotion` for one on-screen pet.
 *
 * The simulation runs in a `requestAnimationFrame` loop that exists **only
 * while the pet is moving or away from home** — at rest nothing is scheduled.
 * Each frame writes transforms straight to the elements through refs; React
 * state changes only when the coarse phase (rising, falling, running, ground)
 * flips, which is what the face follows. Nothing here re-renders per frame.
 *
 * Element layout this hook expects, outermost first:
 *  - `mover` — translated by the offset from home;
 *  - `body` — rotated and scaled (lean, spin, squash, facing);
 *  - `cssMove` — hosts one-shot CSS moves (`pet-move-*` in `globals.css`);
 *  - `shadow` / `fx` — siblings of `mover`, so the contact shadow stays on
 *    the ground while the pet leaves it, and dust and confetti are not carried
 *    along with the creature.
 */

export type LocoPhase = LocoPose["phase"];

interface Options {
  /** Home, in viewport px — where the student put the pet. */
  home: { x: number; y: number } | null;
  size: number;
  /** `prefers-reduced-motion`: every move becomes a no-op. */
  reducedMotion: boolean;
}

const CSS_MOVE_PREFIX = "pet-move-";
const VIEWPORT_MARGIN = 16;

export function usePetLocomotion({ home, size, reducedMotion }: Options) {
  const moverRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const cssMoveRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const fxRef = useRef<HTMLDivElement | null>(null);

  const state = useRef<LocoState>(REST);
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  /** The frame callback, held in a ref so the loop can reschedule itself. */
  const frame = useRef<(now: number) => void>(() => {});
  const homeRef = useRef(home);
  const sizeRef = useRef(size);
  const [phase, setPhase] = useState<LocoPhase>("ground");
  const phaseRef = useRef<LocoPhase>("ground");
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);

  useEffect(() => {
    homeRef.current = home;
    sizeRef.current = size;
  }, [home, size]);

  const bounds = useCallback((): LocoBounds => {
    const h = homeRef.current;
    const s = sizeRef.current;
    if (!h || typeof window === "undefined") return { minX: 0, maxX: 0, maxRise: 0 };
    return {
      minX: VIEWPORT_MARGIN - h.x,
      maxX: window.innerWidth - s - VIEWPORT_MARGIN - h.x,
      maxRise: Math.max(0, h.y - VIEWPORT_MARGIN),
    };
  }, []);

  /** Which way the student's work is: toward the middle of the screen. */
  const towardStudent = useCallback((): 1 | -1 => {
    const h = homeRef.current;
    if (!h || typeof window === "undefined") return -1;
    return h.x + sizeRef.current / 2 < window.innerWidth / 2 ? 1 : -1;
  }, []);

  const write = useCallback((pose: LocoPose) => {
    if (moverRef.current) {
      moverRef.current.style.transform = `translate(${pose.tx.toFixed(1)}px, ${pose.ty.toFixed(1)}px)`;
    }
    if (bodyRef.current) {
      bodyRef.current.style.transform =
        `rotate(${pose.rot.toFixed(1)}deg) scale(${pose.sx.toFixed(3)}, ${pose.sy.toFixed(3)})`;
    }
    if (shadowRef.current) {
      shadowRef.current.style.transform = `translateX(${pose.tx.toFixed(1)}px) scale(${pose.shadowScale.toFixed(3)})`;
      shadowRef.current.style.opacity = pose.shadowOpacity.toFixed(3);
    }
    if (pose.phase !== phaseRef.current) {
      phaseRef.current = pose.phase;
      setPhase(pose.phase);
    }
  }, []);

  /** Dust at the pet's feet, or a confetti burst, spawned into the fx layer. */
  const spawn = useCallback((kind: "dust" | "confetti") => {
    const fx = fxRef.current;
    if (!fx) return;
    const s = sizeRef.current;
    const cx = state.current.x + s / 2;
    const count = kind === "dust" ? 4 : 22;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = kind === "dust" ? "pet-dust" : "pet-confetti";
      el.style.left = `${cx}px`;
      el.style.top = kind === "dust" ? `${s - 6}px` : `${s * 0.3}px`;
      if (kind === "dust") {
        el.style.setProperty("--dx", `${(i - (count - 1) / 2) * 12}px`);
      } else {
        el.style.setProperty("--dx", `${Math.round((Math.random() - 0.5) * 280)}px`);
        el.style.setProperty("--dy", `${Math.round(30 + Math.random() * 140)}px`);
        el.style.setProperty("--c", CONFETTI[i % CONFETTI.length]);
        el.style.animationDelay = `${(Math.random() * 0.15).toFixed(2)}s`;
      }
      fx.appendChild(el);
      window.setTimeout(() => el.remove(), kind === "dust" ? 600 : 1700);
    }
  }, []);

  /**
   * An emotion's particles, thrown once as it starts: sparks for Cheer, a heart
   * for Supportive, "ha"s for Amused and so on. Same fx layer and the same
   * self-removing `<span>` pattern as the dust and confetti above; each kind's
   * flight is its own `pet-p-*` keyframe in `globals.css`, steered by `--dx`,
   * `--dy` and a stagger. Reduced motion hides them there, and does nothing
   * here — a particle is decoration, never the only signal.
   */
  const burst = useCallback((kind: PetParticle, count: number) => {
    const fx = fxRef.current;
    if (!fx) return;
    const s = sizeRef.current;
    const cx = state.current.x + s / 2;
    const top = state.current.y + s * 0.2;
    const { glyph, life } = PARTICLES[kind];
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = `pet-particle pet-p-${kind}`;
      el.textContent = glyph(i);
      // Spread evenly across an arc over the head, with a little jitter so a
      // repeat never looks stamped.
      const spread = count === 1 ? 0 : i / (count - 1) - 0.5;
      const jitter = (Math.random() - 0.5) * 0.25;
      el.style.left = `${cx + (spread + jitter) * s * 0.7}px`;
      el.style.top = `${top}px`;
      el.style.setProperty("--dx", `${Math.round((spread + jitter) * s * 1.1)}px`);
      el.style.setProperty("--dy", `${Math.round(-s * (0.45 + Math.random() * 0.35))}px`);
      el.style.setProperty("--c", PARTICLE_COLOURS[i % PARTICLE_COLOURS.length]);
      el.style.animationDelay = `${(i * PARTICLES[kind].stagger).toFixed(2)}s`;
      fx.appendChild(el);
      window.setTimeout(() => el.remove(), (life + i * PARTICLES[kind].stagger) * 1000 + 100);
    }
  }, []);

  const tick = useCallback(
    (now: number) => {
      const dt = Math.min(0.033, (now - last.current) / 1000);
      last.current = now;
      const r = step(state.current, dt, bounds(), { returnHome: true });
      state.current = r.state;
      for (const e of r.events) spawn(e === "celebrateLand" ? "confetti" : "dust");
      write(poseOf(r.state));

      const home = isHome(r.state) && Math.abs(r.state.squash - 1) < 0.005;
      if (home) {
        state.current = REST;
        write(poseOf(REST));
        raf.current = null;
        if (movingRef.current) {
          movingRef.current = false;
          setMoving(false);
        }
        return;
      }
      raf.current = requestAnimationFrame((t) => frame.current(t));
    },
    [bounds, spawn, write],
  );

  useEffect(() => {
    frame.current = tick;
  }, [tick]);

  const ensureRunning = useCallback(() => {
    if (!movingRef.current) {
      movingRef.current = true;
      setMoving(true);
    }
    if (raf.current !== null) return;
    last.current = performance.now();
    raf.current = requestAnimationFrame((t) => frame.current(t));
  }, []);

  /** Play one move. CSS moves restart their keyframe; physics moves start the loop. */
  const play = useCallback(
    (move: PetMove) => {
      if (reducedMotion || !homeRef.current) return;
      if (!PHYSICS.has(move)) {
        const el = cssMoveRef.current;
        if (!el) return;
        clearCssMove(el);
        // Force a reflow so re-adding the same class restarts the animation.
        void el.offsetWidth;
        el.classList.add(CSS_MOVE_PREFIX + move);
        return;
      }
      state.current = startMove(state.current, move, bounds(), { dir: towardStudent() });
      ensureRunning();
    },
    [reducedMotion, bounds, towardStudent, ensureRunning],
  );

  /** Walk or run to an offset from home — used by wander. */
  const goTo = useCallback(
    (x: number, gait: "walk" | "run") => {
      if (reducedMotion || !homeRef.current) return;
      state.current = travelTo(state.current, x, gait, bounds());
      ensureRunning();
    },
    [reducedMotion, bounds, ensureRunning],
  );

  /** Snap home and stop — the student picked the pet up. */
  const reset = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    state.current = REST;
    write(poseOf(REST));
    if (cssMoveRef.current) clearCssMove(cssMoveRef.current);
    if (movingRef.current) {
      movingRef.current = false;
      setMoving(false);
    }
  }, [write]);

  useEffect(() => {
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, []);

  // Reduced motion switched on mid-trip: go home now rather than finish it.
  useEffect(() => {
    if (!reducedMotion) return;
    const id = requestAnimationFrame(reset);
    return () => cancelAnimationFrame(id);
  }, [reducedMotion, reset]);

  /** Offset of the pet from home right now, for callers that need to aim. */
  const offsetX = useCallback(() => state.current.x, []);

  return { moverRef, bodyRef, cssMoveRef, shadowRef, fxRef, play, goTo, reset, burst, phase, moving, offsetX };
}

/** Copied first: removing from a live `DOMTokenList` mid-iteration skips entries. */
function clearCssMove(el: HTMLElement) {
  for (const c of Array.from(el.classList)) {
    if (c.startsWith(CSS_MOVE_PREFIX)) el.classList.remove(c);
  }
}

const CONFETTI = ["#edab30", "#D4537E", "#378ADD", "#1D9E75", "#D85A30", "#7F77DD"];

/**
 * What each particle is: its glyph (by index, so a burst can mix), how long
 * its keyframe runs (s), and the stagger between siblings (s). Glyphs rather
 * than drawn shapes: one text node each, crisp at any size, coloured by CSS.
 */
const PARTICLES: Record<PetParticle, { glyph: (i: number) => string; life: number; stagger: number }> = {
  spark: { glyph: () => "✦", life: 0.8, stagger: 0.06 },
  lift: { glyph: () => "✦", life: 1.4, stagger: 0.25 },
  burst: { glyph: (i) => (i % 3 === 0 ? "●" : "✦"), life: 1.0, stagger: 0.02 },
  heart: { glyph: () => "♥", life: 1.9, stagger: 0.3 },
  ha: { glyph: (i) => (i % 2 ? "ha!" : "ha"), life: 1.1, stagger: 0.22 },
  twinkle: { glyph: (i) => (i % 2 ? "✧" : "✦"), life: 1.3, stagger: 0.14 },
};

/** Only the multicolour `burst` reads `--c`; the others are coloured in CSS. */
const PARTICLE_COLOURS = ["#edab30", "#D4537E", "#378ADD", "#1D9E75", "#7F77DD"];
