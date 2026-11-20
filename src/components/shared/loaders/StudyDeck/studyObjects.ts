/**
 * The Study Deck loader's cast: soft-clay study objects rendered in Blender
 * (source: scripts/render-study-deck.py → public/loaders/study/*.webp).
 * Order is the cycle order; the loader starts at a random one.
 */
export interface StudyObject {
  id: string;
  /** One word shown under the object while it's on stage. */
  word: string;
  src: string;
}

const obj = (id: string, word: string): StudyObject => ({ id, word, src: `/loaders/study/${id}.webp` });

export const STUDY_OBJECTS: readonly StudyObject[] = [
  obj("book", "reading"),
  obj("pencil", "writing"),
  obj("ruler", "measuring"),
  obj("atom", "exploring"),
  obj("globe", "travelling"),
  obj("flask", "experimenting"),
  obj("bulb", "imagining"),
  obj("abacus", "counting"),
];

/** Shown once loading completes. */
export const COMPLETION_OBJECT: StudyObject = obj("cap", "all set!");

let preloaded = false;

/**
 * Warms the browser cache (and decodes) every render, so the loader's first
 * frame — which appears right after the sign-in reply — never waits on the
 * network. Safe to call repeatedly; only the first call does anything.
 */
export function preloadStudyDeck(): void {
  if (preloaded || typeof window === "undefined" || typeof Image === "undefined") return;
  preloaded = true;
  for (const { src } of [...STUDY_OBJECTS, COMPLETION_OBJECT]) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img.decode?.().catch(() => {});
  }
}
