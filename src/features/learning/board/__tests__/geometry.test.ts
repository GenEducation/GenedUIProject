import { describe, it, expect } from "vitest";
import { boardSize, fitCamera, SPACING, layoutFigures, type Rect } from "../geometry";

const project = (r: Rect, c: { x: number; y: number; scale: number }) => ({
  x: c.x + r.x * c.scale, y: c.y + r.y * c.scale, w: r.w * c.scale, h: r.h * c.scale,
});

const apart = (a: Rect, b: Rect) =>
  Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));

describe("board geometry", () => {
  it("places each figure apart from every other, wherever it lands", () => {
    const ids = Array.from({ length: 9 }, (_, i) => `fig-${i}`);
    const rects = layoutFigures(Array.from({ length: 9 }, (_, i) => boardSize(i % 2 ? 900 : 1600, 1000)), ids);
    expect(rects[0]).toMatchObject({ x: 0, y: 0 });
    for (let i = 0; i < rects.length; i++) {
      for (let j = 0; j < i; j++) expect(apart(rects[i], rects[j])).toBeGreaterThanOrEqual(SPACING);
    }
    // Stable: the same figures land in the same places.
    expect(layoutFigures(rects.map(({ w, h }) => ({ w, h })), ids)).toEqual(rects);
  });

  it("frames a figure whole inside the area the overlays leave clear", () => {
    const rect = { x: 2000, y: 1500, w: 760, h: 475 };
    const viewport = { w: 1000, h: 700 };
    const insets = { top: 72, right: 300, bottom: 128, left: 0 };
    const cam = fitCamera(rect, viewport, insets);
    const on = project(rect, cam);
    expect(on.x).toBeGreaterThanOrEqual(insets.left);
    expect(on.y).toBeGreaterThanOrEqual(insets.top);
    expect(on.x + on.w).toBeLessThanOrEqual(viewport.w - insets.right);
    expect(on.y + on.h).toBeLessThanOrEqual(viewport.h - insets.bottom);
  });

});
