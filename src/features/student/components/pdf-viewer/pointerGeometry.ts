/**
 * pointerGeometry — pure, dependency-free helpers for the virtual teaching pointer.
 *
 * Everything here is framework- and pdfjs-agnostic so it can be unit-tested in
 * isolation (plain data in → plain data out). The React hook and overlay feed
 * real pdfjs text content / viewport transforms into these functions.
 *
 * Coordinate conventions:
 *  - "device" / "screen" rects use a TOP-LEFT origin, y growing downward, in CSS
 *    pixels at the current render scale (i.e. they line up 1:1 with the rendered
 *    canvas).
 *  - normalized bbox / point values are fractions of the page (0..1), also
 *    top-left origin, matching how a human reads the page.
 */

export type Matrix = [number, number, number, number, number, number];

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Minimal shape of a pdfjs TextItem (only the fields we need). */
export interface TextItemLike {
  str: string;
  /** 6-element affine transform mapping text space → PDF user space. */
  transform: number[];
  /** Run width in PDF user-space units (i.e. at scale 1). */
  width: number;
  /** Run height in PDF user-space units. */
  height: number;
  hasEOL?: boolean;
}

/** Where the AI wants the pointer to land. */
export type PointerTarget =
  /**
   * Point at a text snippet. With `textEnd`, the pointer spans from the start of
   * `text` to the end of `textEnd` (everything between them on the page) — used
   * to box a whole stanza / sentence / paragraph rather than a single line.
   */
  | { kind: "text"; text: string; textEnd?: string; occurrence?: number }
  /** normalized [x0, y0, x1, y1], top-left origin, 0..1. */
  | { kind: "bbox"; bbox: [number, number, number, number] }
  | { kind: "figure"; figureId?: string; bbox?: [number, number, number, number] }
  /** normalized point, top-left origin, 0..1. */
  | { kind: "point"; x: number; y: number };

export interface PointerSpec {
  /**
   * 1-based page number within the chapter PDF. Optional for text targets — when
   * omitted the resolver searches every page for the snippet. Non-text targets
   * fall back to page 1 when omitted.
   */
  page?: number;
  target: PointerTarget;
  /** Optional callout shown next to the pointer. */
  label?: string;
  /** Auto-hide after this many ms. Omit to persist until replaced/cleared. */
  ttlMs?: number;
}

/**
 * Affine matrix multiply, identical in semantics to pdfjs `Util.transform`.
 * Returns m1 ∘ m2 (apply m2 first, then m1).
 */
