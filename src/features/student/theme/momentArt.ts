/**
 * Paper-and-ink illustrations for the Student portal's moments and empty
 * states: white folded planes, ink-green outlines, one lime accent each. Each
 * one is a single idea:
 *
 * - chapter complete:     the last jigsaw piece, about to click into place
 * - revisit:              a winding path, a pin where you left off
 * - placement intro:      rising stepping posts, a marble waiting at the start
 * - placement complete:   the marble come to rest on its own step
 * - test result:          the moon. Full (above), half (at), a waxing crescent
 *                         (below: on its way to full)
 * - welcome aboard:       a paper kite lifting off
 * - test ready:           a diving board over a pool
 * - no chapters yet:      an empty platform, tracks leading away
 * - empty report card:    a chart's first bar just starting to rise
 * - no notifications:     a paper plane parked on the runway
 * - not found:            a door standing alone, open onto nothing
 * - error:                a house of cards, one card slipped out
 *
 * Blender renders (scripts/render-student-moments.py), transparent WebP with no
 * baked shadow, in public/student/moments.
 */
const BASE = "/student/moments";

export interface MomentArtSrc {
  src: string;
  width: number;
  height: number;
}

const art = (name: string, width: number, height: number): MomentArtSrc => ({
  src: `${BASE}/${name}.webp`,
  width,
  height,
});

export const CHAPTER_COMPLETE_ART = art("chapter-complete", 640, 640);
export const REVISIT_ART = art("revisit", 900, 600);
export const PLACEMENT_INTRO_ART = art("placement-intro", 640, 640);
export const PLACEMENT_COMPLETE_ART = art("placement-complete", 640, 640);
export const WELCOME_ABOARD_ART = art("welcome-aboard", 640, 640);
export const TEST_READY_ART = art("test-ready", 512, 512);
export const EMPTY_CHAPTERS_ART = art("empty-chapters", 840, 560);
export const EMPTY_REPORT_ART = art("empty-report", 640, 640);
export const EMPTY_NOTIFICATIONS_ART = art("empty-notifications", 512, 512);
export const NOT_FOUND_ART = art("not-found", 840, 560);
export const ERROR_ART = art("error", 840, 560);

export const RESULT_ART = {
  above: art("result-above", 512, 512),
  at: art("result-at", 512, 512),
  below: art("result-below", 512, 512),
} as const;
