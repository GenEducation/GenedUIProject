/**
 * The desk pet's emotion roster: what each feeling looks like and how it moves.
 *
 * An emotion is a recipe of layers, and only the first is blobatar's:
 *
 *  1. **face** — a blobatar `Expression`. Blobatar poses are eyes plus a rigid
 *     body offset and nothing else, so two emotions often share a face and are
 *     told apart by the layers below.
 *  2. **move** — a one-shot locomotion move played when the emotion starts
 *     (see `utils/petLocomotion.ts`). `inPlace` is what it degrades to when
 *     travelling across the screen would be a distraction.
 *  3. **loop** — a CSS keyframe held on the body while the emotion lasts
 *     (`globals.css`, `pet-loop-*`). Blobatar's own idle motion keeps running
 *     underneath it.
 *  4. **overlay** — a small badge beside the creature, for states (muted,
 *     listening…). The positive reactions use the next two instead.
 *  5. **accent** — a mark on the face itself (blush, star glints, a "?"),
 *     drawn by `PetFaceAccents`, since blobatar is pose-only and draws none.
 *  6. **particles** — thrown once as the emotion starts (sparks, a heart…).
 *  7. **tint** — on some poses, a brief colour flush through blobatar's own
 *     `tint`, fading with the expression.
 *
 * The custom poses below follow blobatar's own rule for its roster: a pose
 * must differ from its nearest neighbour on several channels at once, or it
 * reads as the same face. They are plain object literals over the library's
 * shared functions — the pattern `blobatar/expression` itself uses, so a pose
 * nobody imports tree-shakes away. Tuned by rendering on real seeds (round
 * green and the coral cloud), not by reading the numbers.
 */

import {
  idle,
  smug,
  unsure,
  thinking,
  surprised,
  love,
  poseVars,
  bakePose,
  tintWith,
} from "blobatar/expression";
import type { Expression } from "blobatar";

type Pose = Expression["p"];

/** Every channel at its identity; custom poses spread over this. */
const IDENT: Pose = {
  esx: 1, esy: 1, tilt: 0, edy: 0, edx: 0,
  esx2: 0, esy2: 0, tilt2: 0, edy2: 0,
  lock: 0, heat: 0, shake: 0, rock: 0, bdy: 0,
};

/*
 * Reaction tints: a change of *shade*, never of colour.
 *
 * The pet's colour is the student's — a coral pet stays coral while it cheers.
 * So each reaction tint aims at the pet's *own* hue and only moves how light
 * and how vivid it is: Cheer brightens it, Supportive softens it lighter,
 * Impressed deepens it. (Fixed-hue targets turned a coral pet lime, which the
 * student rightly did not recognise as theirs; Celebration used to turn every
 * pet gold.) Staying on one hue also means the mix never passes through grey,
 * which is what made partial cross-hue tints go muddy.
 *
 * Built per creature from its resolved `head` colour, through blobatar's own
 * `tintWith`, so the eyes keep their contrast guarantee. Fades in and out with
 * the expression via blobatar's `transition: fill`.
 */

/** A `#rrggbb` colour as OKLCH — the space blobatar resolves its palette in. */
function oklchOf(hex: string): { l: number; c: number; h: number } {
  const n = parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const u = v / 255;
    return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
  });
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    c: Math.hypot(a, bb),
    h: (Math.atan2(bb, a) * 180) / Math.PI,
  };
}

/**
 * A tint that keeps the pet's own hue and shifts only its lightness (`dl`)
 * and vividness (`dc`, which can only add — blobatar never desaturates a
 * tinted body).
 *
 * The vividness boost is capped relative to how vivid the pet already is
 * (at most +25% of its own chroma): a flat `+dc` turned a muted, greyish teal
 * into a loud cyan, which is a different pet, not a brighter one.
 *
 * Darkening fades out on bodies that are already mid-tone or darker: there
 * is no room below them, and pushing a mid coral deeper tripped blobatar's
 * contrast guard, which flips the eyes from dark to white mid-reaction.
 */
export function ownShade(dl: number, dc: number): NonNullable<Expression["tint"]> {
  return (pal, p) => {
    if (!pal.head) return pal;
    const own = oklchOf(pal.head);
    const room = dl < 0 ? Math.min(1, Math.max(0, (own.l - 0.62) / 0.2)) : 1;
    const l = Math.min(0.92, Math.max(0.35, own.l + dl * room));
    return tintWith(pal, p, { h: own.h, l, pull: 1, c: own.c + Math.min(dc, own.c * 0.25) });
  };
}

