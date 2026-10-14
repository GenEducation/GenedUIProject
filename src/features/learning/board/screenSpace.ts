/**
 * The lesson can be drawn turned 90° clockwise (a phone held upright) and scaled down to fit a small screen;
 * LessonScreen records both on <html> (`data-lesson-rotated`, `data-lesson-scale`). Pointer events still arrive in
 * screen pixels, so anything that drags converts them into the lesson's own (layout) pixels here.
 *
 * Turned: layout x runs down the screen and layout y runs from the box's right edge to its left.
 */
export function isScreenRotated(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.lessonRotated === "true";
}

/** Screen pixels per layout pixel (1 unless the lesson is scaled to fit). */
export function screenScale(): number {
  if (typeof document === "undefined") return 1;
  const s = Number(document.documentElement.dataset.lessonScale);
  return Number.isFinite(s) && s > 0 ? s : 1;
}

/** A pointer's position inside `el`, in `el`'s own (layout) pixels, turned or scaled or not. */
export function localPoint(el: Element, clientX: number, clientY: number): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  const s = screenScale();
  return isScreenRotated()
    ? { x: (clientY - r.top) / s, y: (r.right - clientX) / s }
    : { x: (clientX - r.left) / s, y: (clientY - r.top) / s };
}

/** A pointer's position along the lesson's own x axis, in layout pixels (for dragging a column divider). */
export function layoutX(clientX: number, clientY: number): number {
  return (isScreenRotated() ? clientY : clientX) / screenScale();
}
