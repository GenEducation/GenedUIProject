import { describe, it, expect } from "vitest";

import {
  createCapToss,
  G_RIGHT_EDGE,
  LETTER_CENTRES,
  LETTER_SLOTS,
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

describe("cap toss physics", () => {
  const frames = run(5);
  const at = (t: number) => frames.find((f) => f.time >= t)!;

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

  it("is deterministic and frame-rate independent", () => {
    expect(run(2, 60).at(-1)).toEqual(run(2, 60).at(-1));
    const a = run(2.5, 60).at(-1)!;
    const b = run(2.5, 144).at(-1)!;
    expect(b.letters[0].x).toBeCloseTo(a.letters[0].x, 1);
    expect(b.cap.y).toBeCloseTo(a.cap.y, 1);
  });
});
