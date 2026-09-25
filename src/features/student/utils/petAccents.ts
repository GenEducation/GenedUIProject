/**
 * The pet's face marks — blush, star glints, laugh lines, a "?" — as data:
 * where each one is anchored on a particular creature, and what is drawn.
 *
 * Blobatar is pose-only by design ("nothing here adds a mark"), so these are
 * ours. They must move *with* the creature, and the creature moves a lot more
 * than its outer box does: its eyes morph between poses, glance about, follow
 * the cursor, blink, and the whole face bobs, breathes and lifts. All of that
 * happens inside blobatar's own SVG, as CSS on its groups and on registered
 * `--mo-*` custom properties that transition — "the morph is what a
 * transition on these numbers does".
 *
 * So the marks are anchored the way blobatar's own parts are, and drawn
 * inside its SVG (`PetFaceAccents` portals them there):
 *
 *  - **eye marks** hang off one eye. Their anchor is that eye's *resting*
 *    centre, plus an offset measured in the eye's own radii (`ox`, `oy`).
 *    CSS then applies the live pose to both — the same `--mo-edx`/`--mo-edy`
 *    offset and gaze vars the eye itself uses, and the eye's live scale to
 *    the radii — so a blush stays under its eye through a morph, a glance or
 *    a cursor chase, frame for frame (`globals.css`, `.pet-mark-eye`).
 *  - **body marks** (the "?", the sheen) ride the face as a whole, inside the
 *    group that bobs and lifts.
 *
 * `placeStatic` resolves the same marks for a still frame, through
 * blobatar's `Expression.bake` (the static renderer's own pose maths), for
 * the tests and the dev contact sheet. Pure; no DOM.
 */

import type { _layout, Expression } from "blobatar";
import type { PetAccent } from "../theme/petExpressions";

export type CreatureLayout = ReturnType<typeof _layout>;

export interface RestEye {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /**
   * Blobatar's side sign for this eye (`--mo-wrap`): −1 is the left eye, +1
   * the right. It picks the eye's own gaze var and the way `edx` pushes it.
   */
  wrap: -1 | 1;
}

export interface RestAnchors {
  /** Left eye first, at rest. */
  eyes: [RestEye, RestEye];
  face: { cx: number; cy: number; rx: number; ry: number };
  /** Just above the highest point of the whole silhouette, puffs included. */
  headTop: { x: number; y: number };
}

export function restAnchors(layout: CreatureLayout): RestAnchors {
  const sorted = layout.eyes
    .map((e) => ({ cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry }))
    .sort((a, b) => a.cx - b.cx);
  const left = sorted[0];
  const right = sorted[sorted.length - 1];

  // The whole silhouette's top: the body's, or a cloud/sun puff poking above it.
  // A droplet's tip is drawn as an `extra` path pointing up past both.
  const body = layout.body;
  const tops = [body.cy - body.ry, ...layout.petals.map((p) => p.cy - p.r)];
  if (layout.extra.length > 0) tops.push(body.cy - body.ry * 1.5);

  return {
    eyes: [{ ...left, wrap: -1 }, { ...right, wrap: 1 }],
    face: { cx: layout.face.cx, cy: layout.face.cy, rx: layout.face.rx, ry: layout.face.ry },
    headTop: { x: body.cx, y: Math.min(...tops) - 3 },
  };
}

// ── The marks ───────────────────────────────────────────────────────────────

/** What is drawn, in coordinates local to the mark's anchor. */
export type MarkShape =
  | { tag: "ellipse"; cx: number; cy: number; rx: number; ry: number; fill: string; opacity?: number; className?: string }
  | { tag: "path"; d: string; fill: string; stroke?: string; strokeWidth?: number; className?: string }
  | { tag: "text"; x: number; y: number; text: string; size: number; fill: string; stroke: string; className?: string }
  /** A band of light across the face ellipse, clipped to it. */
  | { tag: "sheen"; face: RestAnchors["face"]; className?: string };

export type AccentMark =
  | {
      follow: "eye";
      /** Index into `RestAnchors.eyes`. */
      eye: 0 | 1;
      /** Anchor offset from the eye's centre, in its own (live-scaled) radii. */
      ox: number;
      oy: number;
      shape: MarkShape;
    }
  /** Drawn in the face's own coordinates; bobs and lifts with it. */
  | { follow: "body"; shape: MarkShape };

const r2 = (n: number) => Math.round(n * 100) / 100;

/** A four-point sparkle centred on the origin, `s` from centre to tip. */
function star(s: number): string {
  const w = r2(s * 0.28);
  return `M0 ${-s}Q${w} ${-w} ${s} 0Q${w} ${w} 0 ${s}Q${-w} ${w} ${-s} 0Q${-w} ${-w} 0 ${-s}Z`;
}

const INK = "rgba(18, 22, 34, 0.62)";

