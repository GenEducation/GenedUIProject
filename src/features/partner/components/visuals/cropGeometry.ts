import type { CropBox } from "../../types/visuals";

/**
 * Crop boxes in thousandths of their page, `[ymin, xmin, ymax, xmax]` — the
 * backend's order. Every helper keeps a box inside the page and at least
 * `MIN_SIDE` on each side (the backend refuses anything under 10).
 */
export const MIN_SIDE = 20;

export interface Point {
  x: number;
  y: number;
}

/** Which edges a resize handle drags. A corner moves two, an edge one. */
export interface Edges {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A pointer position over the page frame, in thousandths, kept on the page. */
export function toThousandths(clientX: number, clientY: number, rect: DOMRect): Point {
  return {
    x: clamp(Math.round(((clientX - rect.left) / rect.width) * 1000), 0, 1000),
    y: clamp(Math.round(((clientY - rect.top) / rect.height) * 1000), 0, 1000),
  };
}

/** The box shifted by `(dx, dy)`, same size, stopped at the page's edges. */
export function moveBox([ymin, xmin, ymax, xmax]: CropBox, dx: number, dy: number): CropBox {
  const h = ymax - ymin;
  const w = xmax - xmin;
  const top = clamp(ymin + dy, 0, 1000 - h);
  const left = clamp(xmin + dx, 0, 1000 - w);
  return [top, left, top + h, left + w];
}

/** The box with `edges` dragged by `(dx, dy)`; an edge stops `MIN_SIDE` short of the opposite one. */
export function resizeBox([ymin, xmin, ymax, xmax]: CropBox, edges: Edges, dx: number, dy: number): CropBox {
  return [
    edges.top ? clamp(ymin + dy, 0, ymax - MIN_SIDE) : ymin,
    edges.left ? clamp(xmin + dx, 0, xmax - MIN_SIDE) : xmin,
    edges.bottom ? clamp(ymax + dy, ymin + MIN_SIDE, 1000) : ymax,
    edges.right ? clamp(xmax + dx, xmin + MIN_SIDE, 1000) : xmax,
  ];
}

/** The box between two points, or null while it is still too small to be a figure. */
export function boxBetween(a: Point, b: Point): CropBox | null {
  const box: CropBox = [Math.min(a.y, b.y), Math.min(a.x, b.x), Math.max(a.y, b.y), Math.max(a.x, b.x)];
  return box[2] - box[0] < MIN_SIDE || box[3] - box[1] < MIN_SIDE ? null : box;
}

/** A new box for "Add a box": centred, a third of the page each way. */
export const DEFAULT_BOX: CropBox = [333, 333, 667, 667];

/** CSS for showing a box over its page, as percentages. */
export function boxStyle([ymin, xmin, ymax, xmax]: CropBox): React.CSSProperties {
  return {
    top: `${ymin / 10}%`,
    left: `${xmin / 10}%`,
    height: `${(ymax - ymin) / 10}%`,
    width: `${(xmax - xmin) / 10}%`,
  };
}

/**
 * CSS that shows only the box's area of its page image: the frame takes the
 * box's pixel aspect ratio, the image is scaled and shifted inside it. A
 * preview of what the server will cut, without a canvas.
 */
export function previewStyles(
  [ymin, xmin, ymax, xmax]: CropBox,
  page: { width: number; height: number },
): { frame: React.CSSProperties; image: React.CSSProperties } {
  const w = xmax - xmin;
  const h = ymax - ymin;
  return {
    frame: { aspectRatio: `${w * page.width} / ${h * page.height}` },
    image: {
      width: `${(1000 / w) * 100}%`,
      height: `${(1000 / h) * 100}%`,
      left: `${(-xmin / w) * 100}%`,
      top: `${(-ymin / h) * 100}%`,
    },
  };
}
