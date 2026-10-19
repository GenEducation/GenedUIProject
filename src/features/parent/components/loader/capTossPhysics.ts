/**
 * Physics for the "cap toss" logo animation — a small, deterministic
 * simulation, independent of React so it can be tested and previewed alone.
 *
 * Units are logo pixels (the logo image is 354×140) and seconds; y points
 * down, as on screen. Masses are in grams. The story, in the spirit of
 * Google's logo animation:
 *
 *  1. The G pops in alone, centred.
 *  2. The cap is thrown onto it and bounces to rest (two-body collision with
 *     restitution; the G gives on its spring).
 *  3. The G, wearing the cap, slides left; it uncovers "e n E d" as it
 *     goes, and each springs up in its place as it comes out.
 *
 * The throw is real projectile motion of a real object. The cap — board and
 * crown — is a rigid body whose centre of mass and moment of inertia come
 * from the outlines and weights of its parts. It flies under gravity and air
 * drag and spins freely: nothing scripts its turn. The tassel is a rope
 * (a chain of light cord nodes) with the star charm hinged to its end, and
 * it pulls back on the cap as the cap pulls it, so the two move together the
 * way a real one does. The hand's throw — launch speed and spin — is solved
 * by running this same simulation until the cap comes down upright on the G.
 *
 * Integration is position-based (Verlet / PBD) at a fixed 240 Hz step.
 */

export const LOGO_W = 354;
export const LOGO_H = 140;

/** Where things are on the logo image. */
export const CAP_CENTRE = { x: 72, y: 26 };
export const KNOT = { x: 18.5, y: 42 };
/** Where the cord meets the star, and the star's centre, on the image. */
export const STAR_TOP = { x: 18, y: 63 };
export const SPARKLE_CENTRE = { x: 18, y: 75 };
/** Horizontal centre of each letter on the image: G, e, n, E, d. */
export const LETTER_CENTRES = [75, 148, 205, 260, 320];

/**
 * The cap as solid shapes (convex, clockwise on screen, image coords): the
 * mortarboard and the crown under it. They give the cap its mass
 * distribution, and the tassel can't pass through them, so it drapes over
 * the brim instead of vanishing into the cap.
 */
export const CAP_SOLIDS: Point[][] = [
  [{ x: 12, y: 36 }, { x: 70, y: 5 }, { x: 133, y: 20 }, { x: 98, y: 38 }, { x: 58, y: 41 }, { x: 16, y: 41 }],
  [{ x: 22, y: 41 }, { x: 66, y: 41 }, { x: 43, y: 58 }],
];

/** The G's right edge on the image. */
export const G_RIGHT_EDGE = 120;
/** Where e, n, E and d sit on the image, as [left, right] in x. */
export const LETTER_SLOTS: [number, number][] = [[120, 177], [177, 233], [233, 288], [288, 354]];

/** How far right of its final place the G starts (so it starts centred). */
export const G_START_X = LOGO_W / 2 - LETTER_CENTRES[0];