/** Cheer: its own colour, brighter and more vivid — lit up. */
const BRIGHTER = ownShade(0.05, 0.035);
/** Supportive: its own colour, softened lighter — gentle. */
const SOFTER = ownShade(0.08, 0);
/** Impressed: its own colour, deeper and richer — rapt. */
const DEEPER = ownShade(-0.05, 0.03);
/** Celebration: its own colour at its brightest and most vivid — glowing. */
const GLOWING = ownShade(0.1, 0.05);

/** Eyes enlarged and lifted, the pair tilted *in parallel*: a head cocked to listen. */
export const listeningPose: Expression = {
  p: { ...IDENT, esx: 1.08, esy: 1.16, tilt: 7, tilt2: -14, edy: -0.9, edx: 0.2, lock: 1, bdy: -0.8 },
  vars: poseVars,
  bake: bakePose,
};

/** A friendly half-squint; the talking is carried by the body loop, not the face. */
export const speakingPose: Expression = {
  p: { ...IDENT, esx: 1.3, esy: 0.55, tilt: 4, edy: -0.8, edx: 0.6, esx2: 0.04, lock: 1, bdy: -1 },
  vars: poseVars,
  bake: bakePose,
};

/**
 * Small, calm, level eyes drawn together. Deliberately *open* — a muted
 * student is not a sleeping pet.
 */
export const mutedPose: Expression = {
  p: { ...IDENT, esx: 0.82, esy: 0.72, edy: 0.3, edx: -0.5, lock: 1, bdy: 0.3 },
  vars: poseVars,
  bake: bakePose,
};

/** Blobatar's `happy` pushed further and lifted higher — a "yes!" rather than contentment. */
export const cheerPose: Expression = {
  p: { ...IDENT, esx: 1.78, esy: 0.28, tilt: 9, tilt2: -16, edy: -1.8, edx: 1.5, esx2: 0.08, lock: 1, heat: 1, bdy: -2.8 },
  vars: poseVars,
  bake: bakePose,
  tint: BRIGHTER,
};

/**
 * Lifted, inner edges raised: hopeful, "you've got this". Encouraging's face,
 * and also the face a pet wears while running.
 */
export const encouragingPose: Expression = {
  p: { ...IDENT, esx: 1.15, esy: 0.78, tilt: -10, edy: -1.2, edx: 0.1, lock: 1, bdy: -1.4 },
  vars: poseVars,
  bake: bakePose,
};

/**
 * Big round eyes with a tremor. No tint: a warm tint over the brand greens
 * mixes to mud at any partial heat, and the jitter-bounce carries the energy.
 */
export const excitedPose: Expression = {
  p: { ...IDENT, esx: 1.3, esy: 1.28, tilt: -6, edy: -1.3, edx: 0.45, lock: 1, shake: 0.2, bdy: -2 },
  vars: poseVars,
  bake: bakePose,
};

/**
 * "Hmm, let's look again": the pair cocked in parallel (`tilt2 = −2 × tilt`,
 * blobatar's head-tilt trick) the *other* way from `listeningPose`, dropped
 * toward the page rather than lifted, and one eye a touch wider than the
 * other: genuine interest in what the child thinks.
 */
export const curiousPose: Expression = {
  p: { ...IDENT, esx: 1.1, esy: 0.95, tilt: -9, tilt2: 18, edy: 1.2, edx: 0.9, esx2: 0.05, esy2: 0.18, lock: 1, bdy: 0.4 },
  vars: poseVars,
  bake: bakePose,
};

/**
 * "That's okay": wide, soft, flat bars sitting low, tilted *symmetrically* —
 * on a landscape bar that is the sympathetic brow, not a frown. A level
 * version rendered as plain small eyes, indistinguishable from `proud` (a
 * *parallel* tilt) and `mutedPose` at desk-pet size.
 */
export const supportivePose: Expression = {
  p: { ...IDENT, esx: 1.5, esy: 0.34, tilt: 14, edy: 1.1, edx: 0.3, esx2: 0.04, lock: 1, heat: 1, bdy: 0.8 },
  vars: poseVars,
  bake: bakePose,
  tint: SOFTER,
};

/**
 * A giggle: blobatar's `wink` squinted into happy arcs, lifted, with a small
 * tremor for the laugh.
 */
export const amusedPose: Expression = {
  p: { ...IDENT, esx: 1.4, esy: 0.5, tilt: 8, tilt2: -16, edy: -1.2, edx: 0.9, esx2: 0.22, esy2: -0.4, lock: 1, shake: 0.1, bdy: -1.8 },
  vars: poseVars,
  bake: bakePose,
};

/**
 * "Ooh, good point!": big eyes gone nearly *square* — wide as well as tall —
 * held level, set wide and lifted high. Growing `esy` alone just made a
 * bigger `excited` / `surprised` (both tall portrait bars); the width is what
 * reads as wide-eyed wonder rather than a jolt.
 */
