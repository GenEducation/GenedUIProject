/**
 * Locomotion for the desk pet: the physics that lets it hop, bounce, run and
 * jump across the screen.
 *
 * Pure and frame-rate independent — `step(state, dt, bounds)` in, new state
 * out — so it is unit-tested without a DOM and driven by `usePetLocomotion`,
 * which owns the animation frame and writes the result to the page.
 *
 * Coordinates are an **offset from the pet's home spot** (where the student
 * put it): `x` right, `y` up-is-negative, both in CSS px. Travel is horizontal
 * only, along the line the pet already sits on, so it never wanders into a
 * part of the page the student did not choose. Every trip ends by walking
 * back to `x = 0`.
 */

import type { PetMove } from "../theme/petExpressions";

/** px/s². Tuned by eye in the preview: floaty enough to read, quick enough not to drag. */
export const GRAVITY = 1500;
export const WALK_SPEED = 85;
export const RUN_SPEED = 270;
/** Rest this long away from home and the pet walks back. */
export const RETURN_HOME_S = 1.5;
/** Launch speeds, px/s upward. */
export const HOP_V = 420;
export const BOUNCE_V = 430;
export const JUMP_V = 640;
/** Each successive bounce is this fraction of the last. */
export const BOUNCE_DECAY = 0.85;
/** Squash on landing (1 = none), springing back at `SQUASH_RATE`. */
export const LAND_SQUASH = 0.72;
const SQUASH_RATE = 14;
const SCOOT_PX = 36;
const PACE_PX = 50;
const RETREAT_PX = 22;
/** Further from home than this and the return trip is a run. */
const RUN_HOME_PX = 150;
/** How far from home an idle excursion or a jump may land. */
export const WANDER_RANGE = 220;
/** Encouraging's skip: how far sideways the single jump carries it. */
export const SKIP_PX = 64;
/**
 * Celebration: a grounded, happy bounce on the spot — a few hops, the first a
 * touch higher than an ordinary bounce so it still reads as the biggest
 * moment — with the confetti on the last landing.
 */
export const CELEBRATE_HOPS = 3;
export const CELEBRATE_V = 480;

/** Moves that cross the screen; everything else stays on the spot. */
export const TRAVELLING: ReadonlySet<PetMove> = new Set<PetMove>([
  "walk", "run", "jump", "scoot", "pace", "retreat", "skip",
]);

/** Moves drawn by physics here. The rest are one-shot CSS keyframes on the body. */
export const PHYSICS: ReadonlySet<PetMove> = new Set<PetMove>([
  "walk", "run", "jump", "celebrate", "scoot", "pace", "retreat", "skip",
  "hop", "bounce", "jitterBounce",
]);

export interface LocoBounds {
  /** Horizontal offsets the pet may reach without leaving the viewport. */
  minX: number;
  maxX: number;
  /** Highest it may rise (a positive distance), so a jump never leaves the top. */
  maxRise: number;
}

type Gait = "walk" | "run";

export interface LocoState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  air: boolean;
  /** Hops still to come in a bounce, including the one in flight. */
  hops: number;
  hopV: number;
  /** Tiny sideways kick per hop, for the jitter-bounce. */
  jitter: boolean;
  /** 1 facing right, -1 facing left. */
  face: 1 | -1;
  /** Where it is walking or running to; `null` when not travelling. */
  target: number | null;
  gait: Gait;
  /** Targets queued after the current one (pace). */
  queue: number[];
  /** Stride phase, radians — drives the step bob. */
  stride: number;
  /** Squash factor, springing back toward 1. */
  squash: number;
  /** Seconds spent at rest away from home. */
  restFor: number;
  /** Celebrate once the current trip arrives (the placement pet, at its flag). */
  celebrating: boolean;
  /** The current bounce is a celebration: its last landing is the finale. */
  finale: boolean;
}

export const REST: LocoState = {
  x: 0, y: 0, vx: 0, vy: 0, air: false, hops: 0, hopV: 0, jitter: false,
  face: 1, target: null, gait: "walk", queue: [],
  stride: 0, squash: 1, restFor: 0, celebrating: false, finale: false,
};

/**
 * Something the renderer should know about: a landing (dust), or the last
 * landing of a celebration — its finale (confetti).
 */
export type LocoEvent = "land" | "celebrateLand";

export function isMoving(s: LocoState): boolean {
  return s.air || s.target !== null || s.queue.length > 0 || Math.abs(s.squash - 1) > 0.01;
}

/** At rest, home or not. */
export function isSettled(s: LocoState): boolean {
  return !s.air && s.target === null && s.queue.length === 0;
}

/** Settled on the home spot. */
export function isHome(s: LocoState): boolean {
  return isSettled(s) && Math.abs(s.x) < 0.5;
}

const clampX = (x: number, b: LocoBounds) => Math.min(b.maxX, Math.max(b.minX, x));

/** A launch speed capped so the apex stays inside `maxRise`. */
function launchSpeed(v: number, b: LocoBounds): number {
  const cap = Math.sqrt(2 * GRAVITY * Math.max(0, b.maxRise));
  return Math.min(v, cap);
}