export const PHYSICS = {
  // px/s². With g = 9.81 m/s² this sets the scale: ≈364 px per metre, so the
  // cap (≈130 px across) is a ≈36 cm mortarboard.
  gravity: 3570,
  gPop: { stiffness: 420, damping: 17, drop: 26 },
  cap: {
    launchAt: 0.25, // s
    flightTime: 0.55, // s
    from: { x: -230, y: 170 }, // launch point, relative to where it lands
    spinDeg: -380, // its angle as it leaves the hand; it turns to 0 by landing
  },
  // What each part weighs (g), like a real graduation cap.
  mass: {
    board: 55, // the mortarboard
    crown: 35, // the skull cap under it
    cord: 4, // the tassel's cord
    star: 2.5, // the charm on its end
  },
  air: {
    // Quadratic drag, given as each part's terminal speed (m/s): the flat
    // cap is light for its size, the fringed cord catches a lot of air, and
    // the metal charm hardly any.
    terminal: { cap: 6, cord: 2, star: 9 },
    // Rotational air resistance on the spinning board (per radian).
    spinDrag: 0.01,
  },
  collision: {
    // A cap only hops when its restitution exceeds its mass ratio to the G.
    restitution: 0.55,
    restSpeed: 30, // px/s — slower relative impacts just settle
    massRatio: 0.2, // cap mass / G mass
    seatKick: 90, // deg/s of wobble as the cap seats
  },
  g: { stiffness: 700, damping: 26 }, // the G's vertical spring after impact
  slide: {
    delay: 0.2, // s after landing
    stiffness: 130,
    damping: 21, // ζ ≈ 0.92: one smooth, barely-overshooting glide
    // A spring released from rest pushes hardest at the first instant; cap
    // the push so the slide starts like a firm shove, not a jolt (px/s²).
    maxAccel: 2600,
  },
  // Cap tilt: a torsional spring; inertia tips the crown back (the way it
  // came from) as the G accelerates (deg/s² of tilt per px/s² of the G's
  // acceleration).
  seat: { stiffness: 520, damping: 26, inertia: 0.5 },
  letters: {
    stiffness: 320,
    damping: 19, // a little bounce as each one lands in place
    // A letter springs up once the G has uncovered this share of its slot...
    uncovered: 0.5,
    // ...but never sooner than this after the slide starts or after the
    // letter before it, so the ones already in the open still pop in turn.
    firstAt: 0.04,
    stagger: 0.08,
    rise: 14,
    fromScale: 0.55,
  },
  rope: {
    segments: 10,
    length: 21, // knot → star, as drawn in the logo
    // Internal friction: share of the cord's swing (its motion relative to
    // the knot) kept per second, so it settles rather than ringing on.
    damping: 0.02,
    iterations: 15,
    // How far the cord (half its thickness) and the star's centre (its body)
    // keep from the cap's surface.
    cordRadius: 1.3,
    starRadius: 6,
    breeze: [
      { accel: 140, freq: 0.32, phase: 0 },
      { accel: 70, freq: 0.57, phase: 1.1 },
    ],
  },
  sparkle: { twinklePeriod: 2.7 },
} as const;

/** The cap lands at this time (s). */
export const LAND_AT = PHYSICS.cap.launchAt + PHYSICS.cap.flightTime;
/** The slide starts at this time (s). */
export const SLIDE_AT = LAND_AT + PHYSICS.slide.delay;
/** By now the logo has assembled and settled (s). */
export const SETTLED_AT = SLIDE_AT + 0.8;

const STEP = 1 / 240;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export interface Point {
  x: number;
  y: number;
}

export interface PieceFrame {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}

export interface TossFrame {
  time: number;
  /** G, e, n, E, d — offsets from each letter's place in the logo. */
  letters: PieceFrame[];
  /**
   * The G's trailing (right) edge in stage x. The other letters are only
   * drawn to the right of it: the G uncovers them as it slides away, and they
   * never show through its open middle.
   */
  revealX: number;
  /**
   * Offset and tilt of the cap from its place in the logo (turning about
   * CAP_CENTRE), and where its centre of mass is on the stage.
   */
  cap: { x: number; y: number; rotate: number; opacity: number; centreOfMass: Point };
  /** Rope from the knot to the top of the star, in stage coordinates. */
  rope: Point[];
  /** Offset of the star from its place in the logo, and its tilt. */
  sparkle: { x: number; y: number; rotate: number; scale: number; opacity: number };
  glow: { x: number; y: number; scale: number; opacity: number };
  settled: boolean;
}

interface Spring {
  x: number;
  v: number;
}

function springStep(s: Spring, target: number, k: number, c: number, dt: number) {
  s.v += (-k * (s.x - target) - c * s.v) * dt;
  s.x += s.v * dt;
}

/** Squash/stretch from vertical speed, keeping area constant. */
function stretch(vy: number) {
  const sy = 1 + Math.max(-0.22, Math.min(0.3, -vy / 1800));
  return { scaleY: sy, scaleX: 1 / Math.sqrt(sy) };
}

/** Area, centroid and ∫r²dA/A about the centroid of a uniform polygon. */
function lamina(poly: Point[]) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  let j = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const cross = p.x * q.y - q.x * p.y;
    a += cross / 2;
    cx += ((p.x + q.x) * cross) / 6;
    cy += ((p.y + q.y) * cross) / 6;
    j += (cross * (p.x * p.x + p.x * q.x + q.x * q.x + p.y * p.y + p.y * q.y + q.y * q.y)) / 12;
  }
  const c = { x: cx / a, y: cy / a };
  return { centroid: c, gyration: j / a - (c.x * c.x + c.y * c.y) };
}

