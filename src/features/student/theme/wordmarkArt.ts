/**
 * The chapter page's subject headers: the subject's name as a paper word-mark (cut-card letters in the logo's colours
 * on a plinth, a small scene living on them), rendered in Blender by scripts/render-subject-wordmark.py and assembled
 * by scripts/build-subject-wordmark.py into public/student/wordmarks.
 *
 * - Science: a ringed lime planet dots the "i"; a telescope on a tripod on the "n" aims at the brightest star.
 * - English: a drop of ink dots the "i"; the "g" hooks its tail over the plinth's edge; a pencil, books, birds.
 * - Mathematics: graph paper; a gold plus dots the "i"; a protractor, a ruler; pi, times, equals, divide afloat.
 *
 * Two sprites each: the entrance (the letters fold up one after another, then the props pop in; its last frame is the
 * word-mark at rest) and the hover loop (a wave along the letters, the sky bobbing). All three share one camera and
 * baseline, so the letters are one size everywhere: the frames are `height` px tall in every subject and only their
 * width differs. Frames are drawn at SCALE x their display size. Other subjects get a plain title.
 */

/** Bumped on every re-render: the files keep their names, so this is what makes browsers fetch the new ones. */
const V = "?v=wm2";
const BASE = "/student/wordmarks";

/** The sprites are drawn at this many device pixels per CSS pixel of the header (sharp on 1.5x screens). */
export const WORDMARK_SCALE = 1.5;
/** Frames per second the sprites play at: every other frame of the 30fps render ships (half the download and memory). */
export const WORDMARK_FPS = 15;

export interface WordmarkSprite {
  src: string;
  frames: number;
  cols: number;
  rows: number;
}

export interface WordmarkArt {
  /** One frame's size, px (at WORDMARK_SCALE). */
  width: number;
  height: number;
  enter: WordmarkSprite;
  hover: WordmarkSprite;
}

type Meta = { width: number; height: number; enter: Omit<WordmarkSprite, "src">; hover: Omit<WordmarkSprite, "src"> };

const art = (key: string, m: Meta): WordmarkArt => ({
  width: m.width,
  height: m.height,
  enter: { src: `${BASE}/${key}-enter.webp${V}`, ...m.enter },
  hover: { src: `${BASE}/${key}-hover.webp${V}`, ...m.hover },
});

// sizes printed by scripts/build-subject-wordmark.py
const ART: Readonly<Record<string, WordmarkArt>> = {
  Science: art("science", { width: 769, height: 300, enter: { frames: 16, cols: 6, rows: 3 }, hover: { frames: 12, cols: 6, rows: 2 } }),
  English: art("english", { width: 800, height: 300, enter: { frames: 16, cols: 6, rows: 3 }, hover: { frames: 12, cols: 6, rows: 2 } }),
  Mathematics: art("maths", { width: 1147, height: 300, enter: { frames: 20, cols: 6, rows: 4 }, hover: { frames: 12, cols: 6, rows: 2 } }),
};

/** The subject's word-mark, or null for subjects that get a plain title. */
export function wordmarkArt(subject: string): WordmarkArt | null {
  return ART[subject] ?? null;
}