export function accentMarks(a: RestAnchors, kind: PetAccent): AccentMark[] {
  const eyes = [0, 1] as const;
  const side = (i: 0 | 1) => a.eyes[i].wrap;

  switch (kind) {
    case "blush":
      // Hung off each eye's bottom edge (`oy: 1`), so however far the eye
      // squints, lifts or glances, the blush stays just under it.
      return eyes.map((i) => ({
        follow: "eye" as const, eye: i, ox: 0.2 * side(i), oy: 1,
        shape: {
          tag: "ellipse" as const, cx: r2(1.4 * side(i)), cy: 4.4, rx: 4.6, ry: 2.6,
          fill: "#FF6F91", opacity: 0.5, className: "pet-accent-blush",
        },
      }));

    case "glints":
      // A white four-point star catching the light at each eye's top outer corner.
      return eyes.map((i) => ({
        follow: "eye" as const, eye: i, ox: 0.9 * side(i), oy: -0.9,
        shape: {
          tag: "path" as const, d: star(5.2), fill: "#FFFFFF",
          stroke: "rgba(40, 30, 90, 0.55)", strokeWidth: 0.7, className: "pet-accent-glint",
        },
      }));

    case "laugh": {
      // Two laugh creases just outside each eye, and a happy tear under the
      // winking (right) one.
      const creases = eyes.flatMap((i) =>
        [-2.8, 2.8].map((dy) => ({
          follow: "eye" as const, eye: i, ox: side(i), oy: 0,
          shape: {
            tag: "path" as const,
            d: `M${r2(4 * side(i))} ${r2(dy - 2)}q${r2(2.6 * side(i))} 2 0 4`,
            fill: "none", stroke: INK, strokeWidth: 1.7, className: "pet-accent-crease",
          },
        })),
      );
      const tear: AccentMark = {
        follow: "eye", eye: 1, ox: 0.4, oy: 1,
        shape: {
          tag: "path", d: "M0 1q2.8 3.6 0 6q-2.8 -2.4 0 -6Z",
          fill: "#7CC8FF", stroke: "rgba(20, 70, 120, 0.45)", strokeWidth: 0.4, className: "pet-accent-tear",
        },
      };
      return [...creases, tear];
    }

    case "question":
      // Above the head, off to one side, like a thought that just arrived.
      return [{
        follow: "body",
        shape: {
          tag: "text", x: r2(a.headTop.x + a.face.rx * 0.55), y: r2(a.headTop.y + 2),
          text: "?", size: 18, fill: "#5B4DC7", stroke: "#FFFFFF", className: "pet-accent-question",
        },
      }];

    case "dots": {
      // "…" — three thought dots above the head that light up in turn: the
      // pet genuinely wondering. Curious's mark; Confused has the "?".
      const x0 = a.headTop.x + a.face.rx * 0.35;
      return [0, 1, 2].map((i) => ({
        follow: "body" as const,
        shape: {
          tag: "ellipse" as const, cx: r2(x0 + i * 5), cy: r2(a.headTop.y - 1), rx: 1.9, ry: 1.9,
          fill: "#5B4DC7", className: `pet-accent-dot pet-accent-dot-${i + 1}`,
        },
      }));
    }

    case "bashful": {
      // A light blush under each eye, and one tiny sweat drop at the temple:
      // a bashful "oops", never tears.
      const blush = eyes.map((i) => ({
        follow: "eye" as const, eye: i, ox: 0.2 * side(i), oy: 1,
        shape: {
          tag: "ellipse" as const, cx: r2(1.4 * side(i)), cy: 4.2, rx: 4.2, ry: 2.3,
          fill: "#FF6F91", opacity: 0.42, className: "pet-accent-blush",
        },
      }));
      // Outside the silhouette's edge at the temple, so it reads on any body
      // colour — white with a dark rim, the way a cartoon sweat drop is drawn.
      const sx = a.face.cx + a.face.rx * 1.02;
      const sy = a.face.cy - a.face.ry * 0.5;
      const sweat: AccentMark = {
        follow: "body",
        shape: {
          tag: "path", d: `M${r2(sx)} ${r2(sy - 5)}q3.8 5 0 8.2q-3.8 -3.2 0 -8.2Z`,
          fill: "#DDF3FF", stroke: "rgba(20, 60, 110, 0.75)", strokeWidth: 0.9, className: "pet-accent-sweat",
        },
      };
      return [...blush, sweat];
    }

    case "sheen":
      // A band of light sweeping across the face once: polished, pleased with itself.
      return [{ follow: "body", shape: { tag: "sheen", face: a.face, className: "pet-accent-sheen" } }];
  }
}

// ── Still frames ────────────────────────────────────────────────────────────

/** The `dy` out of a bake's `translate(0 dy)`; `""` means no lift. */
function liftOf(wrap: string): number {
  const m = /translate\(\s*0[ ,]+(-?[\d.]+)\s*\)/.exec(wrap);
  return m ? Number(m[1]) : 0;
}

/**
 * Where a mark's local origin lands in a still frame of `expression`: what
 * the live CSS converges to once a morph settles, with the gaze at rest.
 * Uses blobatar's own `bake`, i.e. the static renderer's pose maths.
 */
export function placeStatic(
  layout: CreatureLayout,
  mark: AccentMark,
  expression?: Expression,
): { x: number; y: number } {
  const baked = expression ? expression.bake(layout, expression.p) : { l: layout, wrap: "" };
  const dy = liftOf(baked.wrap);
  if (mark.follow === "body") return { x: 0, y: dy };
  const posed = [...baked.l.eyes].sort((a, b) => a.cx - b.cx);
  const e = mark.eye === 0 ? posed[0] : posed[posed.length - 1];
  return { x: e.cx + mark.ox * e.rx, y: e.cy + dy + mark.oy * e.ry };
}
