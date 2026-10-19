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
  });

  it("detects a vertical shake too", () => {
    const s = samples("y", [0, 40, 0, 40, 0, 40]);
    expect(detectShake(s, lastT(s))).toBe(true);
  });

  // The negative that matters: dragging is the buddy's primary interaction and
  // must never be mistaken for shaking it.
  it("does NOT fire on a long straight drag", () => {
    const s = samples("x", [0, 60, 120, 180, 240, 300, 360, 420]);
    expect(detectShake(s, lastT(s))).toBe(false);
  });

  it("does NOT fire on a drag with small corrections", () => {
    // Mostly rightward with jitter under the leg minimum.
    const s = samples("x", [0, 50, 47, 100, 96, 150, 147, 200]);
    expect(detectShake(s, lastT(s))).toBe(false);
  });

  it("does NOT fire on sub-threshold jitter", () => {
    const tiny = SHAKE_LEG_MIN_PX - 4;
    const s = samples("x", [0, tiny, 0, tiny, 0, tiny, 0, tiny]);
    expect(detectShake(s, lastT(s))).toBe(false);
  });

  it("ignores reversals that fall outside the window", () => {
    const s = samples("x", [0, 40, 0, 40, 0, 40]);
    // Evaluated long after the gesture: every sample is stale.
    expect(detectShake(s, lastT(s) + SHAKE_WINDOW_MS + 500)).toBe(false);
  });

  it("needs more than a couple of samples", () => {
    const s = samples("x", [0, 40, 0]);
    expect(detectShake(s, lastT(s))).toBe(false);
  });

  it("is unmoved by a stationary pointer", () => {
    const s = samples("x", [30, 30, 30, 30, 30, 30]);
    expect(detectShake(s, lastT(s))).toBe(false);
  });
});

describe("onPat", () => {
  it("holds briefly for a single pat", () => {
    const { mood, holdMs } = onPat(createMood(), 1000);
    expect(holdMs).toBe(PAT_MS);
    expect(mood.patStreak).toBe(1);
  });

  it("escalates on the third pat in a streak", () => {
    let mood = createMood();
    let holdMs = 0;
    ({ mood, holdMs } = onPat(mood, 1000));
    ({ mood, holdMs } = onPat(mood, 2000));
    expect(holdMs).toBe(PAT_MS);
    ({ mood, holdMs } = onPat(mood, 3000));
    expect(holdMs).toBe(PAT_ESCALATED_MS);
    expect(mood.patStreak).toBe(3);
  });

  it(`tips into love at pat ${PAT_LOVE_COUNT}`, () => {
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
  });

  it("drops back to happy once the streak lapses", () => {
    let mood = createMood();
    let reaction = "happy";
    for (let i = 0; i < PAT_LOVE_COUNT; i++) ({ mood } = onPat(mood, 1000 + i * 500));
    // Long gap: the buddy is not mid-cuddle any more.
    ({ mood, reaction } = onPat(mood, 1000 + PAT_LOVE_COUNT * 500 + PAT_STREAK_MS + 1));
    expect(reaction).toBe("happy");
    expect(mood.patStreak).toBe(1);
  });

  it("restarts the streak once the window lapses", () => {
    let mood = createMood();
    let holdMs = 0;
    ({ mood } = onPat(mood, 1000));
    ({ mood } = onPat(mood, 2000));
    ({ mood, holdMs } = onPat(mood, 2000 + PAT_STREAK_MS + 1));
    expect(mood.patStreak).toBe(1);
    expect(holdMs).toBe(PAT_MS);
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
  });

  it("returns to the normal hold once the buddy has calmed down", () => {
    let mood = createMood();
    let holdMs = 0;
    ({ mood } = onShake(mood, 1000));
    ({ mood, holdMs } = onShake(mood, 1000 + MAD_MS + 1));
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
  it("leaves the first moves alone", () => {
    let mood = createMood();
    let irritated = false;
    ({ mood, irritated } = onMove(mood, 1000));
    expect(irritated).toBe(false);
    ({ mood, irritated } = onMove(mood, 2000));
    expect(irritated).toBe(false);
  });

  it(`fires on move ${MOVE_COUNT} inside the window`, () => {
    let mood = createMood();
    let irritated = false;
    ({ mood } = onMove(mood, 1000));
    ({ mood } = onMove(mood, 2000));
    ({ mood, irritated } = onMove(mood, 3000));
    expect(irritated).toBe(true);
  });

  it("prunes moves older than the window", () => {
    let mood = createMood();
    let irritated = false;
    ({ mood } = onMove(mood, 1000));
    ({ mood } = onMove(mood, 2000));
    // Far enough later that the first two no longer count.
    ({ mood, irritated } = onMove(mood, 2000 + MOVE_WINDOW_MS + 1));
    expect(irritated).toBe(false);
    expect(mood.recentMoves).toHaveLength(1);
  });

  it("resets after reacting, so it does not fire on every move thereafter", () => {
    let mood = createMood();
    let irritated = false;
    ({ mood } = onMove(mood, 1000));
    ({ mood } = onMove(mood, 2000));
    ({ mood, irritated } = onMove(mood, 3000));
    expect(irritated).toBe(true);
    ({ mood, irritated } = onMove(mood, 3500));
    expect(irritated).toBe(false);
  });
});
