import { describe, it, expect } from "vitest";
import {
  detectShake,
  createMood,
  onPat,
  onShake,
  onMove,
  SHAKE_LEG_MIN_PX,
  SHAKE_WINDOW_MS,
  PAT_MS,
  PAT_ESCALATED_MS,
  PAT_STREAK_MS,
  LOVE_MS,
  PAT_LOVE_COUNT,
  MAD_MS,
  MAD_ESCALATED_MS,
  MOVE_WINDOW_MS,
  MOVE_COUNT,
  type ShakeSample,
} from "./petGestures";

/** Build samples along one axis from a list of positions, 40ms apart. */
const samples = (axis: "x" | "y", positions: number[], start = 1000): ShakeSample[] =>
  positions.map((p, i) => ({
    x: axis === "x" ? p : 0,
    y: axis === "y" ? p : 0,
    t: start + i * 40,
  }));

const lastT = (s: ShakeSample[]) => s[s.length - 1]!.t;

describe("detectShake", () => {
  it("detects three alternating reversals", () => {
    // right, left, right, left — each leg well over the minimum.
    const s = samples("x", [0, 40, 0, 40, 0, 40]);
    expect(detectShake(s, lastT(s))).toBe(true);
    // Vertical too.
    const v = samples("y", [0, 40, 0, 40, 0, 40]);
    expect(detectShake(v, lastT(v))).toBe(true);
  });

  // The negative that matters: dragging is the buddy's primary interaction and
  // must never be mistaken for shaking it.
  it("does NOT fire on a long straight drag, or one with small corrections", () => {
    const s = samples("x", [0, 60, 120, 180, 240, 300, 360, 420]);
    expect(detectShake(s, lastT(s))).toBe(false);
    // Mostly rightward with jitter under the leg minimum.
    const c = samples("x", [0, 50, 47, 100, 96, 150, 147, 200]);
    expect(detectShake(c, lastT(c))).toBe(false);
  });

  it("does NOT fire on jitter, stale reversals, too few samples or a still pointer", () => {
    const tiny = SHAKE_LEG_MIN_PX - 4;
    const jitter = samples("x", [0, tiny, 0, tiny, 0, tiny, 0, tiny]);
    expect(detectShake(jitter, lastT(jitter))).toBe(false);
    const s = samples("x", [0, 40, 0, 40, 0, 40]);
    // Evaluated long after the gesture: every sample is stale.
    expect(detectShake(s, lastT(s) + SHAKE_WINDOW_MS + 500)).toBe(false);
    const few = samples("x", [0, 40, 0]);
    expect(detectShake(few, lastT(few))).toBe(false);
    const still = samples("x", [30, 30, 30, 30, 30, 30]);
    expect(detectShake(still, lastT(still))).toBe(false);
  });
});

describe("onPat", () => {
  it("escalates on the third pat in a streak", () => {
    let mood = createMood();
    let holdMs = 0;
    ({ mood, holdMs } = onPat(mood, 1000));
    expect(holdMs).toBe(PAT_MS);
    expect(mood.patStreak).toBe(1);
    ({ mood, holdMs } = onPat(mood, 2000));
    expect(holdMs).toBe(PAT_MS);
    ({ mood, holdMs } = onPat(mood, 3000));
    expect(holdMs).toBe(PAT_ESCALATED_MS);
    expect(mood.patStreak).toBe(3);
  });

  it(`tips into love at pat ${PAT_LOVE_COUNT}, and drops back to happy once the streak lapses`, () => {
    let mood = createMood();
    let reaction = "happy";
    let holdMs = 0;
    for (let i = 0; i < PAT_LOVE_COUNT - 1; i++) {
      ({ mood, reaction } = onPat(mood, 1000 + i * 500));
      expect(reaction).toBe("happy");
    }
    ({ mood, reaction, holdMs } = onPat(mood, 1000 + PAT_LOVE_COUNT * 500));
    expect(reaction).toBe("love");
    expect(holdMs).toBe(LOVE_MS);

    // Long gap: the buddy is not mid-cuddle any more.
    ({ mood, reaction } = onPat(mood, 1000 + PAT_LOVE_COUNT * 500 + PAT_STREAK_MS + 1));
    expect(reaction).toBe("happy");
    expect(mood.patStreak).toBe(1);
  });

});

describe("onShake", () => {
  it("holds longer when shaken again while still cross", () => {
    let mood = createMood();
    let holdMs = 0;
    ({ mood, holdMs } = onShake(mood, 1000));
    expect(holdMs).toBe(MAD_MS);
    // Still inside the previous reaction.
    ({ mood, holdMs } = onShake(mood, 1000 + MAD_MS - 500));
    expect(holdMs).toBe(MAD_ESCALATED_MS);
    // Back to the normal hold once the buddy has calmed down.
    ({ mood, holdMs } = onShake(mood, 1000 + MAD_MS - 500 + MAD_ESCALATED_MS + 1));
    expect(holdMs).toBe(MAD_MS);
  });

  it("clears any pat streak — this is not petting", () => {
    let mood = createMood();
    ({ mood } = onPat(mood, 1000));
    ({ mood } = onPat(mood, 1500));
    ({ mood } = onShake(mood, 1600));
    expect(mood.patStreak).toBe(0);
  });
});

describe("onMove", () => {
  it(`fires on move ${MOVE_COUNT} inside the window, then resets; prunes stale moves`, () => {
    let mood = createMood();
    let irritated = false;
    ({ mood, irritated } = onMove(mood, 1000));
    expect(irritated).toBe(false);
    ({ mood, irritated } = onMove(mood, 2000));
    expect(irritated).toBe(false);
    ({ mood, irritated } = onMove(mood, 3000));
    expect(irritated).toBe(true);
    // Resets after reacting, so it does not fire on every move thereafter.
    ({ mood, irritated } = onMove(mood, 3500));
    expect(irritated).toBe(false);

    // Moves older than the window are pruned.
    ({ mood } = onMove(createMood(), 1000));
    ({ mood } = onMove(mood, 2000));
    ({ mood, irritated } = onMove(mood, 2000 + MOVE_WINDOW_MS + 1));
    expect(irritated).toBe(false);
    expect(mood.recentMoves).toHaveLength(1);
  });
});
