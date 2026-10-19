import { describe, it, expect } from "vitest";
import { _layout } from "blobatar";
import { idle, happy } from "blobatar/expression";
import { accentMarks, placeStatic, restAnchors, type AccentMark } from "../petAccents";
import {
  cheerPose,
  curiousPose,
  impressedPose,
  supportivePose,
  amusedPose,
} from "../../theme/petExpressions";

// Two creatures with different silhouettes (a cloud and an organic blob).
const SEEDS = ["aanya", "rohan"];
const POSES = { idle, cheerPose, curiousPose, supportivePose, amusedPose, impressedPose };

type EyeMark = Extract<AccentMark, { follow: "eye" }>;
const eyeMarks = (marks: AccentMark[]) => marks.filter((m): m is EyeMark => m.follow === "eye");

/** The posed eye a mark hangs off, in a still frame. */
function posedEye(seed: string, mark: EyeMark, pose: typeof idle) {
  const origin = placeStatic(_layout(seed, {}), { ...mark, ox: 0, oy: 0 }, pose);
  const layout = _layout(seed, {});
  const baked = pose.bake(layout, pose.p);
  const eyes = [...baked.l.eyes].sort((a, b) => a.cx - b.cx);
  const e = mark.eye === 0 ? eyes[0] : eyes[eyes.length - 1];
  return { cx: origin.x, cy: origin.y, rx: e.rx, ry: e.ry };
}

describe("restAnchors", () => {
  it("returns the eyes left-then-right with blobatar's side signs", () => {
    for (const seed of SEEDS) {
      const a = restAnchors(_layout(seed, {}));
      expect(a.eyes[0].cx).toBeLessThan(a.eyes[1].cx);
      expect(a.eyes.map((e) => e.wrap)).toEqual([-1, 1]);
    }
  });

  it("puts the head top above the face, puffs included", () => {
    for (const seed of SEEDS) {
      const a = restAnchors(_layout(seed, {}));
      expect(a.headTop.y).toBeLessThan(a.face.cy - a.face.ry);
      expect(a.headTop.y).toBeGreaterThan(-10);
    }
  });
});

describe("marks follow their eye", () => {
  for (const seed of SEEDS) {
    const a = restAnchors(_layout(seed, {}));

    it(`${seed}: a blush sits just under its own eye in every pose`, () => {
      for (const [name, pose] of Object.entries(POSES)) {
        for (const m of eyeMarks(accentMarks(a, "blush"))) {
          const eye = posedEye(seed, m, pose);
          const origin = placeStatic(_layout(seed, {}), m, pose);
          if (m.shape.tag !== "ellipse") throw new Error("blush is an ellipse");
          const x = origin.x + m.shape.cx;
          const top = origin.y + m.shape.cy - m.shape.ry;
          // Below the bottom of the eye, however squinted…
          expect(top, `${seed}/${name} eye ${m.eye}`).toBeGreaterThanOrEqual(eye.cy + eye.ry - 0.5);
          // …not far below it, and horizontally under it.
          expect(top).toBeLessThan(eye.cy + eye.ry + 6);
          expect(Math.abs(x - eye.cx)).toBeLessThan(eye.rx + 4);
        }
      }
    });

    it(`${seed}: glints sit on the top outer corner of their eye`, () => {
      for (const pose of [idle, impressedPose]) {
        for (const m of eyeMarks(accentMarks(a, "glints"))) {
          const eye = posedEye(seed, m, pose);
          const o = placeStatic(_layout(seed, {}), m, pose);
          expect(o.y).toBeLessThan(eye.cy);
          expect(Math.sign(o.x - eye.cx)).toBe(a.eyes[m.eye].wrap);
        }
      }
    });
  }

  it("moves with the pose: a lifted pose lifts eye and body marks alike", () => {
    const layout = _layout("aanya", {});
    const a = restAnchors(layout);
    const [blush] = eyeMarks(accentMarks(a, "blush"));
    const [q] = accentMarks(a, "question");
    // `happy` lifts the body 2.2 and its eyes further (edy).
    expect(placeStatic(layout, blush, happy).y).toBeLessThan(placeStatic(layout, blush, idle).y);
    expect(placeStatic(layout, q, happy).y).toBeCloseTo(placeStatic(layout, q, idle).y - 2.2, 5);
  });
});

describe("accentMarks", () => {
  const a = restAnchors(_layout("aanya", {}));

  it("draws each mark, and anchors each to the right thing", () => {
    const blush = accentMarks(a, "blush");
    expect(blush.map((m) => [m.follow, m.shape.tag])).toEqual([["eye", "ellipse"], ["eye", "ellipse"]]);
    expect(accentMarks(a, "glints").every((m) => m.follow === "eye")).toBe(true);
    // Two creases per eye, and one tear under the winking eye.
    const laugh = accentMarks(a, "laugh");
    expect(laugh).toHaveLength(5);
    expect(eyeMarks(laugh).filter((m) => m.shape.className === "pet-accent-tear").map((m) => m.eye)).toEqual([1]);
    // The "?" and the sheen ride the whole face, not an eye.
    expect(accentMarks(a, "question")).toEqual([expect.objectContaining({ follow: "body" })]);
    expect(accentMarks(a, "sheen")).toEqual([expect.objectContaining({ follow: "body" })]);
  });
});
