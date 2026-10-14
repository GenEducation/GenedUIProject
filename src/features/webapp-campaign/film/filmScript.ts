// The parent-campaign film: scene order, copy and pacing in one place.
// One story, end to end: the child types a question, then asks out loud; the
// tutor answers on the whiteboard; the parent sees it the same evening.
// `seconds` is each scene's length; the film loops on its own.

export type SceneId = "open" | "ask" | "speak" | "cardSee" | "parentHome" | "cardKnow" | "report" | "close";

export interface FilmScene {
  id: SceneId;
  /** Small caption above the mock screen. Empty for full-bleed title scenes. */
  eyebrow: string;
  title: string;
  seconds: number;
}

export const FILM_SCENES: FilmScene[] = [
  { id: "open", eyebrow: "", title: "Your child's own AI tutor.", seconds: 2.8 },
  { id: "ask", eyebrow: "Ask anything", title: "Any question, in their own words.", seconds: 6.5 },
  { id: "speak", eyebrow: "Or simply say it", title: "It explains out loud — and draws it on the board.", seconds: 6.5 },
  // Ad beats: the product pauses for a line before each parent feature.
  { id: "cardSee", eyebrow: "", title: "While they learn, you see every step.", seconds: 2.2 },
  { id: "parentHome", eyebrow: "Parent home", title: "Every session and subject, at a glance.", seconds: 5.5 },
  { id: "cardKnow", eyebrow: "", title: "Not just marks. What's working — and why.", seconds: 2.2 },
  { id: "report", eyebrow: "Report card", title: "A report card that actually explains.", seconds: 5.5 },
  { id: "close", eyebrow: "", title: "Their journey. Your front-row seat.", seconds: 3.8 },
];

export const FILM_SECONDS = FILM_SCENES.reduce((sum, s) => sum + s.seconds, 0);

export interface SceneWindow {
  start: number;
  end: number;
}

/** Each scene's [start, end] slice of the 0..1 timeline. */
export const SCENE_WINDOWS: SceneWindow[] = (() => {
  let at = 0;
  return FILM_SCENES.map((s) => {
    const start = at / FILM_SECONDS;
    at += s.seconds;
    return { start, end: at / FILM_SECONDS };
  });
})();

/** The (fictional) family the film follows. */
export const CHILD = { name: "Aarav", fullName: "Aarav Sharma", grade: "Grade 8", board: "CBSE" };
export const PARENT = { name: "Priya" };
export const TUTOR = { name: "Nia" };
export const CHAPTER = { subject: "Mathematics", title: "Comparing Quantities", number: 8 };
