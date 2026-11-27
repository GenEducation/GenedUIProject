/**
 * The Continue card's hero: one rendered scene filling the card. A noria on a river (wooden wheel, clay pots, one
 * glazed lime), a bamboo trough, an old wooden bucket. Once per page load a tide rolls in from the right; its
 * current turns the wheel clockwise, the lime pot pours down the bamboo and fills the bucket, and the card's text
 * surfaces as the crest passes it.
 *
 * Made by scripts/render-hero-tide.py (Blender) and scripts/encode-hero-tide.py, into public/student/hero:
 * (with ink outlines, like the paper renders) a ~4.5s video at two sizes (MP4 + WebM), a still of the last frame (the poster, shown at once), and
 * tide.json, the crest's position across the frame per frame.
 */
const BASE = "/student/hero";
/** Bumped on every re-render: the files keep their names, so this is what makes browsers fetch the new ones. */
const V = "?v=ink1";

export const HERO_TIDE = {
  width: 1440,
  height: 400,
  fps: 30,
  poster: { lg: `${BASE}/tide-1440.webp${V}`, sm: `${BASE}/tide-960.webp${V}` },
  /** The videos' first frames: shown while a video downloads, so the animation then plays on from them. */
  start: { lg: `${BASE}/tide-start-1440.webp${V}`, sm: `${BASE}/tide-start-960.webp${V}` },
  video: {
    lg: { webm: `${BASE}/tide-1440.webm${V}`, mp4: `${BASE}/tide-1440.mp4${V}` },
    sm: { webm: `${BASE}/tide-960.webm${V}`, mp4: `${BASE}/tide-960.mp4${V}` },
  },
  track: `${BASE}/tide.json${V}`,
  /** When the bucket is full (the button's ripple fires then), in seconds. */
  bucketFullAt: 4.4,
  /** How the frame sits in the card (CSS object-position x): keeps the noria in view on narrow cards. */
  focusX: 0.7,
  /** How long the text waits for an already-downloaded video before showing anyway, in ms. */
  waitForVideo: 1200,
} as const;

export interface TideTrack {
  fps: number;
  frames: number;
  /** The crest's x across the frame (0 left .. 1 right) at each frame. */
  crest: number[];
}
