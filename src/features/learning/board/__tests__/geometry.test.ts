import { describe, it, expect } from "vitest";
import { boardSize, fitCamera, interpolateCamera, SPACING, layoutFigures, zoomAt, type Rect } from "../geometry";

const project = (r: Rect, c: { x: number; y: number; scale: number }) => ({
  x: c.x + r.x * c.scale, y: c.y + r.y * c.scale, w: r.w * c.scale, h: r.h * c.scale,
});

const apart = (a: Rect, b: Rect) =>
  Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));

describe("board geometry", () => {
  it("sizes a picture by its aspect, the longer side fixed", () => {
    expect(boardSize(1600, 1000)).toEqual({ w: 760, h: 475 });
    expect(boardSize(500, 1000)).toEqual({ w: 380, h: 760 });
  });

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

  it("doesn't blow a small figure up past the zoom cap", () => {
    expect(fitCamera({ x: 0, y: 0, w: 100, h: 60 }, { w: 2000, h: 1400 }).scale).toBe(1.25);
  });

  it("zooms around a point, keeping it where it is", () => {
    const cam = { x: 40, y: -20, scale: 0.8 };
    const next = zoomAt(cam, 2, 300, 200);
    const world = { x: (300 - cam.x) / cam.scale, y: (200 - cam.y) / cam.scale };
    expect(next.x + world.x * next.scale).toBeCloseTo(300);
    expect(next.y + world.y * next.scale).toBeCloseTo(200);
  });

  it("a flight starts and ends exactly on its cameras, zooming geometrically", () => {
    const a = { x: 0, y: 0, scale: 0.5 };
    const b = { x: -800, y: -400, scale: 2 };
    const vp = { w: 1000, h: 800 };
    const at = (t: number) => interpolateCamera(a, b, t, vp);
    expect(at(0).x).toBeCloseTo(a.x);
    expect(at(0).scale).toBeCloseTo(a.scale);
    expect(at(1).x).toBeCloseTo(b.x);
    expect(at(1).y).toBeCloseTo(b.y);
    expect(at(0.5).scale).toBeCloseTo(1); // the geometric midpoint of 0.5 and 2
  });

});
