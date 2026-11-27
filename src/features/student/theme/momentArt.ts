/**
 * Paper-and-ink illustrations for the Student portal's moments and empty
 * states: stone-sage folded planes, ink-green outlines, one lime accent each. Each
 * one is a single idea:
 *
 * - chapter complete:     the last jigsaw piece drops and clicks into place (rendered move)
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
 * The pop-ups below are layered: a base plus the part that moves, so each plays one small move (under a second)
 * as it opens. MomentArt stacks the layers; the moves are the .moment-layer--* rules in globals.css.
 *
 * - school request sent:  a rendered move (a sprite): the mailbox door swings open, a letter slides in, the
 *                         door shuts and the lime flag swings up
 * - parent connected:     (rendered move) a plug slides into a power strip, its lime switch clicks on
 * - link failed:          (rendered move) the lime plug lunges at the socket and falls back out
 * - device paired:        (rendered move) a plug pushes home in its socket, a lime glow pops at the join
 * - no device yet:        (rendered move) the socket waiting, its plug in front, its lime light blinks
 * - first profile step:   a blank luggage tag swings on its string
 * - invite your parent:   a lime card slides up out of an open envelope
 * - time's up:            a candle burned low, its lime flame flickers
 * - unanswered questions: envelopes, their lime seals stamp down, two still open
 * - no subjects yet:      a signpost, its lime arm swings round to point ahead
 *
 * Blender renders (scripts/render-student-moments.py), transparent WebP with no
 * baked shadow, in public/student/moments.
 */
const BASE = "/student/moments";
/** Bumped on every re-render: the files keep their names, so this is what makes browsers fetch the new ones. */
const V = "?v=sage1";

export interface MomentArtSrc {
  src: string;
  width: number;
  height: number;
  /** Layered art: the parts drawn over `src` (bottom to top), each with its own one-off move. */
  layers?: MomentLayer[];
  /** Rendered motion: the frames side by side in one image, stepped through once. `src` is the last frame. */
  sprite?: { src: string; frames: number; fps: number };
}

export interface MomentLayer {
  /** The CSS hook: `.moment-layer--<key>` in globals.css. */
  key: string;
  src: string;
  /** The point it turns or scales about, as a CSS transform-origin (from the render's pivot empties). */
  origin?: string;
}

const art = (name: string, width: number, height: number): MomentArtSrc => ({
  src: `${BASE}/${name}.webp${V}`,
  width,
  height,
});

/** A rendered move: `<name>-sprite.webp` holds its frames side by side, `<name>.webp` is the last frame. */
const animated = (name: string, size: number | [number, number], frames: number, fps = 24): MomentArtSrc => ({
  ...art(name, ...(typeof size === "number" ? ([size, size] as const) : size)),
  sprite: { src: `${BASE}/${name}-sprite.webp${V}`, frames, fps },
});

export const CHAPTER_COMPLETE_ART = animated("chapter-complete", 320, 22);
/** Streak up: a paper chain, its newest lime link swings in and snaps on. */
export const STREAK_UP_ART = animated("streak-up", 360, 18);
/** New longest streak: the paper trophy, its lime ribbon drops on and ties tight, and it hops. */
export const STREAK_RECORD_ART = animated("streak-record", 360, 24);
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
/** A layered render: `<name>-base.webp` plus `<name>-<layer>.webp` for each layer, bottom to top. */
const layered = (name: string, width: number, height: number, layers: [string, string?][]): MomentArtSrc => ({
  src: `${BASE}/${name}-base.webp${V}`,
  width,
  height,
  layers: layers.map(([layer, origin]) => ({ key: `${name}-${layer}`, src: `${BASE}/${name}-${layer}.webp${V}`, origin })),
});

// Origins are the pivots the render script marks (pt_* empties), as % of the frame.
export const SCHOOL_SENT_ART = animated("school-sent", 360, 26);
export const GUARDIAN_LINKED_ART = animated("guardian-linked", [420, 336], 22);
export const LINK_FAILED_ART = animated("link-failed", [420, 336], 22);
export const DEVICE_PAIRED_ART = animated("device-paired", 360, 22);
export const DEVICE_EMPTY_ART = animated("device-empty", 360, 20);
export const PROFILE_START_ART = layered("profile-start", 512, 512, [["tag", "68.5% 34.1%"]]);
export const INVITE_PARENT_ART = layered("invite-parent", 512, 512, [["card"], ["pocket"]]);
export const TIMES_UP_ART = layered("times-up", 512, 512, [["accent", "48% 40.7%"]]);
export const UNANSWERED_ART = layered("unanswered", 640, 512, [["accent"]]);
export const NO_SUBJECTS_ART = layered("no-subjects", 512, 512, [["accent", "47.9% 19.1%"]]);

export const RESULT_ART = {
  above: art("result-above", 512, 512),
  at: art("result-at", 512, 512),
  below: art("result-below", 512, 512),
} as const;