function launch(s: LocoState, v: number, vx: number, b: LocoBounds): LocoState {
  const face: 1 | -1 = vx > 0 ? 1 : vx < 0 ? -1 : s.face;
  return { ...s, air: true, vy: -launchSpeed(v, b), vx, squash: 0.82, face, restFor: 0 };
}

/** Celebration's bounce, from wherever the pet stands. */
function celebrationBounce(s: LocoState, b: LocoBounds): LocoState {
  return { ...launch(s, CELEBRATE_V, 0, b), hops: CELEBRATE_HOPS, hopV: CELEBRATE_V, finale: true };
}

/**
 * Start a move. `dir` is which way "toward the student" is (sign of the
 * direction to the screen centre), for moves that approach or back away.
 * `rand` is injectable so tests can pin the jump target.
 */
export function startMove(
  s: LocoState,
  move: PetMove,
  b: LocoBounds,
  opts: { dir: 1 | -1; rand?: () => number },
): LocoState {
  const rand = opts.rand ?? Math.random;
  // Only a landed pet starts a new physics move; a mid-air one finishes first.
  if (s.air) return s;
  const base: LocoState = { ...s, restFor: 0, celebrating: false, finale: false, queue: [], jitter: false };

  switch (move) {
    case "hop":
      return launch(base, HOP_V, 0, b);
    case "bounce":
      return { ...launch(base, BOUNCE_V, 0, b), hops: 3, hopV: BOUNCE_V };
    case "jitterBounce":
      return { ...launch(base, 300, 0, b), hops: 5, hopV: 300, jitter: true };
    case "jump": {
      // Lands somewhere near home, not anywhere on screen.
      const tx = clampX((rand() * 2 - 1) * WANDER_RANGE, b);
      // Time aloft for a full-height jump is 2v/g; spread the travel over it.
      const v = launchSpeed(JUMP_V, b);
      const vx = (tx - s.x) / Math.max(0.3, (2 * v) / GRAVITY);
      return launch(base, JUMP_V, vx, b);
    }
    case "walk":
    case "run":
      // A walk or run with no explicit target goes toward the student a little.
      return { ...base, target: clampX(s.x + opts.dir * SCOOT_PX * 2, b), gait: move };
    case "scoot":
      return { ...base, target: clampX(s.x + opts.dir * SCOOT_PX, b), gait: "run" };
    case "retreat": {
      // A small hop *away*, still facing the student.
      const next = launch(base, 260, -opts.dir * (RETREAT_PX / 0.35), b);
      return { ...next, face: opts.dir };
    }
    case "pace":
      return {
        ...base,
        target: clampX(s.x - PACE_PX, b),
        gait: "walk",
        queue: [clampX(s.x + PACE_PX, b), s.x],
      };
    case "skip": {
      // Encouraging: one springy jump sideways — to the right, unless the pet
      // is parked against the right edge, when it goes left instead.
      const dir: 1 | -1 = s.x + SKIP_PX <= b.maxX ? 1 : -1;
      const v = launchSpeed(HOP_V * 1.1, b);
      return launch(base, HOP_V * 1.1, (dir * SKIP_PX) / Math.max(0.3, (2 * v) / GRAVITY), b);
    }
    case "celebrate":
      // Grounded and the same every time: a happy bounce right where it is.
      return celebrationBounce(base, b);
    default:
      return s;
  }
}

/** Walk or run to an explicit offset (wander, return home). */
export function travelTo(s: LocoState, x: number, gait: Gait, b: LocoBounds): LocoState {
  if (s.air) return s;
  return { ...s, target: clampX(x, b), gait, queue: [], restFor: 0 };
}

/** Stop dead and go home instantly — a drag picked the pet up. */
export function reset(): LocoState {
  return REST;
}

/**
 * Advance the simulation by `dt` seconds.
 *
 * `returnHome` walks the pet back to `x = 0` after `RETURN_HOME_S` at rest,
 * which is what keeps every trip a round trip.
 */