export const impressedPose: Expression = {
  p: { ...IDENT, esx: 1.75, esy: 0.98, tilt: 0, edy: -1.8, edx: 1.0, lock: 1, heat: 1, bdy: -2.6 },
  vars: poseVars,
  bake: bakePose,
  tint: DEEPER,
};

/**
 * "Say that again?": one eye open, the other squinted — blobatar's
 * asymmetry channels (`esx2`/`esy2`) doing the work, lifted a touch and
 * cocked the opposite way to `unsure`, which Reconnecting wears. The pet not
 * catching the child, never the child being wrong.
 */
export const confusedPose: Expression = {
  p: { ...IDENT, esx: 1.15, esy: 1.1, tilt: -6, tilt2: 14, edy: -0.6, edx: 0.5, esx2: 0.3, esy2: -0.62, lock: 1, bdy: -0.6 },
  vars: poseVars,
  bake: bakePose,
};

/**
 * "No rush, here it is again": relaxed, half-lidded, perfectly level and
 * settled low. Calmer than Supportive's sympathetic tilt, and lower and
 * flatter than Speaking's friendly squint.
 */
export const patientPose: Expression = {
  p: { ...IDENT, esx: 1.2, esy: 0.45, tilt: 0, edy: 0.8, edx: 0.2, esx2: 0.03, lock: 1, bdy: 0.6 },
  vars: poseVars,
  bake: bakePose,
};

/**
 * A bashful "oops": small eyes, lowered, the pair cocked in parallel so the
 * pet glances off to one side, and sunk a little. Deliberately not `shy`
 * (which the hover gesture wears) and never teary.
 */
export const apologeticPose: Expression = {
  p: { ...IDENT, esx: 0.95, esy: 0.6, tilt: -12, tilt2: 24, edy: 1.8, edx: -0.3, esx2: 0.04, lock: 1, bdy: 1.2 },
  vars: poseVars,
  bake: bakePose,
};

/**
 * Widest happy arcs in the roster, the pet glowing in its own colour. The
 * bounce and the confetti carry the size of the moment — not a recolour.
 */
export const celebrationPose: Expression = {
  p: { ...IDENT, esx: 1.9, esy: 0.26, tilt: 10, tilt2: -18, edy: -2, edx: 1.6, esx2: 0.08, lock: 1, heat: 1, bdy: -3 },
  vars: poseVars,
  bake: bakePose,
  tint: GLOWING,
};

// ── Roster ──────────────────────────────────────────────────────────────────

export type PetEmotion =
  // voice presence, detected in the browser
  | "listening"
  | "speaking"
  | "muted"
  | "reconnecting"
  // learning flow, from app state
  | "idle"
  | "thinking"
  | "noticing"
  | "love"
  // reactions, from backend frames or frontend-derived. Positive only: the
  // tutor never reacts negatively, so neither does the pet — a wrong answer
  // is Encouraging ("so close, go on"), never a frown.
  | "cheer"
  | "encouraging"
  | "supportive"
  | "patient"
  | "curious"
  | "confused"
  | "apologetic"
  | "amused"
  | "impressed"
  | "proud"
  | "excited"
  | "celebration";

/**
 * The twelve a backend `pet_emotion` frame may carry (MVP
 * `docs/pet-emotions-v3-frontend-handoff.md`). A frame naming anything else is
 * dropped by `parsePetFrame` — no burst, no guessed face — so a newer backend
 * cannot break this build.
 */
export const BACKEND_EMOTIONS = [
  "cheer", "encouraging", "supportive", "patient", "curious", "confused",
  "apologetic", "amused", "impressed", "proud", "excited", "celebration",
] as const satisfies readonly PetEmotion[];

export type BackendEmotion = (typeof BACKEND_EMOTIONS)[number];

export type PetMove =
  // travelling
  | "walk"
  | "run"
  | "jump"
  | "celebrate"
  | "scoot"
  | "pace"
  | "retreat"
  | "skip"
  // in place, physics
  | "hop"
  | "bounce"
  | "jitterBounce"
  // in place, CSS
  | "wobble"
  | "nod"
  | "puff"
  | "sink"
  | "pop"
  | "lean"
  | "stretch"
  | "recoil"
  | "shrink";

export type PetLoop =
  | "breathe" | "talk" | "lean" | "rock" | "doze" | "tilt" | "beat" | "sway"
  | "ponder" | "soothe" | "giggle";

/**
 * A mark drawn on the creature's own face, by `PetFaceAccents` — the layer
 * blobatar deliberately does not have (it is pose-only: two capsule eyes).
 */
export type PetAccent = "blush" | "glints" | "laugh" | "question" | "dots" | "bashful" | "sheen";

