"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { Expression } from "blobatar";
import { thinking, happy, idle } from "blobatar/expression";
import { StudentBlobatar } from "@/features/student/components/StudentBlobatar";
import { celebrationPose, encouragingPose, excitedPose } from "@/features/student/theme/petExpressions";
import {
  REST,
  isSettled,
  poseOf,
  step,
  travelTo,
  type LocoBounds,
  type LocoPose,
  type LocoState,
} from "@/features/student/utils/petLocomotion";

/** The perched creature, px. Big enough to read its face, small enough not to crowd the header. */
export const PERCH_SIZE = 56;
/** Room left at each end so the pet never overhangs the panel's rounded corners. */
const CORNER_INSET = 20;
/** Room for the flag at the far end, so the pet stops beside it rather than on it. */
const FLAG_ROOM = 26;
/** Further than this in one go and the trip is a run. */
const RUN_PX = 140;
/**
 * The blobatar draws its body inside some padding, so its feet sit this far
 * (as a fraction of its size) above the bottom of its box. The pet is lowered
 * by that much to stand on the edge rather than hover over it.
 */
const FOOT_PAD = 0.16;
/** How high the finish bounce may rise above the panel. */
const MAX_RISE = 90;

/** How far along the ledge the pet may go, px, for a ledge `trackWidth` wide. */
function room(trackWidth: number, size: number): number {
  return Math.max(0, trackWidth - size - FLAG_ROOM);
}

/**
 * Where on the ledge the pet stands for a given progress, 0–1, as an offset
 * from the left end. Pure, so the mapping is testable without a DOM.
 */
export function perchOffset(progress: number, trackWidth: number, size = PERCH_SIZE): number {
  return Math.round(Math.min(1, Math.max(0, progress)) * room(trackWidth, size));
}

/** A short hop between questions is a walk; a long one (a big block) is a run. */
export function perchGait(from: number, to: number): "walk" | "run" {
  return Math.abs(to - from) > RUN_PX ? "run" : "walk";
}

/**
 * The student's own creature, perched on the top edge of the placement board,
 * walking toward a finish flag as the test goes on.
 *
 * **Progress only — never correctness.** It moves on `progress`
 * (`currentIndex / totalItems`), wears a thinking face while a block is being
 * sent, and turns happy past halfway. It has no input for how an answer went,
 * and must never get one: the placement store deliberately carries no
 * per-answer `is_correct` (see `types/placement.ts`), and a creature that
 * frowned after a wrong answer would leak exactly what that design hides.
 *
 * Reuses the desk pet's physics (`petLocomotion.step` / `poseOf`) for the
 * step bob, lean, landing squash and the celebration bounce, but not
 * `usePetLocomotion`: that hook's bounds are the viewport and it always walks
 * home, whereas this pet's world is one ledge and it stays where progress
 * puts it. The loop is the same shape — scheduled only while moving, writing
 * transforms through refs, re-rendering only when the coarse phase flips.
 *
 * Decorative: `aria-hidden`, and outside the dialog's focus trap. Progress is
 * announced by the rail's `role="progressbar"`, completion by the complete
 * screen.
 */
