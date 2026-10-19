import { describe, it, expect } from "vitest";

import {
  CAP_CENTRE,
  CAP_SOLIDS,
  createCapToss,
  G_RIGHT_EDGE,
  G_START_X,
  LAND_AT,
  LETTER_CENTRES,
  LETTER_SLOTS,
  PHYSICS,
  SETTLED_AT,
  SLIDE_AT,
  type TossFrame,
} from "../capTossPhysics";

function run(seconds: number, fps = 240): TossFrame[] {
  const sim = createCapToss();
  const frames: TossFrame[] = [];
  for (let i = 0; i < seconds * fps; i++) frames.push(sim.step(1 / fps));
  return frames;
}

const ropeAngle = (f: TossFrame) => {
  const knot = f.rope[0];
  const end = f.rope[f.rope.length - 1];
  return (Math.atan2(end.x - knot.x, end.y - knot.y) * 180) / Math.PI;
};

describe("cap toss physics", () => {
  const frames = run(5);
  const at = (t: number) => frames.find((f) => f.time >= t)!;
  const flight = frames.filter((f) => f.time >= PHYSICS.cap.launchAt && f.time < LAND_AT);

  it("starts with the G alone, centred", () => {
    const f = at(0.2);
    expect(f.letters[0].x).toBeCloseTo(G_START_X, 5);
    f.letters.slice(1).forEach((l) => expect(l.opacity).toBe(0));
  });

  it("throws the cap as a real projectile: gravity and air drag on its centre of mass", () => {
    const cm = flight.map((f) => f.cap.centreOfMass);
    const peak = Math.min(...cm.map((p) => p.y));
    expect(peak).toBeLessThan(at(LAND_AT).cap.centreOfMass.y - 40); // peaks well above the G
    const dt = 1 / 240;
    const vx = cm.slice(1).map((p, i) => (p.x - cm[i].x) / dt);
    const ay = cm.slice(2).map((p, i) => (p.y - 2 * cm[i + 1].y + cm[i].y) / (dt * dt));
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    // Air resistance: it loses sideways speed, and falls slower than it rose
    // (drag adds to gravity going up and fights it coming down).
    expect(mean(vx.slice(-10))).toBeLessThan(mean(vx.slice(0, 10)) * 0.85);
    const top = cm.findIndex((p) => p.y === peak);
    expect(mean(ay.slice(0, top - 2))).toBeGreaterThan(PHYSICS.gravity);
    expect(mean(ay.slice(top + 2))).toBeLessThan(PHYSICS.gravity);
  });

  it("spins freely and smoothly — no flick over the top of the arc", () => {
    const dt = 1 / 240;
    const spin = flight.slice(1).map((f, i) => (f.cap.rotate - flight[i].cap.rotate) / dt);
    const average = -PHYSICS.cap.spinDeg / PHYSICS.cap.flightTime;
    const top = flight.reduce((a, f) => (f.cap.centreOfMass.y < a.cap.centreOfMass.y ? f : a));
    expect(spin[flight.indexOf(top)]).toBeLessThan(average); // slower than average at the peak
    spin.slice(1).forEach((w, i) => expect(Math.abs(w - spin[i])).toBeLessThan(25)); // no sudden flicks
    expect(Math.max(...spin)).toBeLessThan(average * 1.4);
  });

  it("lands on the centred G, upright, then bounces with energy loss", () => {
    const landing = at(LAND_AT);
    expect(landing.cap.x).toBeCloseTo(G_START_X, 0);
    expect(Math.abs(landing.cap.rotate)).toBeLessThan(2);
    const beforeSlide = frames.filter((f) => f.time > LAND_AT && f.time < SLIDE_AT);
    const hop = Math.min(...beforeSlide.map((f) => f.cap.y - f.letters[0].y));
    expect(hop).toBeLessThan(-3);
    expect(Math.max(...beforeSlide.map((f) => f.letters[0].y))).toBeGreaterThan(1.5); // the G gives
  });

  it("the tassel is a rope: it never stretches, but bends in flight", () => {
    const seg = PHYSICS.rope.length / PHYSICS.rope.segments;
    frames.forEach((f) => {
      for (let j = 0; j < f.rope.length - 1; j++) {
        const d = Math.hypot(f.rope[j + 1].x - f.rope[j].x, f.rope[j + 1].y - f.rope[j].y);
        expect(d).toBeLessThanOrEqual(seg * 1.001);
      }
    });
    expect(at(PHYSICS.cap.launchAt + 0.1).sparkle.opacity).toBe(1);
    const sag = (f: TossFrame) => {
      const a = f.rope[0];
      const b = f.rope.at(-1)!;
      const c = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      return Math.max(...f.rope.map((m) => Math.abs((b.x - a.x) * (m.y - a.y) - (b.y - a.y) * (m.x - a.x)) / c));
    };
    expect(Math.max(...flight.map(sag))).toBeGreaterThan(2);
  });

  it("the tassel drapes over the cap instead of passing through it", () => {
    frames.forEach((f) => {
      const r = (f.cap.rotate * Math.PI) / 180;
      f.rope.slice(1).forEach((p) => {
        // Into the cap's own frame.
        const wx = p.x - (CAP_CENTRE.x + f.cap.x);
        const wy = p.y - (CAP_CENTRE.y + f.cap.y);
        const lx = CAP_CENTRE.x + wx * Math.cos(r) + wy * Math.sin(r);
        const ly = CAP_CENTRE.y - wx * Math.sin(r) + wy * Math.cos(r);
        CAP_SOLIDS.forEach((poly) => {
          const outside = Math.max(
            ...poly.map((a, j) => {
              const b = poly[(j + 1) % poly.length];
              const len = Math.hypot(b.x - a.x, b.y - a.y);
              return ((lx - a.x) * (b.y - a.y) - (ly - a.y) * (b.x - a.x)) / len;
            }),
          );
          expect(outside).toBeGreaterThan(-0.01);
        });
      });
    });
  });

  it("the star swings on its own from the cord's end, not as a stiff extension of it", () => {
    const kink = (f: TossFrame) => {
      const a = f.rope.at(-2)!;
      const b = f.rope.at(-1)!;
      const cord = Math.atan2(b.x - a.x, b.y - a.y) * (180 / Math.PI);
      const starDir = -f.sparkle.rotate; // the star's hang direction (CSS rotate is clockwise)
      return Math.abs(((cord - starDir + 540) % 360) - 180);
    };
    expect(Math.max(...flight.map(kink))).toBeGreaterThan(30);
    expect(kink(at(SETTLED_AT + 2))).toBeLessThan(10); // hangs in line once it's still
  });

  it("slides the G home, and each of e, n, E, d pops up in place as it's uncovered", () => {
    const firstSeen = [1, 2, 3, 4].map((i) => frames.find((f) => f.letters[i].opacity > 0)!);
    firstSeen.forEach((f, j) => {
      expect(f.time).toBeGreaterThanOrEqual(SLIDE_AT);
      const [left, right] = LETTER_SLOTS[j];
      expect(f.revealX).toBeLessThanOrEqual((left + right) / 2); // at least half out from under the G
    });
    // The G starts in the middle: E and d (already in the open) first, then n, then e right behind it.
    const order = [1, 2, 3, 4].sort((a, b) => firstSeen[a - 1].time - firstSeen[b - 1].time);
    expect(order).toEqual([3, 4, 2, 1]);
    frames.forEach((f) => f.letters.slice(1).forEach((l) => expect(l.x).toBe(0))); // never travel
    // The reveal edge is the G's right edge, so nothing shows through the G.
    frames.forEach((f) => expect(f.revealX).toBeCloseTo(G_RIGHT_EDGE + f.letters[0].x, 6));
    expect(at(SLIDE_AT - 0.01).revealX).toBeGreaterThan(LETTER_CENTRES[2]); // covers e and n before the slide

    const end = at(SETTLED_AT);
    end.letters.forEach((l) => {
      expect(Math.abs(l.x)).toBeLessThan(1);
      expect(Math.abs(l.y)).toBeLessThan(1);
      expect(Math.abs(l.scaleX - 1)).toBeLessThan(0.02);
      expect(l.opacity).toBe(1);
    });
    expect(Math.abs(end.cap.x)).toBeLessThan(1); // the cap rode the G home
  });

  it("the slide starts with a firm shove, not a jolt", () => {
    const slide = frames.filter((f) => f.time > SLIDE_AT && f.time < SETTLED_AT);
    const dt = 1 / 240;
    for (let i = 2; i < slide.length; i++) {
      const a = (slide[i].letters[0].x - 2 * slide[i - 1].letters[0].x + slide[i - 2].letters[0].x) / (dt * dt);
      expect(Math.abs(a)).toBeLessThanOrEqual(PHYSICS.slide.maxAccel + 1);
    }
  });

  it("settles into a gentle sway in the breeze", () => {
    const idle = frames.filter((f) => f.time > SETTLED_AT + 1).map((f) => Math.abs(ropeAngle(f)));
    expect(Math.max(...idle)).toBeLessThan(10);
    expect(Math.max(...idle)).toBeGreaterThan(0.3); // alive, not frozen
  });

  it("is deterministic and frame-rate independent", () => {
    expect(run(2, 60).at(-1)).toEqual(run(2, 60).at(-1));
    const a = run(2.5, 60).at(-1)!;
    const b = run(2.5, 144).at(-1)!;
    expect(b.letters[0].x).toBeCloseTo(a.letters[0].x, 1);
    expect(b.cap.y).toBeCloseTo(a.cap.y, 1);
  });
});
