/**
 * Blobatar configuration — the numeric contract between this app and
 * `blobatar@2`.
 *
 * Every value below was read out of the installed package rather than guessed:
 * the shape bands from `blobatar/src/styles/blob.ts`, the tone bands from
 * `blobatar/src/color.ts`, the trait keys from `styles/compose.ts` and
 * `styles/shapes.ts`. Blobatar's public docs deliberately do not enumerate
 * them, because they follow the layout.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * FROZEN PER MAJOR. The shape thresholds, the tone set and the ranges each
 * trait key is read into are part of blobatar's determinism contract and
 * change only in a new major — which is exactly how a consumer opts into
 * every student's face changing. A `blobatar@2 → @3` upgrade invalidates
 * this file: re-derive it from the new source before shipping the bump.
 * ──────────────────────────────────────────────────────────────────────────
 */

import type { TraitOverrides } from "blobatar";

/**
 * House style: the hue band every GenEd creature is drawn from unless the
 * student overrides it in the customizer.
 *
 * ⚠ UNITS. There are two hue surfaces and they are NOT the same units:
 *   - the top-level `hue` option is **degrees**, and
 *   - the `traits.hue` key is a **0–1 position**, read as `t.num("hue", 0, 360)`
 *     (`blobatar/src/render.ts` → `resolve`).
 * We need `traits.hue`, because only a trait key accepts a *list* — "any of
 * these, seed picks which" — which is what a house style actually is. So the
 * brand degrees below are divided by 360 on the way in.
 *
 * The brand green (`--primary #059F6D`) sits at ~158°, so the band runs
 * green → teal → a warm amber escape, which keeps a crowd of blobatars
 * recognizably one family without collapsing them into one color.
 * Deliberately NOT pinning `shape` — silhouette variety is the only thing
 * that distinguishes two students at 34px in a sidebar.
 */
export const BLOBATAR_HUE_DEGREES = [158, 172, 186, 200, 142, 38] as const;

/** The same band in `traits.hue` units. */
export const BLOBATAR_HUES = BLOBATAR_HUE_DEGREES.map((d) => d / 360);

/**
 * The ten silhouettes, as positions inside blobatar's `shape` threshold
 * partition.
 *
 * Source — `blobatar/src/styles/blob.ts`:
 *   round .22 · organic .48 · boxy .6 · capsule .7 · nub .79
 *   cloud .86 · droplet .915 · hexagon .95 · sun .98 · triangle 1
 *
 * Each value here is the midpoint of that silhouette's band, so it stays valid
 * under any rounding. (Blobatar's own docs use `[0.11, 0.825, 0.965]` as an
 * example meaning "round, cloud or sun" — which matches these midpoints
 * exactly, and is a useful confirmation that the bands were read correctly.)
 */
export const SILHOUETTES = {
  round: 0.11,
  organic: 0.35,
  boxy: 0.54,
  capsule: 0.65,
  nub: 0.745,
  cloud: 0.825,
  droplet: 0.8875,
  hexagon: 0.9325,
  sun: 0.965,
  triangle: 0.99,
} as const;

export type SilhouetteName = keyof typeof SILHOUETTES;

export const SILHOUETTE_NAMES = Object.keys(SILHOUETTES) as SilhouetteName[];

/**
 * The six tones, as positions inside blobatar's `TONES` partition.
 *
 * Source — `blobatar/src/color.ts`:
 *   pastel .2 · pale .36 · mid .62 · deep .8 · bright .93 · ink 1.0
 *
 * Unlike hue, tone IS the same units in both surfaces — the `tone` option and
 * the `traits.tone` key are both a raw 0–1 swatch position.
 *
 * ⚠ `toneAt` resolves with `TONES.find(([edge]) => v < edge) ?? TONES[0]`, so a
 * tone of exactly `1` misses every band and falls back to *pastel* — the ink
 * swatch renders pale. Hence 0.965 rather than 1. This is the single easiest
 * mistake to make against this API.
 */
export const TONES = {
  pastel: 0.1,
  pale: 0.28,
  mid: 0.49,
  deep: 0.71,
  bright: 0.865,
  ink: 0.965,
} as const;

export type ToneName = keyof typeof TONES;

export const TONE_NAMES = Object.keys(TONES) as ToneName[];

/**
 * Trait keys the customizer drives, by the name the layout reads them under.
 *
 * Only the axes a student can't get wrong are exposed. The rest — body
 * proportion/squareness, eye roundness/stretch/lean, gaze x/y, tilt, corner
 * rounding, petal distance/rotation, nub angle — stay hashed from `user_id`,
 * so they still vary per student; they are simply not handed to a 13-year-old
 * as a slider. `gaze.x`/`gaze.y` in particular would fight the cursor-tracking
 * driver on the profile hero and the desk pet.
 */