export function PlacementPerchPet({
  progress,
  finished,
  submitting,
}: {
  /** 0–1: how far through the test the student is. */
  progress: number;
  /** The complete screen: run to the flag and celebrate. */
  finished: boolean;
  /** A block is being sent — think. */
  submitting: boolean;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const trackRef = useRef<HTMLDivElement>(null);
  const moverRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);

  const state = useRef<LocoState>(REST);
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  /** The frame callback, held in a ref so the loop can reschedule itself. */
  const frame = useRef<(now: number) => void>(() => {});
  const widthRef = useRef(0);
  /** How high a jump may go right now: `MAX_RISE`, less on a short window. */
  const riseRef = useRef(MAX_RISE);
  /**
   * A trip asked for while the pet was in the air. `travelTo` ignores an
   * airborne pet, so the trip waits here and starts on landing.
   */
  const pending = useRef<{ x: number; celebrate: boolean } | null>(null);
  const [phase, setPhase] = useState<LocoPose["phase"]>("ground");
  const phaseRef = useRef<LocoPose["phase"]>("ground");
  const [crowned, setCrowned] = useState(false);

  const bounds = useCallback(
    (): LocoBounds => ({ minX: 0, maxX: room(widthRef.current, PERCH_SIZE), maxRise: riseRef.current }),
    [],
  );

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

  /** Same particles as the desk pet (`.pet-dust` / `.pet-confetti` in globals.css). */
  const spawn = useCallback((kind: "dust" | "confetti") => {
    const fx = fxRef.current;
    if (!fx) return;
    const cx = state.current.x + PERCH_SIZE / 2;
    const count = kind === "dust" ? 4 : 26;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = kind === "dust" ? "pet-dust" : "pet-confetti";
      el.style.left = `${cx}px`;
      el.style.top = kind === "dust" ? `${PERCH_SIZE - 6}px` : `${PERCH_SIZE * 0.3}px`;
      if (kind === "dust") {
        el.style.setProperty("--dx", `${(i - (count - 1) / 2) * 12}px`);
      } else {
        el.style.setProperty("--dx", `${Math.round((Math.random() - 0.5) * 300)}px`);
        el.style.setProperty("--dy", `${Math.round(40 + Math.random() * 160)}px`);
        el.style.setProperty("--c", CONFETTI[i % CONFETTI.length]);
        el.style.animationDelay = `${(Math.random() * 0.15).toFixed(2)}s`;
      }
      fx.appendChild(el);
      window.setTimeout(() => el.remove(), kind === "dust" ? 600 : 1700);
    }
  }, []);

  /** Start a trip to `x`, ending in the celebration bounce if asked. */
  const head = useCallback(
    (x: number, celebrate: boolean) => {
      const s = state.current;
      if (s.air) {
        pending.current = { x, celebrate };
        return;
      }
      pending.current = null;
      // Read once per trip, not per frame: the room above the board, so the
      // finish bounce never leaves the top of a short window.
      const top = trackRef.current?.getBoundingClientRect().top ?? MAX_RISE;
      riseRef.current = Math.max(0, Math.min(MAX_RISE, top - 8));
      const next = travelTo(s, x, celebrate ? "run" : perchGait(s.x, x), bounds());
      // `celebrating` makes `step` bounce on arrival (→ `celebrateLand` on the last landing).
      state.current = { ...next, celebrating: celebrate };
    },
    [bounds],
  );

  const tick = useCallback(
    (now: number) => {
      const dt = Math.min(0.033, (now - last.current) / 1000);
      last.current = now;
      const r = step(state.current, dt, bounds());
      state.current = r.state;
      for (const e of r.events) {
        if (e === "celebrateLand") {
          spawn("confetti");
          setCrowned(true);
        } else {
          spawn("dust");
        }
      }
      if (!r.state.air && pending.current) head(pending.current.x, pending.current.celebrate);
      write(poseOf(state.current));

      if (isSettled(state.current) && Math.abs(state.current.squash - 1) < 0.005) {
        state.current = { ...state.current, squash: 1 };
        write(poseOf(state.current));
        raf.current = null;
        return;
      }
      raf.current = requestAnimationFrame((t) => frame.current(t));
    },
    [bounds, head, spawn, write],
  );

  useEffect(() => {
    frame.current = tick;
  }, [tick]);

  const run = useCallback(() => {
    if (raf.current !== null) return;
    last.current = performance.now();
    raf.current = requestAnimationFrame((t) => frame.current(t));
  }, []);

  /** Stand at `x` now, no trip — reduced motion. */
  const place = useCallback(
    (x: number) => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      pending.current = null;
      state.current = { ...REST, x };
      write(poseOf(state.current));
    },
    [write],
  );

  // Track the ledge's width. The board changes width between phases (640px
  // bookends, 1180px item screen), so a pet standing 40% along stays 40% along.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      const prev = widthRef.current;
      const next = el.clientWidth;
      if (next === prev) return;
      widthRef.current = next;
      if (prev === 0) return;
      const rescale = (x: number) => perchOffset(x / Math.max(1, room(prev, PERCH_SIZE)), next);
      const s = state.current;
      state.current = { ...s, x: rescale(s.x), target: s.target === null ? null : rescale(s.target) };
      if (pending.current) pending.current = { ...pending.current, x: rescale(pending.current.x) };
      write(poseOf(state.current));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [write]);

  // Go where progress says; on the complete screen, to the flag.
  useEffect(() => {
    const goal = perchOffset(finished ? 1 : progress, widthRef.current);
    if (reducedMotion) {
      place(goal);
      // No bounce to finish, so the finish is marked straight away.
      if (finished) {
        const id = requestAnimationFrame(() => setCrowned(true));
        return () => cancelAnimationFrame(id);
      }
      return;
    }
    const s = state.current;
    if (!finished && s.target === null && !s.air && Math.abs(goal - s.x) < 1) return;
    head(goal, finished);
    run();
  }, [progress, finished, reducedMotion, head, place, run]);

  useEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  const face = faceFor({ phase, submitting, finished, crowned, pastHalf: progress >= 0.5 });

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      className="absolute bottom-full pointer-events-none"
      style={{ left: CORNER_INSET, right: CORNER_INSET, height: PERCH_SIZE }}
    >
      <FinishFlag reached={crowned} />

      {/* Contact shadow on the panel's edge — stays put while the pet leaves it. */}
      <div
        ref={shadowRef}
        style={{
          position: "absolute",
          left: PERCH_SIZE * 0.18,
          bottom: -5,
          width: PERCH_SIZE * 0.64,
          height: 10,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(4,30,32,0.34), rgba(4,30,32,0))",
        }}
      />
      {/* Dust and confetti land here, not on the moving creature. */}
      <div ref={fxRef} style={{ position: "absolute", inset: 0, overflow: "visible" }} />

      <div
        ref={moverRef}
        style={{
          position: "absolute",
          left: 0,
          top: Math.round(PERCH_SIZE * FOOT_PAD),
          width: PERCH_SIZE,
          height: PERCH_SIZE,
          willChange: "transform",
        }}
      >
        {/* The citron is a halo, not a recolour: the creature is the student's
            own and keeps its own colours even when it wins. */}
        <div
          className="pl-perch-halo"
          data-on={crowned || undefined}
          style={{ position: "absolute", inset: -14, borderRadius: "50%" }}
        />
        <div ref={bodyRef} style={{ width: "100%", height: "100%", transformOrigin: "50% 100%" }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              filter: crowned
                ? "drop-shadow(0 0 6px rgb(217 242 121 / 0.95)) drop-shadow(0 4px 10px rgb(4 30 32 / 0.35))"
                : "drop-shadow(0 4px 10px rgb(4 30 32 / 0.35))",
              transition: "filter 0.5s ease",
            }}
          >
            <StudentBlobatar size={PERCH_SIZE} animate="always" expression={face} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The face to wear. A move borrows a face — wide-eyed on the way up, a grin on
 * the way down, keen while running — the same way the desk pet's idle does;
 * at rest it is thinking while a block sends, happy past halfway, calm before.
 */
