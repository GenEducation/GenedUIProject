/**
 * Fixed 3D models for the dashboard's progress cards and the empty Recent
 * chapters state. Each one says what its number is about and stays the same
 * whatever the number is:
 *
 * - current streak:     dominoes toppling one after another (keep the run going)
 * - chapters completed: a stack of books wearing a graduation cap
 * - longest streak:     a winners' podium with a medal on the top step
 * - time spent:         a sand clock, sand pouring onto a pile
 * - no chapters yet:    a desk ready to start, notebook open and lamp on
 *
 * Blender renders, 512px (cards) and 900x600 (empty state) transparent WebP,
 * in public/student/progress.
 */
const BASE = "/student/progress";

export const STREAK_ART = `${BASE}/streak.webp`;
export const CHAPTERS_ART = `${BASE}/chapters.webp`;
export const LONGEST_ART = `${BASE}/longest.webp`;
export const TIME_ART = `${BASE}/time.webp`;
export const EMPTY_RECENT_ART = `${BASE}/empty.webp`;

/**
 * The Continue card's scene (1200x600): a paper plane folded from an open spiral
 * notebook takes off along a looping dashed trail, pencils and clouds around it.
 */
export const CONTINUE_ART = "/student/continue/flight.webp";