export const TRAIT_KEYS = {
  shape: "shape",
  eyeSize: "eye.scale",
  eyeGap: "eye.gap",
} as const;

/**
 * Per-silhouette decoration axes. A shape absent from this map has no
 * decoration, and the customizer hides the section entirely for it.
 *
 * Source — `blobatar/src/styles/shapes.ts`.
 */
export const DECORATION: Partial<
  Record<SilhouetteName, { label: string; keys: { key: string; label: string }[] }>
> = {
  sun: {
    label: "Petals",
    keys: [
      { key: "sun.n", label: "How many" },
      { key: "sun.r", label: "Petal size" },
    ],
  },
  cloud: {
    label: "Lobes",
    keys: [{ key: "cloud.n", label: "How many" }],
  },
  nub: {
    label: "Nubs",
    keys: [
      { key: "nub.n", label: "How many" },
      { key: "nub.r0", label: "Nub size" },
    ],
  },
  droplet: {
    label: "Tip",
    keys: [{ key: "droplet.tip", label: "Tip length" }],
  },
};

/**
 * Why a decoration axis is missing, phrased for the panel.
 *
 * Shown greyed rather than omitted: picking `sun` otherwise appears to grow
 * controls out of nowhere, and a student who wants petals has no way to learn
 * that petals belong to a shape.
 */
export const DECORATION_HINTS: { label: string; hint: string }[] = [
  { label: "Petals", hint: "petals — sun only" },
  { label: "Lobes", hint: "lobes — cloud only" },
  { label: "Nubs", hint: "nubs — nub only" },
  { label: "Tip", hint: "tip length — droplet only" },
];

/**
 * Cursor tracking, shared by every blobatar that follows the pointer.
 *
 * `travel` is the eye excursion in **viewBox units**, and a blobatar's viewBox
 * is always `0 0 100 100` — so a value here is a percentage of the creature's
 * rendered width, whatever size it is drawn at. That is what makes one
 * constant correct for both the 76px desk pet and the 112px profile hero.
 *
 * Blobatar's docs suggest 1.5–4, but that reads as guidance for a large hero:
 * at the desk pet's 76px, `3` is 2.3 CSS pixels of movement across an entire
 * sweep of the screen — measured, not estimated — which is close to
 * imperceptible. This is deliberately well above that range.
 *
 * `settle` is the pursuit time constant in ms: how long the eyes take to cover
 * ~63% of the way to a new target. Blobatar's default is 110; lower is a
 * quicker, more attentive catch-up, and 0 would remove the smoothing entirely
 * and let the eyes snap.
 */
export const GAZE = {
  travel: 12,
  settle: 70,
} as const;

/**
 * The seed a blobatar is derived from.
 *
 * `"<name>#<user_id>"`, and both halves earn their place:
 *
 * - The **name** is what makes the creature respond while a student types it
 *   during onboarding. That reveal is the whole point of the moment, and a
 *   seed of `user_id` alone is fixed before the modal even opens.
 * - The **user_id** is what stops two students called Aarav being handed the
 *   byte-identical creature. Blobatar is deterministic, so a bare name really
 *   does collide.
 *
 * Before a name exists the seed is just the id, so the pre-name creature is
 * stable rather than flickering through one-character names.
 *
 * Case and whitespace do not matter: blobatar NFC-normalizes, trims and
 * lowercases before hashing, so `"Hitesh#abc"` and `"hitesh #abc"` agree.
 *
 * ⚠ This is the *live* seed. Once a student saves their name it is frozen into
 * `usePetStore.petSeed` and that takes precedence — see `useBuddySeed`, which
 * is what components should actually call. Renaming yourself afterwards must
 * not transform the buddy you have grown attached to.
 */
export function blobatarSeed(
  profile?: { user_id?: string; username?: string; name?: string } | null,
  nameOverride?: string,
): string {
  const id = profile?.user_id || profile?.username || "gened-student";
  const name = (nameOverride ?? profile?.name ?? "").trim();
  return name ? `${name}#${id}` : id;
}

/**
 * Merge house style under the student's own choices, per key.
 *
 * One-directional and per-key on purpose: an axis the student has touched is
 * theirs, an axis they have not falls back to the house band, and an axis in
 * neither falls back to the hash. So picking hot pink in the customizer beats
 * the brand hues — as it should — without also discarding the silhouette they
 * left alone.
 */
export function resolveTraits(overrides?: TraitOverrides | null): TraitOverrides {
  return { hue: [...BLOBATAR_HUES], ...(overrides ?? {}) };
}