function faceFor({
  phase,
  submitting,
  finished,
  crowned,
  pastHalf,
}: {
  phase: LocoPose["phase"];
  submitting: boolean;
  finished: boolean;
  crowned: boolean;
  pastHalf: boolean;
}): Expression {
  if (crowned) return celebrationPose;
  if (phase === "rising") return excitedPose;
  if (phase === "falling") return happy;
  if (phase === "running") return encouragingPose;
  if (submitting) return thinking;
  if (finished || pastHalf) return happy;
  return idle;
}

/** A pennant at the far end of the ledge; it lights up citron once the pet gets there. */
function FinishFlag({ reached }: { reached: boolean }) {
  return (
    <svg
      width="22"
      height="34"
      viewBox="0 0 22 34"
      className="pl-perch-flag"
      data-reached={reached || undefined}
      style={{ position: "absolute", right: 0, bottom: 0, overflow: "visible" }}
    >
      <rect x="2" y="2" width="2.4" height="32" rx="1.2" fill="var(--pl-perch-pole)" />
      <path className="pl-perch-pennant" d="M4.4 3 L20 8.5 L4.4 14 Z" />
    </svg>
  );
}

const CONFETTI = ["#D9F279", "#075E63", "#9FD4C9", "#D4537E", "#378ADD", "#F6F7F2"];
