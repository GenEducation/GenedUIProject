import { NOTE_MAX, type VisualSpec } from "../../types/visuals";

/**
 * Marking up a visual for its next version. The redraw API takes reasons and a short note only (no regions or
 * masks), and the pictures are drawn from a spec, not painted, so marks are written into the note as plain
 * instructions: where on the picture, which part of the spec it is when the partner says, and what to do.
 */

/** A box on the picture, as fractions of its width and height (0 to 1, from the top left). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Mark {
  id: string;
  /** `change`: something to do to this part. `crop`: keep only this area (one at most). */
  kind: "change" | "crop";
  box: Box;
  /** A part of the picture named in its spec (a label or an object), when the partner picks one. */
  part: string;
  instruction: string;
}

/** One-tap instructions for a change mark; the partner can edit the text after. */
export const QUICK_ACTIONS = [
  { label: "Remove", text: "remove it" },
  { label: "Change the text", text: "change the text to " },
  { label: "Bigger", text: "make it bigger" },
  { label: "Smaller", text: "make it smaller" },
  { label: "Move", text: "move it to " },
  { label: "Recolour", text: "change its colour to " },
] as const;

/** Each mark's own instruction, so one mark can't use up the whole note. */
export const INSTRUCTION_MAX = 140;

/** A tap rather than a drag drops a pin: a small box around the point. */
export const PIN_SIZE = 0.08;
/** Below this (as a fraction of the picture), a drag counts as a tap. */
export const MIN_DRAG = 0.025;

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** The box between two points, kept inside the picture. */
export function boxFrom(a: { x: number; y: number }, b: { x: number; y: number }): Box {
  const x1 = clamp(Math.min(a.x, b.x));
  const y1 = clamp(Math.min(a.y, b.y));
  const x2 = clamp(Math.max(a.x, b.x));
  const y2 = clamp(Math.max(a.y, b.y));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** A pin's box, centred on the point and kept inside the picture. */
export function pinBox(p: { x: number; y: number }): Box {
  const half = PIN_SIZE / 2;
  const x = Math.min(1 - PIN_SIZE, Math.max(0, p.x - half));
  const y = Math.min(1 - PIN_SIZE, Math.max(0, p.y - half));
  return { x, y, w: PIN_SIZE, h: PIN_SIZE };
}

/** Where a box is, in words a model reads the same way a person does: "top left", "centre", "bottom". */
export function whereOnPicture(box: Box): string {
  if (box.w * box.h >= 0.5) return "most of the picture";
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const v = cy < 1 / 3 ? "top" : cy < 2 / 3 ? "middle" : "bottom";
  const h = cx < 1 / 3 ? "left" : cx < 2 / 3 ? "centre" : "right";
  if (v === "middle" && h === "centre") return "centre";
  if (v === "middle") return `${h} side`;
  if (h === "centre") return v;
  return `${v} ${h}`;
}

/** Edges closer than this to the picture's edge count as kept, so a near-full crop doesn't name every side. */
const EDGE = 0.04;

/** What a crop does, in words: the edges it trims, or the area it keeps when it's a small part of the picture. */
export function cropWords(box: Box): string {
  if (box.w * box.h < 0.5) return `keep only the ${whereOnPicture(box)} area`;
  const sides = [
    box.y > EDGE && "top",
    1 - (box.x + box.w) > EDGE && "right",
    1 - (box.y + box.h) > EDGE && "bottom",
    box.x > EDGE && "left",
  ].filter((s): s is string => !!s);
  if (sides.length === 0) return "keep the whole picture";
  const list = sides.length === 1 ? sides[0] : `${sides.slice(0, -1).join(", ")} and ${sides[sides.length - 1]}`;
  return `trim the ${list} ${sides.length === 1 ? "edge" : "edges"}`;
}

/** The parts of the picture its spec names, for "Which part?": its labels first, then its objects. */
export function specParts(spec: VisualSpec | null): string[] {
  if (!spec) return [];
  const labels = spec.texts.map((t) => `the "${t.text}" ${t.role === "title" ? "title" : t.role === "caption" ? "caption" : "label"}`);
  const objects = spec.objects.map((o) => `the ${o.what}`.replace(/\s+/g, " ").trim());
  return [...new Set([...labels, ...objects])].slice(0, 40);
}

const sentence = (s: string) => {
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
};

/** One mark as a line of the note. */
export function markLine(mark: Mark, n: number): string {
  const where = whereOnPicture(mark.box);
  const part = mark.part ? ` (${mark.part})` : "";
  if (mark.kind === "crop") {
    const said = sentence(mark.instruction);
    // It follows a full stop, so it starts a sentence of its own.
    const extra = said && said.charAt(0).toUpperCase() + said.slice(1);
    const words = cropWords(mark.box);
    const rest = words.startsWith("keep only") ? " and drop the rest" : "";
    return `${n}. Crop${part}: ${words}${rest}.${extra ? ` ${extra}` : ""}`;
  }
  const what = sentence(mark.instruction) || "change this.";
  return `${n}. ${where.charAt(0).toUpperCase()}${where.slice(1)}${part}: ${what}`;
}

/** The marks as the opening of the note, or "" with none. Crop first: it frames everything else. */
export function marksText(marks: Mark[]): string {
  if (marks.length === 0) return "";
  return ["Changes marked on the picture:", ...orderedMarks(marks).map((m, i) => markLine(m, i + 1))].join("\n");
}

/** The note sent with the redraw: the marks, then the partner's own note. Null when both are empty. */
export function composeNote(marks: Mark[], note: string): string | null {
  const parts = [marksText(marks), note.trim()].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

/** How far over the note's limit the composed note is (0 when it fits). */
export function overLimit(marks: Mark[], note: string): number {
  return Math.max(0, (composeNote(marks, note)?.length ?? 0) - NOTE_MAX);
}

/** Marks in display order, numbered as they will be in the note. */
export function orderedMarks(marks: Mark[]): Mark[] {
  return [...marks.filter((m) => m.kind === "crop"), ...marks.filter((m) => m.kind === "change")];
}
