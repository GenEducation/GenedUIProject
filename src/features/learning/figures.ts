import type { FigureGroup, TeacherPayload } from "./types";

/** Every figure group the current payload knows: the node's, then each check's. */
export function figureGroupsOf(payload: TeacherPayload | null): Map<string, FigureGroup> {
  const groups = new Map<string, FigureGroup>();
  if (!payload) return groups;
  for (const group of payload.node.figure_groups) groups.set(group.id, group);
  for (const check of payload.node.check_items) for (const group of check.figure_groups) groups.set(group.id, group);
  return groups;
}

/** A group's learner-facing description. Never `tutor_description`: that is the tutor's, not the learner's. */
export const altTextOf = (group: FigureGroup | undefined): string =>
  group?.figures.map((f) => f.learner_alt_text).join(" ") ?? "";

/**
 * Pictures fetched and decoded ahead of time, by URL (FIGURES_IN_TEACHING_v1 §9.2: "preload the node's teaching and
 * pending-check crops when the payload loads"). A decoded picture paints at once when the board places it, so its ink-in
 * and the tutor's words about it start together. A failed load is forgotten, so the same URL can be tried again.
 */
const decoded = new Map<string, Promise<void>>();

/** Fetch and decode one picture; resolves once it can be painted, rejects when it cannot load (an expired URL, a 403). */
export function preloadPicture(src: string): Promise<void> {
  let loading = decoded.get(src);
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      // `load` is the readiness signal; `decode()` only moves the decode off the paint, and a decode refusal (a huge
      // picture) still leaves a picture the browser can draw.
      img.onload = () => void Promise.resolve(img.decode?.()).catch(() => undefined).then(() => resolve());
      img.onerror = () => reject(new Error("The picture could not load."));
      img.src = src;
    });
    decoded.set(src, loading);
    loading.catch(() => {
      if (decoded.get(src) === loading) decoded.delete(src);
    });
  }
  return loading;
}

/** Drop every remembered picture (a new lesson, or a test). */
export function forgetPictures(): void {
  decoded.clear();
}
