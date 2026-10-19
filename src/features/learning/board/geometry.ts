/**
 * The whiteboard's geometry, in world units (1 unit = 1 CSS px at zoom 1).
 * Pure functions, so placement and camera framing can be tested without a
 * browser.
 */

export interface Size {
  w: number;
  h: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

/** The camera: world point (0,0) is drawn at screen (x, y), everything scaled by `scale`. */
export interface Camera {
  x: number;
  y: number;
  scale: number;
}

/** Parts of the viewport covered by overlays (title, question card, filmstrip), which framing keeps clear of. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
export const MIN_SCALE = 0.15;
export const MAX_SCALE = 4;
/** Empty board between figures, so framing one never shows its neighbours. */
export const SPACING = 900;
/** The longer side of a figure on the board, at zoom 1. */
const FIGURE_LONG_SIDE = 760;

export const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

/** A picture's size on the board: its aspect ratio, its longer side at a fixed world length. */
export function boardSize(widthPx: number, heightPx: number): Size {
  const w = widthPx > 0 ? widthPx : 4;
  const h = heightPx > 0 ? heightPx : 3;
  return w >= h
    ? { w: FIGURE_LONG_SIDE, h: Math.round((FIGURE_LONG_SIDE * h) / w) }
    : { w: Math.round((FIGURE_LONG_SIDE * w) / h), h: FIGURE_LONG_SIDE };
}

const tooClose = (a: Rect, b: Rect) =>
  a.x < b.x + b.w + SPACING && b.x < a.x + a.w + SPACING && a.y < b.y + b.h + SPACING && b.y < a.y + a.h + SPACING;

export function bounds(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

/** A stable pseudo-random number in [0, 1) from a string, so a figure keeps its place across renders. */
function seeded(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Where each figure goes, in order. The first sits at the origin; each next
 * one goes a long way off the one before it, in a direction picked at random
 * (stable per key), far enough that framing one figure never shows another.
 * A direction that would land near an earlier figure is turned until it's free.
 */
export function layoutFigures(sizes: Size[], keys: string[] = []): Rect[] {
  const placed: Rect[] = [];
  sizes.forEach((size, i) => {
    const prev = placed.at(-1);
    if (!prev) {
      placed.push({ x: 0, y: 0, ...size });
      return;
    }
    const reach = Math.max(prev.w, prev.h, size.w, size.h) * 1.5 + SPACING;
    const start = seeded(keys[i] ?? String(i)) * Math.PI * 2;
    const pcx = prev.x + prev.w / 2;
    const pcy = prev.y + prev.h / 2;
    for (let attempt = 0; ; attempt++) {
      const angle = start + attempt * 0.7;
      const distance = reach * (1 + Math.floor(attempt / 9) * 0.6);
      const c: Rect = {
        x: Math.round(pcx + Math.cos(angle) * distance - size.w / 2),
        y: Math.round(pcy + Math.sin(angle) * distance - size.h / 2),
        ...size,
      };
      if (!placed.some((p) => tooClose(c, p))) {
        placed.push(c);
        return;
      }
    }
  });
  return placed;
}

/**
 * The camera that shows `rect` entirely, centred in the part of the viewport
 * the overlays leave clear, with some breathing room. It never zooms in past
 * `maxScale`, so a small figure isn't blown up.
 */
export function fitCamera(rect: Rect, viewport: Size, insets: Insets = NO_INSETS, maxScale = 1.25): Camera {
  const clearW = Math.max(1, viewport.w - insets.left - insets.right);
  const clearH = Math.max(1, viewport.h - insets.top - insets.bottom);
  const margin = 0.88;
  const scale = clampScale(Math.min((clearW * margin) / rect.w, (clearH * margin) / rect.h, maxScale));
  const cx = insets.left + clearW / 2;
  const cy = insets.top + clearH / 2;
  return { scale, x: cx - (rect.x + rect.w / 2) * scale, y: cy - (rect.y + rect.h / 2) * scale };
}

/** Zoom by `factor` keeping the world point under screen point (px, py) where it is. */
export function zoomAt(camera: Camera, factor: number, px: number, py: number): Camera {
  const scale = clampScale(camera.scale * factor);
  const k = scale / camera.scale;
  return { scale, x: px - (px - camera.x) * k, y: py - (py - camera.y) * k };
}

/**
 * The camera part-way (t in 0..1) along a flight from `a` to `b`: the point at
 * the centre of the clear area travels in a straight line in world space and
 * the zoom changes geometrically, so a flight that zooms out and back in reads
 * as one smooth move rather than a lurch.
 */
export function interpolateCamera(a: Camera, b: Camera, t: number, viewport: Size, insets: Insets = NO_INSETS): Camera {
  const cx = insets.left + (viewport.w - insets.left - insets.right) / 2;
  const cy = insets.top + (viewport.h - insets.top - insets.bottom) / 2;
  const worldA = { x: (cx - a.x) / a.scale, y: (cy - a.y) / a.scale };
  const worldB = { x: (cx - b.x) / b.scale, y: (cy - b.y) / b.scale };
  const scale = a.scale * Math.pow(b.scale / a.scale, t);
  const wx = worldA.x + (worldB.x - worldA.x) * t;
  const wy = worldA.y + (worldB.y - worldA.y) * t;
  return { scale, x: cx - wx * scale, y: cy - wy * scale };
}
