/**
 * The Continue card's subject heroes: for English, Mathematics and Science the card is a grand, full-width version
 * of that subject's card diorama, built around continuing: a journey that plays through to its end as it comes in.
 *
 * - English: a voyage by lighthouse light, at dusk. The lamp of the lighthouse of books lights; the paper boat sets
 *   out from the jetty on its island and sails off into open water, a lime wake behind it, the lighthouse's yellow
 *   beam tracking it. No destination: the voyage stays open.
 * - Mathematics: building the bridge. A parabolic arch plotted on a graph-paper pond; its face is a row of panels,
 *   each with a maths sign, set in and lit lime one by one (the next one gold, lowering in) until it is built.
 * - Science: a planet tour. Evening falls over the observatory on its hilltop (its door and windows lit, a shooting
 *   star crossing) and the stars come out; beyond a small sun, five planets sit across the sky as tiny points
 *   (nothing joins them, so the tour's path stays a surprise). The telescope (out through the dome's slit) visits
 *   each in turn, and the planet in its sight grows where it is, magnified in a lime focus ring to show its features
 *   (rocky, cloudy green, icy, a banded gold giant), ending on the ringed planet with its moon.
 *
 * Two layers:
 * - the scene: an entrance video (desktop), its last frame as the poster, a phone poster framed for the strip above
 *   the text, and the reveal track (where the front is across the card per frame: the text surfaces as it passes);
 * - the journey: the moving part alone, rendered at `states` steps (start to finish) in a sprite grid, cropped to
 *   where it ever appears. The card places the crop over the scene and steps it through to the end.
 *
 * Made by scripts/render-hero-subject.py (Blender), scripts/encode-hero-tide.py and scripts/build-hero-subject.py,
 * into public/student/hero/<subject>/. Other subjects keep the tide (heroTide.ts).
 */

/** Bumped on every re-render: the files keep their names, so this is what makes browsers fetch the new ones. */
const V = "?v=hs10";

export interface ProgressSprite {
  src: string;
  /** The frame the crop was cut from (the scene's own frame for this layout), px. */
  frame: [number, number];
  /** Where the crop sits in that frame: x, y, width, height, px. */
  crop: [number, number, number, number];
}

export interface HeroScene {
  key: "english" | "mathematics" | "science";
  width: number;
  height: number;
  fps: number;
  poster: { lg: string; sm: string };
  /** The video's first frame: shown while the video downloads, so the animation then plays on from it. */
  start: string;
  video: { webm: string; mp4: string };
  track: string;
  /** How the desktop frame sits in the card (CSS object-position x): keeps the landmark in view on narrow cards. */
  focusX: number;
  /** The phone frame: its own framing, shown as the strip above the text. */
  phone: { width: number; height: number; focusX: number };
  progress: { states: number; cols: number; rows: number; lg: ProgressSprite; sm: ProgressSprite };
  /** When, in seconds into the entrance, the journey starts. */
  progressAt: number;
  /** How long the text waits for the video before showing over the still anyway, in ms. */
  waitForVideo: number;
}

type Crop = Omit<ProgressSprite, "src">;
type Meta = { states: number; cols: number; rows: number; lg: Crop; sm: Crop };

function scene(key: HeroScene["key"], folder: string, meta: Meta, progressAt: number): HeroScene {
  const base = `/student/hero/${folder}`;
  return {
    key,
    width: 1440,
    height: 400,
    fps: 30,
    poster: { lg: `${base}/scene-1440.webp${V}`, sm: `${base}/phone.webp${V}` },
    start: `${base}/start-1440.webp${V}`,
    video: { webm: `${base}/scene-1440.webm${V}`, mp4: `${base}/scene-1440.mp4${V}` },
    track: `${base}/scene.json${V}`,
    focusX: 0.7,
    phone: { width: 960, height: 480, focusX: 0.5 },
    progress: {
      states: meta.states,
      cols: meta.cols,
      rows: meta.rows,
      lg: { src: `${base}/progress.webp${V}`, ...meta.lg },
      sm: { src: `${base}/progress-phone.webp${V}`, ...meta.sm },
    },
    progressAt,
    waitForVideo: 1200,
  };
}

// progress.json from scripts/build-hero-subject.py, per subject
const SCENES: Readonly<Record<string, HeroScene>> = {
  English: scene("english", "english", { states: 20, cols: 5, rows: 4, lg: { frame: [1440, 400], crop: [589, 68, 572, 332] }, sm: { frame: [960, 480], crop: [75, 102, 594, 347] } }, 1.5),
  Mathematics: scene("mathematics", "maths", { states: 20, cols: 5, rows: 4, lg: { frame: [1440, 400], crop: [540, 50, 882, 253] }, sm: { frame: [960, 480], crop: [23, 84, 919, 263] } }, 1.3),
  Science: scene(
    "science",
    "science",
    {
      states: 20, cols: 5, rows: 4,
      lg: { frame: [1440, 400], crop: [586, 6, 543, 201] },
      sm: { frame: [960, 480], crop: [71, 38, 565, 209] },
    },
    1.6,
  ),
};

/** The subject's hero scene, or null for subjects that keep the tide. */
export function heroScene(subject: string | undefined): HeroScene | null {
  return (subject && SCENES[subject]) || null;
}
