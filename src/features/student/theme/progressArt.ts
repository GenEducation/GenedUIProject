/**
 * The dashboard's paper-and-ink illustrations (the same style as momentArt.ts): folded paper with ink-green
 * outlines, each in one of the logo's colours with the lime as its accent. Each says what its number is about and
 * stays the same whatever the number is:
 *
 * - current streak:     a paper chain in the logo's deep green, the newest link lime (don't break the chain)
 * - chapters completed: a honeycomb in the logo's gold, the finished cells filled in lime
 * - longest streak:     a gold trophy cup, a lime ribbon round it (the student-hub cards)
 * - time spent:         a tear-off pad of days in the logo's dark green, the top sheet lifting away in lime
 * - no chapters yet:    an arched garden gate swung open, stepping stones through
 *
 * Every scene comes as two layers in the same frame: `base` (the paper) and `accent` (only its lime parts, already
 * hidden where paper sits in front). Stacked they make the whole picture, and the page can animate the accent on its
 * own. Blender renders (scripts/render-student-moments.py), 512px (stats) and 900x600 (empty state) transparent
 * WebP, in public/student/dashboard.
 */
const BASE = "/student/dashboard";
/** Bumped on every re-render: the files keep their names, so this is what makes browsers fetch the new ones. */
const V = "?v=logo1";

export interface LayeredArt {
  base: string;
  accent: string;
}

const layered = (name: string): LayeredArt => ({
  base: `${BASE}/${name}-base.webp${V}`,
  accent: `${BASE}/${name}-accent.webp${V}`,
});

export const STREAK_ART = layered("streak");
export const CHAPTERS_ART = layered("chapters");
export const LONGEST_ART = layered("longest");
export const TIME_ART = layered("time");
export const EMPTY_RECENT_ART = layered("empty-recent");

/**
 * The dashboard's progress as one small expedition (scripts/render-student-moments.py, CAMP_MOVES), each a diorama on
 * the subject cards' grass base and the same whatever the number:
 *
 * - day streak:        a campfire kept burning, a paper smoke wisp curling up. Hover: the flames leap twice and settle, the smoke curls round as it climbs.
 * - chapters finished: a summit climbed, a lime flag on its cairn. Hover: the flag unfurls and waves.
 * - time learning:     an hourglass at camp. Hover: it lifts, turns over once and sets down.
 *
 * `still` is the first frame (the card at rest); `sprite` the whole move, frames in a grid the card steps through on
 * hover, like the subject cards. 264px frames, transparent WebP, in public/student/camp.
 */
const CAMP = "/student/camp";
const CAMP_V = "?v=camp4";

export interface CampArt {
  still: string;
  sprite: { src: string; frames: number; cols: number; fps: number };
}

const camp = (name: string): CampArt => ({
  still: `${CAMP}/${name}-move.webp${CAMP_V}`,
  // every other frame of the 24-frame render, at 264px (1.6x the card's largest art): see scripts/resample-sprite.py
  sprite: { src: `${CAMP}/${name}-move-sprite.webp${CAMP_V}`, frames: 13, cols: 7, fps: 12 },
});

export const CAMP_FIRE_ART = camp("camp-fire");
export const CAMP_SUMMIT_ART = camp("camp-summit");
export const CAMP_HOURGLASS_ART = camp("camp-hourglass");

