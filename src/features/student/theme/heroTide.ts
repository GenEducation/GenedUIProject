/**
 * The Continue card's hero: one rendered scene filling the card. A noria on a river (wooden wheel, clay pots, one
 * glazed lime), a bamboo trough, an old wooden bucket. Once per page load a tide rolls in from the right; its
 * current turns the wheel clockwise, the lime pot pours down the bamboo and fills the bucket, and the card's text
 * surfaces as the crest passes it.
 *
 * Made by scripts/render-hero-tide.py (Blender) and scripts/encode-hero-tide.py, into public/student/hero:
 * a ~4.5s video at two sizes (MP4 + WebM), a still of the last frame (the poster, shown at once), and
 * tide.json, the crest's position across the frame per frame.
 */
const BASE = "/student/hero";

export const HERO_TIDE = {
  width: 1440,
  height: 400,
  fps: 30,
  poster: { lg: `${BASE}/tide-1440.webp`, sm: `${BASE}/tide-960.webp` },
  video: {
    lg: { webm: `${BASE}/tide-1440.webm`, mp4: `${BASE}/tide-1440.mp4` },
    sm: { webm: `${BASE}/tide-960.webm`, mp4: `${BASE}/tide-960.mp4` },
  },
  track: `${BASE}/tide.json`,
  /** When the bucket is full (the button's ripple fires then), in seconds. */
  bucketFullAt: 4.4,
  /** How the frame sits in the card (CSS object-position x): keeps the noria in view on narrow cards. */
  focusX: 0.7,
  /** How long the text waits for the video before showing over the still anyway, in ms. */
  waitForVideo: 1200,
} as const;

export interface TideTrack {
  fps: number;
  frames: number;
  /** The crest's x across the frame (0 left .. 1 right) at each frame. */
  crest: number[];
}
