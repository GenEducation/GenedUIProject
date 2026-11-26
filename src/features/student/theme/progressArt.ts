/**
 * The dashboard's paper-and-ink illustrations (the same style as momentArt.ts):
 * white folded paper, ink-green outlines, one lime accent. Each says what its
 * number is about and stays the same whatever the number is:
 *
 * - current streak:     a paper chain, the newest link lime (don't break the chain)
 * - chapters completed: a paper honeycomb, the finished cells filled in lime
 * - longest streak:     a trophy cup folded from paper, a lime ribbon round it
 * - time spent:         a tear-off pad of days, the top sheet lifting away
 * - no chapters yet:    an arched garden gate swung open, stepping stones through
 *
 * Every scene comes as two layers in the same frame: `base` (the white paper)
 * and `accent` (only its lime parts, already hidden where paper sits in front).
 * Stacked they make the whole picture, and the page can animate the accent on
 * its own. Blender renders (scripts/render-student-moments.py), 512px (stats),
 * 900x600 (empty state) and 1200x600 (Continue card) transparent WebP, in
 * public/student/dashboard.
 */
const BASE = "/student/dashboard";

export interface LayeredArt {
  base: string;
  accent: string;
}

const layered = (name: string): LayeredArt => ({
  base: `${BASE}/${name}-base.webp`,
  accent: `${BASE}/${name}-accent.webp`,
});

export const STREAK_ART = layered("streak");
export const CHAPTERS_ART = layered("chapters");
export const LONGEST_ART = layered("longest");
export const TIME_ART = layered("time");
export const EMPTY_RECENT_ART = layered("empty-recent");