/** The cap's mass, centre of mass (image coords) and moment of inertia. */
function capBody(board: number, crown: number) {
  const parts = [
    { m: board, ...lamina(CAP_SOLIDS[0]) },
    { m: crown, ...lamina(CAP_SOLIDS[1]) },
  ];
  const mass = board + crown;
  const cm = {
    x: parts.reduce((s, p) => s + p.m * p.centroid.x, 0) / mass,
    y: parts.reduce((s, p) => s + p.m * p.centroid.y, 0) / mass,
  };
  const inertia = parts.reduce(
    (s, p) => s + p.m * (p.gyration + (p.centroid.x - cm.x) ** 2 + (p.centroid.y - cm.y) ** 2),
    0,
  );
  return { mass, cm, inertia };
}

/** The cap as a rigid body: centre of mass on the stage, angle in degrees. */
interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
}

/** Everything that flies: the cap and its tassel (cord nodes, then the star). */
interface World {
  body: Body;
  nodes: Point[];
  prev: Point[];
}

const cloneWorld = (w: World): World => ({
  body: { ...w.body },
  nodes: w.nodes.map((p) => ({ ...p })),
  prev: w.prev.map((p) => ({ ...p })),
});

/** The throw that lands the cap, solved once per set of constants. */
let solvedThrow: { key: string; launch: [number, number, number] } | null = null;

