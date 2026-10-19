import { describe, it, expect } from "vitest";
import {
  BOUNCE_DECAY,
  BOUNCE_V,
  RETURN_HOME_S,
  REST,
  CELEBRATE_HOPS,
  SKIP_PX,
  isSettled,
  poseOf,
  resolveMove,
  startMove,
  step,
  travelTo,
  wanderPick,
  type LocoBounds,
  type LocoEvent,
  type LocoState,
} from "./petLocomotion";

const B: LocoBounds = { minX: -300, maxX: 300, maxRise: 500 };
const OPTS = { dir: 1 as const, rand: () => 0.75 };
const DT = 1 / 60;

/** Run until settled (or a cap), collecting events. */
function simulate(s: LocoState, seconds: number, returnHome = false, bounds: LocoBounds = B) {
  const events: LocoEvent[] = [];
  const trace: LocoState[] = [];
  let cur = s;
  for (let t = 0; t < seconds; t += DT) {
    const r = step(cur, DT, bounds, { returnHome });
    cur = r.state;
    events.push(...r.events);
    trace.push(cur);
  }
  return { state: cur, events, trace };
}

describe("petLocomotion", () => {
  it("a hop goes up, lands once, and settles", () => {
    const { state, events, trace } = simulate(startMove(REST, "hop", B, OPTS), 2);
    expect(Math.min(...trace.map((s) => s.y))).toBeLessThan(-30);
    expect(events.filter((e) => e === "land")).toHaveLength(1);
    expect(state.air).toBe(false);
    expect(state.y).toBe(0);
  });

  it("a bounce lands three times, each lower than the last", () => {
    let s = startMove(REST, "bounce", B, OPTS);
    const apexes: number[] = [];
    let peak = 0;
    for (let t = 0; t < 3; t += DT) {
      const r = step(s, DT, B);
      s = r.state;
      peak = Math.min(peak, s.y);
      if (r.events.includes("land")) {
        apexes.push(-peak);
        peak = 0;
      }
    }
    expect(apexes).toHaveLength(3);
    expect(apexes[1]).toBeLessThan(apexes[0]);
    expect(apexes[2]).toBeLessThan(apexes[1]);
    // Each launch is BOUNCE_DECAY of the last, so each apex is DECAY² of the last.
    expect(apexes[1] / apexes[0]).toBeCloseTo(BOUNCE_DECAY ** 2, 1);
    expect(apexes[0]).toBeLessThanOrEqual((BOUNCE_V * BOUNCE_V) / (2 * 1500) + 1);
  });

  it("caps a jump so it never rises past maxRise", () => {
    const low: LocoBounds = { ...B, maxRise: 40 };
    let s = startMove(REST, "jump", low, OPTS);
    let peak = 0;
    for (let t = 0; t < 2; t += DT) {
      s = step(s, DT, low).state;
      peak = Math.min(peak, s.y);
    }
    expect(-peak).toBeLessThanOrEqual(41);
  });

  it("never leaves the horizontal bounds", () => {
    const tight: LocoBounds = { minX: -20, maxX: 20, maxRise: 500 };
    let s = startMove(REST, "jump", tight, { ...OPTS, rand: () => 1 });
    for (let t = 0; t < 2; t += DT) {
      s = step(s, DT, tight).state;
      expect(s.x).toBeGreaterThanOrEqual(-20);
      expect(s.x).toBeLessThanOrEqual(20);
    }
  });

  it("walks back home after resting away from it", () => {
    const away: LocoState = { ...REST, x: 80 };
    const { state } = simulate(away, RETURN_HOME_S + 3, true);
    expect(Math.abs(state.x)).toBeLessThan(1);
    expect(isSettled(state)).toBe(true);
  });

  it("stays put when returnHome is off", () => {
    const away: LocoState = { ...REST, x: 80 };
    expect(simulate(away, RETURN_HOME_S + 1, false).state.x).toBe(80);
  });

  describe("celebrate: a grounded, happy bounce", () => {
    it("bounces right where it is: no dash, no spin", () => {
      const { trace, events } = simulate(startMove({ ...REST, x: 40 }, "celebrate", B, OPTS), 4);
      expect(trace.every((s) => s.x === 40)).toBe(true);
      expect(events.filter((e) => e === "land" || e === "celebrateLand")).toHaveLength(CELEBRATE_HOPS);
    });

    it("its first hop is at least as high as an ordinary bounce — it is the biggest moment", () => {
      const peak = (move: "celebrate" | "bounce") =>
        -Math.min(...simulate(startMove(REST, move, B, OPTS), 4).trace.map((s) => s.y));
      expect(peak("celebrate")).toBeGreaterThan(peak("bounce"));
    });

    it("throws its confetti once, on the last landing", () => {
      const { events } = simulate(startMove(REST, "celebrate", B, OPTS), 4);
      expect(events.filter((e) => e === "celebrateLand")).toHaveLength(1);
      expect(events.at(-1)).toBe("celebrateLand");
    });

    it("is the same every time", () => {
      const a = simulate(startMove(REST, "celebrate", B, OPTS), 4).trace.map((s) => [s.x, s.y]);
      const b = simulate(startMove(REST, "celebrate", B, { ...OPTS, rand: () => 0.1 }), 4).trace.map((s) => [s.x, s.y]);
      expect(b).toEqual(a);
    });

    it("stays in place even when travel is suppressed (mid-test, typing)", () => {
      expect(resolveMove("celebrate", "bounce", true)).toBe("celebrate");
    });

    it("the placement pet walks to its flag, then celebrates there", () => {
      const walk = { ...travelTo(REST, 120, "walk", B), celebrating: true };
      const { trace, events } = simulate(walk, 5);
      const firstAir = trace.findIndex((s) => s.air);
      expect(trace[firstAir].x).toBeCloseTo(120, 5);
      expect(events.at(-1)).toBe("celebrateLand");
    });
  });

  describe("skip (Encouraging)", () => {
    it("is one jump that lands to the right", () => {
      const { state, events } = simulate(startMove(REST, "skip", B, OPTS), 2);
      expect(events.filter((e) => e === "land")).toHaveLength(1);
      expect(state.x).toBeGreaterThan(SKIP_PX * 0.8);
      expect(state.x).toBeLessThan(SKIP_PX * 1.2);
    });

    it("goes left instead when parked against the right edge", () => {
      const atEdge: LocoBounds = { minX: -300, maxX: 10, maxRise: 500 };
      const { state } = simulate(startMove(REST, "skip", atEdge, OPTS), 2, false, atEdge);
      expect(state.x).toBeLessThan(-SKIP_PX * 0.8);
    });

    it("is in place when travel is suppressed", () => {
      expect(resolveMove("skip", "hop", true)).toBe("hop");
    });
  });

  it("pace goes out and comes back to where it started", () => {
    const { state, trace } = simulate(startMove(REST, "pace", B, OPTS), 5);
    expect(Math.min(...trace.map((s) => s.x))).toBeLessThan(-40);
    expect(Math.max(...trace.map((s) => s.x))).toBeGreaterThan(40);
    expect(state.x).toBeCloseTo(0, 5);
  });

  it("a mid-air pet finishes its move before starting another", () => {
    const air = startMove(REST, "hop", B, OPTS);
    expect(startMove(air, "celebrate", B, OPTS)).toBe(air);
  });

  it("faces the way it runs and stretches in the air", () => {
    const running = step(startMove(REST, "run", B, { ...OPTS, dir: -1 }), DT, B).state;
    expect(poseOf(running).sx).toBeLessThan(0);
    const rising = step(startMove(REST, "hop", B, OPTS), DT, B).state;
    expect(poseOf(rising).phase).toBe("rising");
  });
});

describe("resolveMove", () => {
  it("plays the move when travel is allowed", () => {
    expect(resolveMove("scoot", "lean", false)).toBe("scoot");
  });

  it("swaps a travelling move for its in-place version when suppressed", () => {
    expect(resolveMove("scoot", "lean", true)).toBe("lean");
    expect(resolveMove("scoot", "lean", true)).toBe("lean");
  });

  it("drops a travelling move with no in-place version", () => {
    expect(resolveMove("walk", undefined, true)).toBeNull();
    expect(resolveMove("pace", null, true)).toBeNull();
  });

  it("leaves in-place moves alone even when suppressed", () => {
    expect(resolveMove("hop", undefined, true)).toBe("hop");
  });
});

describe("wanderPick", () => {
  it("avoids blocked targets", () => {
    let i = 0;
    const seq = [0.1, 0.9, 0.2, 0.5];
    const pick = wanderPick(B, () => seq[i++ % seq.length], (x) => x > 0);
    expect(pick.move).toBe("walk");
    expect(pick.target).toBeLessThanOrEqual(0);
  });
});