/** Particles thrown into the fx layer when an emotion starts (`usePetLocomotion.burst`). */
export type PetParticle = "spark" | "lift" | "burst" | "heart" | "ha" | "twinkle";

export type PetOverlay =
  | "ear" | "speaker" | "micOff" | "wifiOff" | "dots" | "zzz"
  | "bell" | "heart" | "confetti";

export interface PetEmotionSpec {
  face: Expression;
  /** Played once when the emotion starts. */
  move?: PetMove;
  /** A second move once the first settles (Proud: hop, then puff). */
  then?: PetMove;
  /**
   * What `move` becomes when travelling is suppressed. `null` means drop the
   * move entirely; omitted means `move` already stays in place.
   */
  inPlace?: PetMove | null;
  loop?: PetLoop;
  overlay?: PetOverlay;
  /** A mark on the face itself, held as long as the emotion is. */
  accent?: PetAccent;
  /** Thrown once, as the emotion starts. */
  particles?: { kind: PetParticle; count: number };
  /** Burst length. Absent on sustained emotions, which last while their condition does. */
  holdMs?: number;
}

export const PET_EMOTIONS: Record<PetEmotion, PetEmotionSpec> = {
  listening:    { face: listeningPose, move: "scoot", inPlace: "lean", loop: "lean", overlay: "ear" },
  speaking:     { face: speakingPose, loop: "talk", overlay: "speaker" },
  muted:        { face: mutedPose, move: "sink", loop: "breathe", overlay: "micOff" },
  reconnecting: { face: unsure, move: "wobble", loop: "tilt", overlay: "wifiOff" },

  idle:         { face: idle },
  thinking:     { face: thinking, move: "pace", inPlace: null, loop: "rock", overlay: "dots" },
  noticing:     { face: surprised, move: "pop", then: "retreat", overlay: "bell", holdMs: 1400 },
  love:         { face: love, move: "bounce", loop: "beat", overlay: "heart", holdMs: 2000 },

  // The reactions. Each differs from every other on at least three of: eyes,
  // face mark, tint, motion, particles — `petDistinctness.test.ts` holds that.
  // No overlay badges: the marks and particles carry what the icons used to.
  cheer:        { face: cheerPose, move: "hop", then: "stretch", accent: "blush", particles: { kind: "spark", count: 4 }, holdMs: 1600 },
  // The wrong-answer moment: "so close, go on" — one springy skip sideways,
  // smaller than Cheer on purpose.
  encouraging:  { face: encouragingPose, move: "skip", inPlace: "hop", particles: { kind: "lift", count: 2 }, holdMs: 1900 },
  supportive:   { face: supportivePose, move: "scoot", then: "nod", inPlace: "nod", loop: "soothe", accent: "blush", particles: { kind: "heart", count: 1 }, holdMs: 2600 },
  patient:      { face: patientPose, move: "sink", loop: "breathe", holdMs: 2400 },
  // "Tell me more" — genuine wondering, no longer the wrong-answer face.
  curious:      { face: curiousPose, move: "lean", loop: "ponder", accent: "dots", holdMs: 2200 },
  // "Say that again?" — the "?" that used to be Curious's.
  confused:     { face: confusedPose, move: "wobble", accent: "question", holdMs: 1900 },
  apologetic:   { face: apologeticPose, move: "shrink", loop: "sway", accent: "bashful", holdMs: 2000 },
  amused:       { face: amusedPose, move: "wobble", loop: "giggle", accent: "laugh", particles: { kind: "ha", count: 3 }, holdMs: 1900 },
  impressed:    { face: impressedPose, move: "pop", then: "recoil", accent: "glints", particles: { kind: "twinkle", count: 5 }, holdMs: 2000 },
  proud:        { face: smug, move: "hop", then: "puff", accent: "sheen", holdMs: 2200 },
  // Often the first reaction of a session now (starting a chapter), so the
  // spray is kept modest.
  excited:      { face: excitedPose, move: "jitterBounce", particles: { kind: "burst", count: 6 }, holdMs: 2000 },
  // Grounded and the same every time: a happy bounce on the spot, confetti on
  // the last landing. Never travels, so it plays even mid-test.
  celebration:  { face: celebrationPose, move: "celebrate", overlay: "confetti", holdMs: 3000 },
};

/**
 * Where a burst hands off when it expires, instead of back to ambient.
 *
 * Empty since the roster went positive-only: the one handoff was Sad →
 * Encouraging, and neither exists any more. Kept because the mechanism is
 * still how a burst would chain into another.
 */
export const EMOTION_HANDOFF: Partial<Record<PetEmotion, PetEmotion>> = {};

export function isBackendEmotion(value: unknown): value is BackendEmotion {
  return typeof value === "string" && (BACKEND_EMOTIONS as readonly string[]).includes(value);
}