export function multiplyTransform(m1: number[], m2: number[]): Matrix {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/**
 * Convert a single pdfjs text item into a top-left-origin device rect.
 *
 * @param viewportTransform pdfjs viewport.transform (already includes scale + y-flip).
 * @param scale             pdfjs viewport.scale (used to scale the run width).
 */
export function textItemToRect(
  viewportTransform: number[],
  scale: number,
  item: TextItemLike
): Rect {
  const tx = multiplyTransform(viewportTransform, item.transform);
  // Combined transform maps the glyph baseline origin; its vertical magnitude is
  // the device-space font height.
  const fontHeight = Math.hypot(tx[2], tx[3]);
  const x = tx[4];
  const baselineY = tx[5];
  const width = item.width * scale;
  return { x, y: baselineY - fontHeight, width, height: fontHeight };
}

/** Smallest rect covering all input rects, or null if none. */
export function unionRects(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Collapse whitespace + lowercase, for forgiving text matching. */
export function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Find which text items make up the `occurrence`-th match of `query`.
 *
 * Items are joined with single spaces (matching how pdfjs splits runs), the
 * query is matched case-insensitively against the collapsed text, and the
 * matched character span is mapped back to the items it touches.
 *
 * @returns sorted, de-duplicated item indices; empty if no match.
 */
export function findMatchingItemIndices(
  items: TextItemLike[],
  query: string,
  occurrence = 0
): number[] {
  const needle = normalizeText(query);
  if (!needle) return [];

  // Build a haystack of normalized item strings joined by spaces, recording the
  // owning item index for every character (join spaces map to -1).
  let haystack = "";
  const owner: number[] = [];
  items.forEach((item, idx) => {
    const norm = normalizeText(item.str);
    if (!norm) return;
    if (haystack.length > 0) {
      haystack += " ";
      owner.push(-1);
    }
    for (let i = 0; i < norm.length; i++) owner.push(idx);
    haystack += norm;
  });

  // Locate the requested occurrence.
  let from = 0;
  let start = -1;
  for (let n = 0; n <= occurrence; n++) {
    start = haystack.indexOf(needle, from);
    if (start === -1) return [];
    from = start + 1;
  }
  const end = start + needle.length;

  const indices = new Set<number>();
  for (let i = start; i < end; i++) {
    const o = owner[i];
    if (o >= 0) indices.add(o);
  }
  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Item indices spanning a range: from the first match of `start` through the end
 * of the first match of `end` that occurs at/after it. Returns every item in
 * between (inclusive) so a multi-line block (e.g. a stanza) is fully covered.
 * Falls back to just the `start` match if `end` isn't found after it.
 */
export function findRangeItemIndices(
  items: TextItemLike[],
  start: string,
  end: string
): number[] {
  const startIdxs = findMatchingItemIndices(items, start);
  if (startIdxs.length === 0) return [];
  const from = startIdxs[0];

  // Search for the end phrase only within the items at/after the start.
  const tailRel = findMatchingItemIndices(items.slice(from), end);
  const to =
    tailRel.length > 0
      ? from + tailRel[tailRel.length - 1]
      : startIdxs[startIdxs.length - 1];

  const result: number[] = [];
  for (let i = from; i <= to; i++) result.push(i);
  return result;
}

/** Clamp a rect so it stays within [0,0,pageWidth,pageHeight]. */
export function clampRectToPage(rect: Rect, pageWidth: number, pageHeight: number): Rect {
  const x = Math.max(0, Math.min(rect.x, pageWidth));
  const y = Math.max(0, Math.min(rect.y, pageHeight));
  const width = Math.max(0, Math.min(rect.width, pageWidth - x));
  const height = Math.max(0, Math.min(rect.height, pageHeight - y));
  return { x, y, width, height };
}

export interface ResolveParams {
  target: PointerTarget;
  /** Rendered page size in device pixels (viewport.width/height at scale). */
  pageWidth: number;
  pageHeight: number;
  /** Required for text targets. */
  items?: TextItemLike[];
  viewportTransform?: number[];
  scale?: number;
}

/**
 * Resolve a pointer target into a page-local device rect (top-left origin), or
 * null if it cannot be located (e.g. text not found, missing inputs).
 */
export function resolveTargetRect(params: ResolveParams): Rect | null {
  const { target, pageWidth, pageHeight } = params;

  switch (target.kind) {
    case "text": {
      const { items, viewportTransform, scale } = params;
      if (!items || !viewportTransform || scale == null) return null;
      const idxs = target.textEnd
        ? findRangeItemIndices(items, target.text, target.textEnd)
        : findMatchingItemIndices(items, target.text, target.occurrence ?? 0);
      if (idxs.length === 0) return null;
      const rects = idxs.map((i) => textItemToRect(viewportTransform, scale, items[i]));
      const u = unionRects(rects);
      return u ? clampRectToPage(u, pageWidth, pageHeight) : null;
    }
    case "bbox":
    case "figure": {
      const bbox = target.bbox;
      if (!bbox) return null;
      const [x0, y0, x1, y1] = bbox;
      const rect: Rect = {
        x: x0 * pageWidth,
        y: y0 * pageHeight,
        width: (x1 - x0) * pageWidth,
        height: (y1 - y0) * pageHeight,
      };
      return clampRectToPage(rect, pageWidth, pageHeight);
    }
    case "point": {
      const rect: Rect = {
        x: target.x * pageWidth,
        y: target.y * pageHeight,
        width: 0,
        height: 0,
      };
      return clampRectToPage(rect, pageWidth, pageHeight);
    }
    default:
      return null;
  }
}

/** Shift a page-local rect into the scroll-content container's coordinate space. */
export function pageRectToContent(rect: Rect, pageOffsetLeft: number, pageOffsetTop: number): Rect {
  return {
    x: rect.x + pageOffsetLeft,
    y: rect.y + pageOffsetTop,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Normalize a loose AI event object into a PointerSpec.
 *
 * Accepts either a structured `target` object or flat convenience fields
 * (`text`, `bbox`, `figure_id`, `x`/`y`). Returns null if no usable target is
 * present so callers can ignore malformed events.
 */
export function parsePointerEvent(event: any): PointerSpec | null {
  if (!event || typeof event !== "object") return null;

  // Page is optional — preserved only when explicitly provided so text targets
  // can fall back to a cross-page search.
  const page = isNum(event.page) && event.page > 0 ? event.page : undefined;
  const label = typeof event.label === "string" ? event.label : undefined;
  const ttlMs =
    typeof event.ttl_ms === "number"
      ? event.ttl_ms
      : typeof event.ttlMs === "number"
        ? event.ttlMs
        : undefined;

  const target = parseTarget(event);
  if (!target) return null;

  return { page, target, label, ttlMs };
}

function parseTarget(event: any): PointerTarget | null {
  const t = event.target;
  if (t && typeof t === "object" && typeof t.kind === "string") {
    // Trust an already-structured target after a light validity check.
    if (t.kind === "text" && typeof t.text === "string" && t.text.trim()) {
      return { kind: "text", text: t.text, textEnd: strOrUndef(t.textEnd ?? t.text_end), occurrence: numOrUndef(t.occurrence) };
    }
    if (t.kind === "bbox" && isBbox(t.bbox)) return { kind: "bbox", bbox: t.bbox };
    if (t.kind === "figure") return { kind: "figure", figureId: t.figureId ?? t.figure_id, bbox: isBbox(t.bbox) ? t.bbox : undefined };
    if (t.kind === "point" && isNum(t.x) && isNum(t.y)) return { kind: "point", x: t.x, y: t.y };
  }

  // Flat-field fallbacks. A figure id is more specific than a bare bbox, so it
  // wins when both are present (the bbox becomes the figure's region).
  if (typeof event.text === "string" && event.text.trim()) {
    return { kind: "text", text: event.text, textEnd: strOrUndef(event.text_end ?? event.textEnd), occurrence: numOrUndef(event.occurrence) };
  }
  if (event.figure_id || event.figureId) {
    return { kind: "figure", figureId: event.figure_id ?? event.figureId, bbox: isBbox(event.bbox) ? event.bbox : undefined };
  }
  if (isBbox(event.bbox)) return { kind: "bbox", bbox: event.bbox };
  if (isNum(event.x) && isNum(event.y)) return { kind: "point", x: event.x, y: event.y };

  return null;
}

function isNum(v: any): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function numOrUndef(v: any): number | undefined {
  return isNum(v) ? v : undefined;
}

function strOrUndef(v: any): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function isBbox(v: any): v is [number, number, number, number] {
  return Array.isArray(v) && v.length === 4 && v.every(isNum);
}
