/**
 * Integration test: drives the real pointer resolution pipeline against a real
 * PDF using pdfjs (the same library the app uses), exercising getTextContent +
 * textItemToRect + resolveTargetRect together — not mocks.
 *
 * Run with:
 *   node --test src/features/student/components/pdf-viewer/pointerGeometry.integration.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { resolveTargetRect } from "./pointerGeometry.ts";

const PDF_URL = new URL(
  "../../../../../.gemini/skills/theme-factory/theme-showcase.pdf",
  import.meta.url
);

async function loadPage(pageNum, scale = 1) {
  const doc = await getDocument({ url: PDF_URL }).promise;
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const tc = await page.getTextContent();
  const items = tc.items.filter((it) => typeof it.str === "string");
  return { doc, viewport, items };
}

test("resolves a heading's text to a sane top-left rect (real PDF)", async () => {
  const { doc, viewport, items } = await loadPage(1);
  const rect = resolveTargetRect({
    target: { kind: "text", text: "Ocean Depths" },
    pageWidth: viewport.width,
    pageHeight: viewport.height,
    items,
    viewportTransform: viewport.transform,
    scale: 1,
  });
  assert.ok(rect, "rect should resolve");
  // Heading sits near the top-left of the 612x792 page.
  assert.ok(rect.x > 40 && rect.x < 70, `x=${rect.x} near left margin`);
  assert.ok(rect.y > 30 && rect.y < 60, `y=${rect.y} near top`);
  assert.ok(rect.width > 150, `width=${rect.width} spans the heading`);
  assert.ok(rect.height > 20 && rect.height < 60, `height=${rect.height} ~one line`);
  await doc.destroy();
});

test("scale doubles the resolved rect (real PDF)", async () => {
  const a = await loadPage(1, 1);
  const rect1 = resolveTargetRect({
    target: { kind: "text", text: "Ocean Depths" },
    pageWidth: a.viewport.width, pageHeight: a.viewport.height,
    items: a.items, viewportTransform: a.viewport.transform, scale: 1,
  });
  await a.doc.destroy();

  const b = await loadPage(1, 2);
  const rect2 = resolveTargetRect({
    target: { kind: "text", text: "Ocean Depths" },
    pageWidth: b.viewport.width, pageHeight: b.viewport.height,
    items: b.items, viewportTransform: b.viewport.transform, scale: 2,
  });
  await b.doc.destroy();

  assert.ok(rect1 && rect2);
  assert.ok(Math.abs(rect2.x - rect1.x * 2) < 1, `x scales: ${rect1.x}→${rect2.x}`);
  assert.ok(Math.abs(rect2.width - rect1.width * 2) < 1, `w scales: ${rect1.width}→${rect2.width}`);
  assert.ok(Math.abs(rect2.height - rect1.height * 2) < 1, `h scales: ${rect1.height}→${rect2.height}`);
});

test("returns null for text that is not on the page (real PDF)", async () => {
  const { doc, viewport, items } = await loadPage(1);
  const rect = resolveTargetRect({
    target: { kind: "text", text: "this string is definitely not present xyzzy" },
    pageWidth: viewport.width, pageHeight: viewport.height,
    items, viewportTransform: viewport.transform, scale: 1,
  });
  assert.equal(rect, null);
  await doc.destroy();
});

test("a normalized figure bbox maps inside page bounds (real PDF)", async () => {
  const { doc, viewport } = await loadPage(1);
  const rect = resolveTargetRect({
    target: { kind: "figure", figureId: "diagram-1", bbox: [0.2, 0.5, 0.8, 0.75] },
    pageWidth: viewport.width,
    pageHeight: viewport.height,
  });
  assert.ok(rect);
  assert.ok(rect.x >= 0 && rect.x + rect.width <= viewport.width);
  assert.ok(rect.y >= 0 && rect.y + rect.height <= viewport.height);
  assert.ok(Math.abs(rect.x - 0.2 * viewport.width) < 1);
  await doc.destroy();
});
