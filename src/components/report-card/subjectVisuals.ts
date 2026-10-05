/**
 * Subject visuals shared by the report card and the parent portal.
 *
 * The icon (glyph) comes from the subject; every colour comes from how well
 * the child is doing in it, so a parent can scan the row for what needs
 * attention. Subject names are free taxonomy text ("Mathematics", "Social
 * Science"…), matched by keyword.
 */
import { bandFor } from "./utils";

const ICONS = "/parent-portal";

// First match wins: "Social Science" must not pick up the science flask.
const GLYPHS: [RegExp, string][] = [
  [/social|history|geography|civics|political|economics/i, "subject_overview_icon"],
  [/hindi|sanskrit/i, "subject_hindi"],
  [/english|literature|grammar/i, "subject_english_book"],
  [/math|algebra|geometry|arithmetic/i, "subject_mathematics_hash"],
  [/science|physics|chemistry|biology|evs/i, "subject_science_flask"],
];

/** The subject's glyph; single-colour, so it can be tinted with a CSS mask. */
export function subjectIcon(subject: string): string {
  const name = GLYPHS.find(([pattern]) => pattern.test(subject))?.[1] ?? "subject_overview_icon";
  return `${ICONS}/${name}.png`;
}

export type MasteryBand = "Advanced" | "Proficient" | "Approaching" | "Developing" | "Not started";

export interface BandTone {
  /** Icon, mastery figure, progress bar. */
  accent: string;
  /** Status chip text. */
  ink: string;
  /** Status chip fill and the circle behind the icon. */
  tint: string;
  /** Card wash, top to bottom. */
  wash: [string, string];
  /** Card border. */
  edge: string;
}

/** Report-card bands (via `bandFor`), coloured for this page. */
export const BAND_TONES: Record<MasteryBand, BandTone> = {
  Advanced: { accent: "#16A36B", ink: "#0E7C55", tint: "#D7F3E5", wash: ["#EFFAF4", "#FAFDFB"], edge: "#D3EFE1" },
  Proficient: { accent: "#2563EB", ink: "#1D4ED8", tint: "#DBE7FE", wash: ["#F2F6FF", "#FAFCFF"], edge: "#DCE6FB" },
  Approaching: { accent: "#F5A50B", ink: "#B7790A", tint: "#FDEFC7", wash: ["#FFF8E8", "#FFFDF7"], edge: "#F8E7BE" },
  Developing: { accent: "#EC3F72", ink: "#C02659", tint: "#FCDDE7", wash: ["#FFF2F6", "#FFFAFB"], edge: "#F8DAE4" },
  "Not started": { accent: "#8A9AA8", ink: "#5E7186", tint: "#E9EEF1", wash: ["#F6F8F9", "#FCFDFD"], edge: "#E3E9EC" },
};

/** Band for a 0–100 mastery, or "Not started" when the child hasn't begun. */
export function masteryBand(mastery: number | null, started: boolean): MasteryBand {
  if (!started) return "Not started";
  return bandFor(mastery ?? 0) as MasteryBand;
}

/** The full palette for a 0–100 mastery. Every subject and chapter surface in
 *  the report card is coloured through this, so recolouring means editing
 *  `BAND_TONES` only. */
export function toneFor(mastery: number | null, started: boolean): BandTone {
  return BAND_TONES[masteryBand(mastery, started)];
}