export function createCapToss() {
  const P = PHYSICS;
  const g = P.gravity;
  let time = 0;
  let stepCount = 0;

  // ── G: pops up, gives under the cap, then slides left ─────────────────
  const gY: Spring = { x: P.gPop.drop, v: 0 };
  const gX: Spring = { x: G_START_X, v: 0 };
  let gXAccel = 0;

  // ── The other letters ──────────────────────────────────────────────────
  const letters = [1, 2, 3, 4].map(() => ({
    shown: false,
    shownAt: 0,
    y: { x: 0, v: 0 } as Spring,
    s: { x: 0, v: 0 } as Spring,
  }));

  // ── The cap's make-up ───────────────────────────────────────────────────
  const { mass: M, cm: CM, inertia: I } = capBody(P.mass.board, P.mass.crown);
  const n = P.rope.segments;
  const seg = P.rope.length / n;
  // Nodes 0…n are the cord (0 is the knot on the cap, n where the star is
  // sewn on). The star is a rigid piece hinged there: node n+1 is its centre
  // of mass, so it pivots and swings on its own.
  const hang = SPARKLE_CENTRE.y - STAR_TOP.y;
  const star = n + 1;
  const linkLength = (i: number) => (i < n ? seg : hang);
  // The cord's weight is spread along its nodes; the charm hangs at its own.
  const nodeMass = P.mass.cord / n;
  const invMass = (i: number) => (i === star ? 1 / P.mass.star : 1 / nodeMass);
  // Drag coefficient (per px) for a terminal speed in m/s: k = g / vt².
  const pxPerMetre = g / 9.81;
  const dragK = (terminal: number) => g / (terminal * pxPerMetre) ** 2;
  const kCap = dragK(P.air.terminal.cap);
  const kNode = (i: number) => dragK(i === star ? P.air.terminal.star : P.air.terminal.cord);

  // Image point on the cap → stage, and back, for a body pose.
  const toStage = (b: Body, p: Point): Point => {
    const r = rad(b.rot);
    const dx = p.x - CM.x;
    const dy = p.y - CM.y;
    return { x: b.x + dx * Math.cos(r) - dy * Math.sin(r), y: b.y + dx * Math.sin(r) + dy * Math.cos(r) };
  };
  const toImage = (b: Body, p: Point): Point => {
    const r = rad(b.rot);
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    return { x: CM.x + dx * Math.cos(r) + dy * Math.sin(r), y: CM.y - dx * Math.sin(r) + dy * Math.cos(r) };
  };
  // The renderer turns the cap about CAP_CENTRE; convert between that offset
  // and the centre of mass.
  const bodyAt = (offX: number, offY: number, rot: number): Body => {
    const b: Body = { x: 0, y: 0, vx: 0, vy: 0, rot, vrot: 0 };
    const c = toStage(b, CAP_CENTRE); // CAP_CENTRE relative to a body at the origin
    b.x = CAP_CENTRE.x + offX - c.x;
    b.y = CAP_CENTRE.y + offY - c.y;
    return b;
  };
  const offsetOf = (b: Body): Point => {
    const c = toStage(b, CAP_CENTRE);
    return { x: c.x - CAP_CENTRE.x, y: c.y - CAP_CENTRE.y };
  };

  /**
   * Move a point on a free cap and a tassel node apart (or together) by
   * `amount` along unit `nx, ny` (from the cap point to the node), sharing
   * the correction by their (generalised) inverse masses.
   */
  function separate(b: Body, at: Point, node: Point, wNode: number, nx: number, ny: number, amount: number, free: boolean) {
    const rx = at.x - b.x;
    const ry = at.y - b.y;
    const rn = rx * ny - ry * nx;
    const wBody = free ? 1 / M + (rn * rn) / I : 0;
    const lambda = amount / (wBody + wNode);
    node.x += nx * lambda * wNode;
    node.y += ny * lambda * wNode;
    if (free) {
      b.x -= (nx * lambda) / M;
      b.y -= (ny * lambda) / M;
      b.rot -= deg((rn * lambda) / I);
    }
  }

  // Keep a node out of the cap's solids, pushing it out across the nearest
  // face (and the cap the other way, if it's flying free).
  function collide(w: World, i: number, free: boolean) {
    const radius = i === star ? P.rope.starRadius : P.rope.cordRadius;
    for (const poly of CAP_SOLIDS) {
      const p = w.nodes[i];
      const l = toImage(w.body, p);
      let best = -Infinity;
      let nx = 0;
      let ny = 0;
      for (let j = 0; j < poly.length; j++) {
        const a = poly[j];
        const c = poly[(j + 1) % poly.length];
        const len = Math.hypot(c.x - a.x, c.y - a.y);
        // Outward normal for clockwise-on-screen winding (y down).
        const ox = (c.y - a.y) / len;
        const oy = -(c.x - a.x) / len;
        const d = (l.x - a.x) * ox + (l.y - a.y) * oy;
        if (d > best) {
          best = d;
          nx = ox;
          ny = oy;
        }
      }
      if (best >= radius) continue;
      const r = rad(w.body.rot);
      const wx = nx * Math.cos(r) - ny * Math.sin(r);
      const wy = nx * Math.sin(r) + ny * Math.cos(r);
      separate(w.body, p, p, invMass(i), wx, wy, radius - best, free);
    }
  }

  /**
   * One step of the cap and its tassel. `free`: the cap is in flight (it
   * moves under its own physics and feels the tassel); otherwise it's held —
   * by the hand, or by the G — and only the tassel moves.
   */
  function stepWorld(w: World, dt: number, free: boolean, breeze: number) {
    const b = w.body;
    const x0 = b.x;
    const y0 = b.y;
    const rot0 = b.rot;
    if (free) {
      const speed = Math.hypot(b.vx, b.vy);
      b.vx += -kCap * speed * b.vx * dt;
      b.vy += (g - kCap * speed * b.vy) * dt;
      let wr = rad(b.vrot);
      wr /= 1 + P.air.spinDrag * Math.abs(wr) * dt;
      b.vrot = deg(wr);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vrot * dt;
    }

    // Tassel: Verlet. The cord's internal friction acts on its swing (motion
    // relative to the knot); air drag acts on its motion through still air.
    const knot = toStage(b, KNOT);
    const wr = rad(b.vrot);
    const kvx = (b.vx - wr * (knot.y - b.y)) * dt;
    const kvy = (b.vy + wr * (knot.x - b.x)) * dt;
    const keep = Math.pow(P.rope.damping, dt);
    for (let i = 1; i <= star; i++) {
      const p = w.nodes[i];
      const q = w.prev[i];
      let vx = kvx + (p.x - q.x - kvx) * keep;
      let vy = kvy + (p.y - q.y - kvy) * keep;
      const air = 1 / (1 + kNode(i) * (Math.hypot(vx, vy) / dt) * dt);
      vx *= air;
      vy *= air;
      q.x = p.x;
      q.y = p.y;
      p.x += vx + breeze * dt * dt;
      p.y += vy + g * dt * dt;
    }

    for (let it = 0; it < P.rope.iterations; it++) {
      // The first link ties the cord to the knot on the cap: it pulls both.
      {
        const k = toStage(b, KNOT);
        const p = w.nodes[1];
        const dx = p.x - k.x;
        const dy = p.y - k.y;
        const dist = Math.hypot(dx, dy) || 1e-6;
        if (dist > seg) separate(b, k, p, invMass(1), dx / dist, dy / dist, seg - dist, free);
      }
      for (let i = 1; i < star; i++) {
        const a = w.nodes[i];
        const c = w.nodes[i + 1];
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const dist = Math.hypot(dx, dy) || 1e-6;
        const L = linkLength(i);
        // A rope only resists stretching. Pushed together it goes slack and
        // folds — resisting that too would make it a rigid rod. (The star's
        // own link is rigid both ways: it's a solid piece.)
        if (i < n && dist <= L) continue;
        const wa = invMass(i);
        const wc = invMass(i + 1);
        const corr = (dist - L) / dist / (wa + wc);
        a.x += dx * corr * wa;
        a.y += dy * corr * wa;
        c.x -= dx * corr * wc;
        c.y -= dy * corr * wc;
      }
      for (let i = 1; i <= star; i++) collide(w, i, free);
    }
    // Hold the cord's length exactly: walking out from the knot, no link may
    // be longer than its share (and the star's is exact).
    w.nodes[0] = toStage(b, KNOT);
    for (let i = 0; i < star; i++) {
      const a = w.nodes[i];
      const c = w.nodes[i + 1];
      const dist = Math.hypot(c.x - a.x, c.y - a.y) || 1e-6;
      const L = linkLength(i);
      if (dist > L || i === n) {
        c.x = a.x + ((c.x - a.x) * L) / dist;
        c.y = a.y + ((c.y - a.y) * L) / dist;
      }
    }

    if (free) {
      b.vx = (b.x - x0) / dt;
      b.vy = (b.y - y0) / dt;
      b.vrot = (b.rot - rot0) / dt;
    }
  }

  /** The hand lets go: cap and tassel leave it moving together. */
  function release(w: World, [vx, vy, vrot]: [number, number, number]) {
    const b = w.body;
    b.vx = vx;
    b.vy = vy;
    b.vrot = vrot;
    const wr = rad(vrot);
    for (let i = 1; i <= star; i++) {
      const p = w.nodes[i];
      w.prev[i] = { x: p.x - (vx - wr * (p.y - b.y)) * STEP, y: p.y - (vy + wr * (p.x - b.x)) * STEP };
    }
  }

  // ── The cap starts in the hand, the tassel hanging still ────────────────
  const T = P.cap.flightTime;
  const launchSteps = Math.round(P.cap.launchAt / STEP);
  const flightSteps = Math.round(T / STEP);
  const target = bodyAt(G_START_X, 0, 0);
  const start = bodyAt(G_START_X + P.cap.from.x, P.cap.from.y, P.cap.spinDeg);
  const world: World = { body: start, nodes: [], prev: [] };
  {
    const k = toStage(start, KNOT);
    for (let i = 0; i <= star; i++) {
      const y = k.y + (i <= n ? seg * i : P.rope.length + hang);
      world.nodes.push({ x: k.x, y });
      world.prev.push({ x: k.x, y });
    }
  }

  // ── The throw, solved so the cap lands upright on the centred G ─────────
  // Newton's method on the full simulation: launch velocity and spin →
  // where the cap's centre of mass is, and its angle, at the landing moment.
  const key = JSON.stringify(P);
  if (!solvedThrow || solvedThrow.key !== key) {
    const inHand = cloneWorld(world);
    for (let s = 0; s < launchSteps; s++) stepWorld(inHand, STEP, false, 0);
    const miss = (v: [number, number, number]) => {
      const w = cloneWorld(inHand);
      release(w, v);
      for (let s = 0; s < flightSteps; s++) stepWorld(w, STEP, true, 0);
      return [w.body.x - target.x, w.body.y - target.y, w.body.rot - target.rot];
    };
    // First guess: a drag-free parabola and an even spin.
    let v: [number, number, number] = [
      (target.x - start.x) / T,
      (target.y - start.y - 0.5 * g * T * T) / T,
      (target.rot - start.rot) / T,
    ];
    const det3 = (a: number[][]) =>
      a[0][0] * (a[1][1] * a[2][2] - a[2][1] * a[1][2]) -
      a[1][0] * (a[0][1] * a[2][2] - a[2][1] * a[0][2]) +
      a[2][0] * (a[0][1] * a[1][2] - a[1][1] * a[0][2]);
    let J: number[][] | null = null; // J[c][r] = ∂miss_r/∂v_c, measured once
    for (let iter = 0; iter < 8; iter++) {
      const f = miss(v);
      if (Math.abs(f[0]) < 0.02 && Math.abs(f[1]) < 0.02 && Math.abs(f[2]) < 0.02) break;
      J ??= [0, 1, 2].map((c) => {
        const dv: [number, number, number] = [...v];
        dv[c] += 1;
        const fc = miss(dv);
        return [fc[0] - f[0], fc[1] - f[1], fc[2] - f[2]];
      });
      const Jm = J;
      const d = det3(Jm);
      const step = [0, 1, 2].map((c) => det3(Jm.map((col, ci) => (ci === c ? [-f[0], -f[1], -f[2]] : col))) / d);
      v = [v[0] + step[0], v[1] + step[1], v[2] + step[2]];
    }
    solvedThrow = { key, launch: v };
  }
  const launch = solvedThrow.launch;

  // Where the cap is drawn: offset from its logo place, turning about
  // CAP_CENTRE. In flight it follows the body; once landed, the G carries it.
  const cap: { x: number; y: number; vx: number; vy: number; rot: number; vrot: number } = {
    x: 0, y: 0, vx: 0, vy: 0, rot: P.cap.spinDeg, vrot: 0,
  };
  const syncCapFromBody = () => {
    const o = offsetOf(world.body);
    cap.x = o.x;
    cap.y = o.y;
    cap.rot = world.body.rot;
  };
  syncCapFromBody();
  let landed = false;
  let landTime = 0;
  let resting = false;

  function bounce() {
    const rel = cap.vy - gY.v;
    const e = P.collision.restitution;
    const m = P.collision.massRatio;
    const vCommon = (m * cap.vy + gY.v) / (m + 1);
    cap.vy = vCommon - (e * rel) / (m + 1);
    gY.v = vCommon + (m * e * rel) / (m + 1);
  }

  function substep(dt: number) {
    time += dt;
    stepCount += 1;

    // G vertical: pop-in spring, then the stiffer post-impact spring.
    if (landed) springStep(gY, 0, P.g.stiffness, P.g.damping, dt);
    else springStep(gY, 0, P.gPop.stiffness, P.gPop.damping, dt);

    // G horizontal: the slide.
    gXAccel = 0;
    if (time >= SLIDE_AT) {
      const a = -P.slide.stiffness * gX.x - P.slide.damping * gX.v;
      gXAccel = Math.max(-P.slide.maxAccel, Math.min(P.slide.maxAccel, a));
      gX.v += gXAccel * dt;
      gX.x += gX.v * dt;
    }

    // Letters spring up in their places as the G moves off them (the
    // uncovering itself is the reveal edge, see frame()).
    const revealX = G_RIGHT_EDGE + gX.x;
    let lastPop = -Infinity;
    letters.forEach((l) => { if (l.shown) lastPop = Math.max(lastPop, l.shownAt); });
    // The G starts in the middle, so E and d are in the open from the start,
    // n comes out early in the slide and e last, right behind the G.
    [2, 3, 1, 0].forEach((i) => {
      const l = letters[i];
      const [left, right] = LETTER_SLOTS[i];
      const open = revealX <= left + (right - left) * (1 - P.letters.uncovered);
      if (!l.shown && time >= SLIDE_AT + P.letters.firstAt && open && time >= lastPop + P.letters.stagger) {
        lastPop = time;
        l.shown = true;
        l.shownAt = time;
        l.y.x = P.letters.rise;
        l.s.x = P.letters.fromScale;
      }
    });
    letters.forEach((l) => {
      if (l.shown) {
        springStep(l.y, 0, P.letters.stiffness, P.letters.damping, dt);
        springStep(l.s, 1, P.letters.stiffness, P.letters.damping, dt);
      }
    });

    // The cap and tassel: in the hand, in flight, then riding the G.
    if (stepCount <= launchSteps) {
      stepWorld(world, dt, false, 0);
      return;
    }
    if (!landed) {
      if (stepCount === launchSteps + 1) release(world, launch);
      stepWorld(world, dt, true, 0);
      syncCapFromBody();
      cap.vx = world.body.vx;
      cap.vy = world.body.vy;
      if (stepCount === launchSteps + flightSteps) {
        // Down on the G (the throw was solved to put it exactly here).
        landed = true;
        landTime = time;
        cap.x = G_START_X;
        cap.y = 0;
        cap.rot = 0;
        cap.vrot = P.collision.seatKick;
        bounce();
      }
      return;
    }
    // Horizontally the cap rides the G (no slip); vertically it bounces.
    cap.x = gX.x;
    cap.vx = gX.v;
    cap.vy += g * dt;
    cap.y += cap.vy * dt;
    if (cap.y >= gY.x) {
      cap.y = gY.x;
      if (cap.vy - gY.v > P.collision.restSpeed) bounce();
      else {
        cap.vy = gY.v;
        resting = true;
      }
    }
    // Seating wobble, plus inertia: the cap tips back as the G speeds up.
    cap.vrot += (-P.seat.stiffness * cap.rot - P.seat.damping * cap.vrot - P.seat.inertia * gXAccel) * dt;
    cap.rot += cap.vrot * dt;
    // The tassel hangs from the cap wherever the G takes it; a light breeze
    // keeps it alive.
    const held = bodyAt(cap.x, cap.y, cap.rot);
    world.body = { ...held, vx: cap.vx, vy: cap.vy, vrot: cap.vrot };
    const breeze = P.rope.breeze.reduce((s, b) => s + b.accel * Math.sin(b.freq * 2 * Math.PI * time + b.phase), 0);
    stepWorld(world, dt, false, breeze);
  }

  function frame(): TossFrame {
    const capOpacity = time < P.cap.launchAt ? 0 : Math.min(1, (time - P.cap.launchAt) / 0.08);

    const gFrame: PieceFrame = { x: gX.x, y: gY.x, opacity: Math.min(1, time / 0.1), ...stretch(gY.v) };
    const others: PieceFrame[] = letters.map((l) => {
      const st = stretch(l.y.v);
      return {
        x: 0,
        y: l.y.x,
        scaleX: st.scaleX * l.s.x,
        scaleY: st.scaleY * l.s.x,
        opacity: l.shown ? Math.min(1, (time - l.shownAt) / 0.06) : 0,
      };
    });

    // The star hangs from the cord's end, turned to wherever its own centre
    // of mass has swung.
    const end = world.nodes[n];
    const starCentre = world.nodes[star];
    const dirX = starCentre.x - end.x;
    const dirY = starCentre.y - end.y;
    const sinceLand = landed ? time - landTime : -1;
    const twinkle =
      landed && sinceLand > 1.2
        ? Math.max(0, Math.sin(((sinceLand - 1.2) * 2 * Math.PI) / P.sparkle.twinklePeriod)) ** 8
        : 0;
    const body = bodyAt(cap.x, cap.y, cap.rot);

    return {
      time,
      letters: [gFrame, ...others],
      revealX: G_RIGHT_EDGE + gX.x,
      cap: { x: cap.x, y: cap.y, rotate: cap.rot, opacity: capOpacity, centreOfMass: { x: body.x, y: body.y } },
      rope: world.nodes.slice(0, star).map((p) => ({ x: p.x, y: p.y })),
      sparkle: {
        x: starCentre.x - SPARKLE_CENTRE.x,
        y: starCentre.y - SPARKLE_CENTRE.y,
        // CSS rotate is clockwise; a rope swung to +x needs a negative turn.
        rotate: -deg(Math.atan2(dirX, dirY)) + 18 * twinkle,
        scale: 1 + 0.22 * twinkle,
        opacity: capOpacity,
      },
      glow:
        landed && sinceLand < 0.7
          ? { x: starCentre.x, y: starCentre.y, scale: 0.4 + (sinceLand / 0.7) * 1.9, opacity: 0.8 * (1 - sinceLand / 0.7) }
          : { x: starCentre.x, y: starCentre.y, scale: 0, opacity: 0 },
      settled: resting && time >= SETTLED_AT,
    };
  }

  let pending = 0;
  return {
    /** Advance by a real frame's dt (s), in fixed physics steps. */
    step(dt: number): TossFrame {
      pending += Math.min(dt, 0.05); // a backgrounded tab mustn't explode the sim
      while (pending >= STEP - 1e-9) {
        substep(STEP);
        pending -= STEP;
      }
      return frame();
    },
    frame,
  };
}

/**
 * Solve the throw ahead of time (it's cached), so the loader's first frame
 * doesn't wait on it.
 */
export function prepareCapToss() {
  createCapToss();
}