export function step(
  prev: LocoState,
  dt: number,
  b: LocoBounds,
  opts: { returnHome?: boolean } = {},
): { state: LocoState; events: LocoEvent[] } {
  const events: LocoEvent[] = [];
  let s = { ...prev };

  if (s.air) {
    s.vy += GRAVITY * dt;
    s.y += s.vy * dt;
    s.x += s.vx * dt;
    // Bounce off the viewport edges rather than leaving it.
    if (s.x < b.minX || s.x > b.maxX) {
      s.x = clampX(s.x, b);
      s.vx = -s.vx * 0.6;
    }

    if (s.y >= 0 && s.vy > 0) {
      s.y = 0;
      s.air = false;
      s.vx = 0;
      s.squash = LAND_SQUASH;
      if (s.hops > 1) {
        events.push("land");
        s.hops -= 1;
        s.hopV *= BOUNCE_DECAY;
        const kick = s.jitter ? (s.hops % 2 ? 40 : -40) : 0;
        s = launch(s, s.hopV, kick, b);
      } else {
        // The last landing: a celebration's is its finale.
        events.push(s.finale ? "celebrateLand" : "land");
        s.hops = 0;
        s.jitter = false;
        s.finale = false;
      }
    }
  } else if (s.target !== null) {
    const dx = s.target - s.x;
    const speed = s.gait === "run" ? RUN_SPEED : WALK_SPEED;
    if (Math.abs(dx) < 2) {
      s.x = s.target;
      s.target = null;
      s.stride = 0;
      if (s.queue.length > 0) {
        const [next, ...rest] = s.queue;
        s.target = next;
        s.queue = rest;
      } else if (s.celebrating) {
        s.celebrating = false;
        s = celebrationBounce(s, b);
      } else {
        s.squash = 0.88;
      }
    } else {
      const dir: 1 | -1 = dx > 0 ? 1 : -1;
      s.face = dir;
      s.x += dir * Math.min(Math.abs(dx), speed * dt);
      s.stride += dt * (s.gait === "run" ? 15 : 8);
    }
    s.restFor = 0;
  } else {
    s.restFor += dt;
    if (opts.returnHome && Math.abs(s.x) > 1 && s.restFor >= RETURN_HOME_S) {
      // A long way out is a jog home, not a stroll.
      s = { ...s, target: 0, gait: Math.abs(s.x) > RUN_HOME_PX ? "run" : "walk", restFor: 0 };
    }
  }

  s.squash += (1 - s.squash) * Math.min(1, dt * SQUASH_RATE);
  return { state: s, events };
}

/** What to draw for a state: body transform and contact shadow. */
export interface LocoPose {
  /** Offset of the whole pet from home. */
  tx: number;
  ty: number;
  /** Body rotation, degrees (the lean). */
  rot: number;
  /** Body scale; `sx` carries the facing flip. */
  sx: number;
  sy: number;
  /** Contact shadow scale and opacity, 0–1. */
  shadowScale: number;
  shadowOpacity: number;
  /** Which way it is going vertically, so the face can follow. */
  phase: "ground" | "rising" | "falling" | "running";
}

export function poseOf(s: LocoState): LocoPose {
  let bob = 0;
  let lean = 0;
  let sx = 1;
  let sy = 1;
  let phase: LocoPose["phase"] = "ground";

  if (s.air) {
    // Stretched in flight, more the faster it moves.
    const st = Math.min(0.18, Math.abs(s.vy) / 2800);
    sy = 1 + st;
    sx = 1 - st * 0.7;
    phase = s.vy < 0 ? "rising" : "falling";
  } else if (s.target !== null) {
    const running = s.gait === "run";
    bob = -Math.abs(Math.sin(s.stride)) * (running ? 11 : 4);
    lean = s.face * (running ? 9 : 3);
    const c = Math.abs(Math.cos(s.stride));
    sy = 1 - c * (running ? 0.07 : 0.03);
    sx = 1 + c * (running ? 0.05 : 0.02);
    phase = running ? "running" : "ground";
  }

  // Landing squash: short and wide, conserving roughly the same area.
  sy *= s.squash;
  sx *= 2 - s.squash;

  const height = Math.min(1, -(s.y + bob) / 160);
  return {
    tx: s.x,
    ty: s.y + bob,
    rot: lean,
    sx: sx * s.face,
    sy,
    shadowScale: 1 - height * 0.5,
    shadowOpacity: 1 - height * 0.6,
    phase,
  };
}

/**
 * The move to actually play for an emotion.
 *
 * When travelling is suppressed (typing, a test, a modal, a voice turn) a
 * travelling move degrades to its in-place equivalent — or to nothing — so the
 * emotion still shows but the pet does not cross the screen mid-question.
 */
export function resolveMove(
  move: PetMove | undefined,
  inPlace: PetMove | null | undefined,
  travelSuppressed: boolean,
): PetMove | null {
  if (!move) return null;
  if (!travelSuppressed || !TRAVELLING.has(move)) return move;
  return inPlace === undefined ? null : inPlace;
}

/**
 * A random idle excursion around home: mostly strolls, sometimes a hop or a
 * bounce, rarely a run or a jump. `blocked` rejects targets that would land
 * the pet on something the student is using.
 */
export function wanderPick(
  b: LocoBounds,
  rand: () => number = Math.random,
  blocked: (x: number) => boolean = () => false,
): { move: PetMove; target?: number } {
  const r = rand();
  const pickTarget = () => {
    for (let i = 0; i < 4; i++) {
      const x = clampX((rand() * 2 - 1) * WANDER_RANGE, b);
      if (!blocked(x)) return x;
    }
    return 0;
  };
  if (r < 0.45) return { move: "walk", target: pickTarget() };
  if (r < 0.65) return { move: "hop" };
  if (r < 0.8) return { move: "bounce" };
  if (r < 0.93) return { move: "run", target: pickTarget() };
  return { move: "jump" };
}
