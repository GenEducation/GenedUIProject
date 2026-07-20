/**
 * Unit tests for pointerGeometry.
 * Runs under Vitest (`npm test`); uses node:assert for the assertions.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  multiplyTransform,
  textItemToRect,
  unionRects,
  normalizeText,
  findMatchingItemIndices,
  clampRectToPage,
  resolveTargetRect,
  pageRectToContent,
  deviceRectToNorm,
  normRectToPageRect,
  parsePointerEvent,
  type TextItemLike,
  type Rect,
} from "./pointerGeometry.ts";

function approx(actual: number, expected: number, eps = 1e-6, msg?: string) {
  assert.ok(Math.abs(actual - expected) <= eps, msg ?? `expected ${actual} ≈ ${expected}`);
}
function approxRect(a: Rect, e: Rect, eps = 1e-4) {
  approx(a.x, e.x, eps, `x ${a.x} ≈ ${e.x}`);
  approx(a.y, e.y, eps, `y ${a.y} ≈ ${e.y}`);
  approx(a.width, e.width, eps, `w ${a.width} ≈ ${e.width}`);
  approx(a.height, e.height, eps, `h ${a.height} ≈ ${e.height}`);
}

// ── multiplyTransform ─────────────────────────────────────────────────────────
test("multiplyTransform matches pdfjs Util.transform for a real page+item", () => {
  // viewport.transform for a 612x792 page at scale 1, and item0 ("Ocean Depths").
  const vp = [1, 0, 0, -1, 0, 792];
  const item = [36, 0, 0, 36, 50, 712];
  assert.deepEqual(multiplyTransform(vp, item), [36, 0, 0, -36, 50, 80]);
});

test("multiplyTransform identity is a no-op", () => {
  const I = [1, 0, 0, 1, 0, 0];
  const m = [2, 3, 4, 5, 6, 7];
  assert.deepEqual(multiplyTransform(I, m), [2, 3, 4, 5, 6, 7]);
  assert.deepEqual(multiplyTransform(m, I), [2, 3, 4, 5, 6, 7]);
});

// ── textItemToRect ────────────────────────────────────────────────────────────
test("textItemToRect produces a top-left device rect (real values)", () => {
  const vp = [1, 0, 0, -1, 0, 792];
  const item: TextItemLike = { str: "Ocean Depths", transform: [36, 0, 0, 36, 50, 712], width: 283.148, height: 36 };
  const r = textItemToRect(vp, 1, item);
  // baseline device y = 80, fontHeight = 36 → top = 44
  approxRect(r, { x: 50, y: 44, width: 283.148, height: 36 }, 1e-3);
});

test("textItemToRect scales width with viewport scale", () => {
  const vp = [2, 0, 0, -2, 0, 1584]; // same page at scale 2
  const item: TextItemLike = { str: "Ocean Depths", transform: [36, 0, 0, 36, 50, 712], width: 283.148, height: 36 };
  const r = textItemToRect(vp, 2, item);
  approxRect(r, { x: 100, y: 88, width: 566.296, height: 72 }, 1e-3);
});

// ── unionRects ────────────────────────────────────────────────────────────────
test("unionRects covers all rects", () => {
  const u = unionRects([
    { x: 10, y: 10, width: 20, height: 5 },
    { x: 40, y: 8, width: 10, height: 10 },
  ]);
  assert.deepEqual(u, { x: 10, y: 8, width: 40, height: 10 });
});
test("unionRects of empty is null", () => {
  assert.equal(unionRects([]), null);
});

// ── normalizeText ─────────────────────────────────────────────────────────────
test("normalizeText collapses whitespace and lowercases", () => {
  assert.equal(normalizeText("  The   Law\nOF   Mass  "), "the law of mass");
});

// ── findMatchingItemIndices ───────────────────────────────────────────────────
const ITEMS: TextItemLike[] = [
  { str: "Photosynthesis", transform: [], width: 0, height: 0 },
  { str: "is the", transform: [], width: 0, height: 0 },
  { str: "process", transform: [], width: 0, height: 0 },
  { str: "by which plants", transform: [], width: 0, height: 0 },
  { str: "make food.", transform: [], width: 0, height: 0 },
];

test("matches a single item, case-insensitive", () => {
  assert.deepEqual(findMatchingItemIndices(ITEMS, "PHOTOSYNTHESIS"), [0]);
});
test("matches a phrase spanning multiple items", () => {
  assert.deepEqual(findMatchingItemIndices(ITEMS, "the process by which"), [1, 2, 3]);
});
test("returns empty when not found", () => {
  assert.deepEqual(findMatchingItemIndices(ITEMS, "mitochondria"), []);
});
test("respects the occurrence index for repeated text", () => {
  const items: TextItemLike[] = [
    { str: "water cycle", transform: [], width: 0, height: 0 },
    { str: "and the", transform: [], width: 0, height: 0 },
    { str: "water cycle again", transform: [], width: 0, height: 0 },
  ];
  assert.deepEqual(findMatchingItemIndices(items, "water cycle", 0), [0]);
  assert.deepEqual(findMatchingItemIndices(items, "water cycle", 1), [2]);
  assert.deepEqual(findMatchingItemIndices(items, "water cycle", 2), []);
});
test("empty query returns empty", () => {
  assert.deepEqual(findMatchingItemIndices(ITEMS, "   "), []);
});

// ── clampRectToPage ───────────────────────────────────────────────────────────
test("clampRectToPage keeps rect inside the page", () => {
  assert.deepEqual(clampRectToPage({ x: -5, y: -5, width: 50, height: 50 }, 100, 100), {
    x: 0, y: 0, width: 50, height: 50,
  });
  assert.deepEqual(clampRectToPage({ x: 80, y: 80, width: 50, height: 50 }, 100, 100), {
    x: 80, y: 80, width: 20, height: 20,
  });
});

// ── resolveTargetRect ─────────────────────────────────────────────────────────
test("resolveTargetRect (text) unions matched items", () => {
  const vp = [1, 0, 0, -1, 0, 792];
  const items: TextItemLike[] = [
    { str: "Law of", transform: [12, 0, 0, 12, 50, 700], width: 40, height: 12 },
    { str: "conservation", transform: [12, 0, 0, 12, 95, 700], width: 80, height: 12 },
  ];
  const r = resolveTargetRect({
    target: { kind: "text", text: "Law of conservation" },
    pageWidth: 612, pageHeight: 792, items, viewportTransform: vp, scale: 1,
  });
  assert.ok(r);
  // both runs share baseline 700 → device top = 792-700-12 = 80; height 12
  approx(r!.y, 80, 1e-3);
  approx(r!.height, 12, 1e-3);
  approx(r!.x, 50, 1e-3);
});
test("resolveTargetRect (text) returns null when not found", () => {
  const r = resolveTargetRect({
    target: { kind: "text", text: "nope" },
    pageWidth: 612, pageHeight: 792, items: ITEMS, viewportTransform: [1, 0, 0, -1, 0, 792], scale: 1,
  });
  assert.equal(r, null);
});
test("resolveTargetRect (text) returns null without pdfjs inputs", () => {
  const r = resolveTargetRect({ target: { kind: "text", text: "x" }, pageWidth: 100, pageHeight: 100 });
  assert.equal(r, null);
});
test("resolveTargetRect (bbox) denormalizes to page pixels", () => {
  const r = resolveTargetRect({
    target: { kind: "bbox", bbox: [0.1, 0.2, 0.6, 0.5] },
    pageWidth: 600, pageHeight: 800,
  });
  assert.deepEqual(r, { x: 60, y: 160, width: 300, height: 240 });
});
test("resolveTargetRect (figure with bbox) behaves like bbox", () => {
  const r = resolveTargetRect({
    target: { kind: "figure", figureId: "f1", bbox: [0, 0, 0.5, 0.5] },
    pageWidth: 600, pageHeight: 800,
  });
  assert.deepEqual(r, { x: 0, y: 0, width: 300, height: 400 });
});
test("resolveTargetRect (figure without bbox) is null", () => {
  const r = resolveTargetRect({ target: { kind: "figure", figureId: "f1" }, pageWidth: 600, pageHeight: 800 });
  assert.equal(r, null);
});
test("resolveTargetRect (point) yields a zero-size rect at the point", () => {
  const r = resolveTargetRect({ target: { kind: "point", x: 0.5, y: 0.25 }, pageWidth: 600, pageHeight: 800 });
  assert.deepEqual(r, { x: 300, y: 200, width: 0, height: 0 });
});

// ── pageRectToContent ─────────────────────────────────────────────────────────
test("pageRectToContent offsets by the page position", () => {
  assert.deepEqual(pageRectToContent({ x: 10, y: 20, width: 5, height: 5 }, 100, 300), {
    x: 110, y: 320, width: 5, height: 5,
  });
});

// ── deviceRectToNorm / normRectToPageRect ────────────────────────────────────
test("deviceRectToNorm divides through by the page size", () => {
  assert.deepEqual(deviceRectToNorm({ x: 60, y: 160, width: 300, height: 240 }, 600, 800), {
    x: 0.1, y: 0.2, width: 0.5, height: 0.3,
  });
});
test("deviceRectToNorm preserves zero-size rects (point targets)", () => {
  assert.deepEqual(deviceRectToNorm({ x: 300, y: 200, width: 0, height: 0 }, 600, 800), {
    x: 0.5, y: 0.25, width: 0, height: 0,
  });
});
test("deviceRectToNorm returns zeros when the page has no size", () => {
  assert.deepEqual(deviceRectToNorm({ x: 10, y: 20, width: 5, height: 5 }, 0, 0), {
    x: 0, y: 0, width: 0, height: 0,
  });
});
test("normRectToPageRect multiplies by the live page box", () => {
  assert.deepEqual(normRectToPageRect({ x: 0.1, y: 0.2, width: 0.5, height: 0.3 }, 600, 800), {
    x: 60, y: 160, width: 300, height: 240,
  });
});
test("device → norm → page round-trips at a different scale", () => {
  // Resolve a bbox at scale 1 (600×800), normalize, then place against a live
  // box scaled 1.5× (900×1200): the rect should scale proportionally.
  const device = resolveTargetRect({ target: { kind: "bbox", bbox: [0.1, 0.2, 0.6, 0.5] }, pageWidth: 600, pageHeight: 800 })!;
  const norm = deviceRectToNorm(device, 600, 800);
  approxRect(normRectToPageRect(norm, 900, 1200), { x: 90, y: 240, width: 450, height: 360 });
});

// ── parsePointerEvent ─────────────────────────────────────────────────────────
test("parsePointerEvent reads a structured text target", () => {
  const spec = parsePointerEvent({ type: "pointer", page: 3, target: { kind: "text", text: "osmosis" }, label: "Look here", ttl_ms: 4000 });
  assert.deepEqual(spec, { page: 3, target: { kind: "text", text: "osmosis", textEnd: undefined, occurrence: undefined }, label: "Look here", ttlMs: 4000 });
});
test("parsePointerEvent reads flat fields (text)", () => {
  const spec = parsePointerEvent({ page: 2, text: "photosynthesis" });
  assert.deepEqual(spec, { page: 2, target: { kind: "text", text: "photosynthesis", textEnd: undefined, occurrence: undefined }, label: undefined, ttlMs: undefined });
});
test("parsePointerEvent reads flat bbox and leaves page undefined", () => {
  const spec = parsePointerEvent({ bbox: [0.1, 0.1, 0.2, 0.2] });
  assert.deepEqual(spec, { page: undefined, target: { kind: "bbox", bbox: [0.1, 0.1, 0.2, 0.2] }, label: undefined, ttlMs: undefined });
});
test("parsePointerEvent reads figure_id", () => {
  const spec = parsePointerEvent({ page: 5, figure_id: "fig-2", bbox: [0, 0, 1, 1] });
  assert.deepEqual(spec, { page: 5, target: { kind: "figure", figureId: "fig-2", bbox: [0, 0, 1, 1] }, label: undefined, ttlMs: undefined });
});
test("parsePointerEvent returns null for unusable events", () => {
  assert.equal(parsePointerEvent({ page: 2 }), null);
  assert.equal(parsePointerEvent({ text: "   " }), null);
  assert.equal(parsePointerEvent(null), null);
  assert.equal(parsePointerEvent({ bbox: [1, 2, 3] }), null); // wrong length
});
