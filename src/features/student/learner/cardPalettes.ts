/**
 * The chapter-card palettes, for the gradient a tile shows while its chapter
 * has no accepted card. Mirrors `CARD_PALETTES` in the backend's
 * `domains/visuals/src/gened_visuals/gened_card/assets/card-template/palettes.js`
 * (only the colours a tile uses), so the fallback belongs to the same family as
 * the card that will replace it. Keep the two in step.
 *
 * sky: background gradient, top → bottom · a: the hero accent · ink: text
 */
export interface TilePalette {
  sky: [string, string];
  a: string;
  b: string;
  ink: string;
}

const p = (sky0: string, sky1: string, a: string, b: string, ink: string): TilePalette => ({ sky: [sky0, sky1], a, b, ink });

const FAMILIES: Record<string, TilePalette[]> = {
  mathematics: [
    p("#EEF0FF", "#D6DBFF", "#5B5BD6", "#21B3A4", "#272A5C"),
    p("#E5F8F5", "#C5EEE6", "#17A08F", "#4F6BED", "#163C44"),
    p("#F3ECFF", "#E0D2FF", "#7A4DF0", "#38B0F5", "#2F1F5C"),
    p("#E8F3FF", "#CBE2FF", "#2F7FE6", "#1FC0A3", "#1A3456"),
    p("#EEF1FF", "#D9E0FF", "#6475F5", "#00AFCC", "#252F5E"),
    p("#E9F6F8", "#CDE9EE", "#3346B8", "#2CC69B", "#1C2450"),
  ],
  science: [
    p("#ECFAEE", "#CDEFD3", "#2FA35A", "#3AA6E8", "#17402A"),
    p("#E7F6FF", "#C7E8FB", "#2B95DA", "#58BF6A", "#173A52"),
    p("#F2FBE6", "#DDF2C4", "#6AAE2E", "#22A7B5", "#2A3F14"),
    p("#E4F7F7", "#C3E9EC", "#138F9B", "#4BB873", "#123A40"),
    p("#EFFAF0", "#D3F0D6", "#3DB16B", "#7A8CF0", "#1A4129"),
    p("#E8F7EE", "#C9EBD6", "#1F8A55", "#2FB3D6", "#103424"),
  ],
  english: [
    p("#FFF1EC", "#FFD9CC", "#F2684A", "#2CA6A4", "#4A1F18"),
    p("#FFF6E5", "#FFE4B8", "#F29A1F", "#4F7BE8", "#45300F"),
    p("#FFF0F3", "#FFD5DE", "#E5527A", "#33A99A", "#4B1A2A"),
    p("#FFF3EA", "#FFDCC4", "#FF7F50", "#6A6FE0", "#4A2516"),
    p("#FBEFFA", "#F1D4EE", "#C44DA8", "#2FA9C9", "#41183A"),
    p("#FFF8E3", "#FFEAB0", "#E8A21A", "#E5604A", "#43310C"),
  ],
  social_science: [
    p("#FBF0E8", "#F2D7C4", "#C8603A", "#3E8FB0", "#3E2316"),
    p("#FBF4E4", "#F1E0B9", "#C9952E", "#3F7FA8", "#3D2E12"),
    p("#EEF4F1", "#D3E3DA", "#4E8B6F", "#C77B3A", "#1F3529"),
    p("#EAF3F7", "#CDE2EC", "#2F7FA0", "#B9783A", "#183140"),
    p("#FCEFE6", "#F4D3BE", "#B8503A", "#7A9A3A", "#3A1D14"),
    p("#EDF2F8", "#D2DDEB", "#4A6FA5", "#C98A3A", "#1E2B40"),
  ],
  default: [
    p("#FFF8E6", "#FFE9B8", "#F2A31F", "#3A9DE8", "#3E2F10"),
    p("#FFF0F6", "#FFD6E8", "#EE5D9A", "#3BB0C9", "#47182E"),
    p("#EAF4FF", "#CCE3FF", "#3B82F6", "#F2A31F", "#16305A"),
    p("#F4EEFF", "#E2D5FF", "#8152E8", "#21B39A", "#2C1C55"),
    p("#FFF2E6", "#FFDCBC", "#FF7A2F", "#3A8FD8", "#47220E"),
    p("#E6F8F7", "#C4EDEA", "#16A39A", "#F2A31F", "#123D3A"),
  ],
};

const ALIASES: Record<string, string> = {
  maths: "mathematics", math: "mathematics",
  environmental_studies: "science", evs: "science", physics: "science", chemistry: "science", biology: "science",
  hindi: "english", sanskrit: "english", languages: "english",
  history: "social_science", geography: "social_science", civics: "social_science", economics: "social_science",
};

/** `'mathematics:1'` → its palette; an unknown subject gets the default family, a bad index wraps. */
export function paletteFor(id: string | null | undefined): TilePalette {
  const [subject = "default", n = "0"] = String(id || "default:0").split(":");
  const family = FAMILIES[ALIASES[subject] ?? subject] ?? FAMILIES.default;
  const i = Number.parseInt(n, 10) || 0;
  return family[((i % family.length) + family.length) % family.length];
}
