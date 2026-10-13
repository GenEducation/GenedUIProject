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
  // Advanced is the "mastered" state: deep-teal marks on a citron tint, so the
  // chip/glyph well is the page's eye-catcher (ink/teal on citron ≥ 7:1).
  Advanced: { accent: "#075E63", ink: "#122D30", tint: "#D9F279", wash: ["#F4F9E6", "#FBFCF7"], edge: "#DDEAB4" },
  Proficient: { accent: "#2F7A7E", ink: "#075E63", tint: "#DCEBE7", wash: ["#EEF5F3", "#FAFCFB"], edge: "#D0E3DD" },
  Approaching: { accent: "#F5A50B", ink: "#B7790A", tint: "#FDEFC7", wash: ["#FFF8E8", "#FFFDF7"], edge: "#F8E7BE" },
  Developing: { accent: "#EC3F72", ink: "#C02659", tint: "#FCDDE7", wash: ["#FFF2F6", "#FFFAFB"], edge: "#F8DAE4" },
  "Not started": { accent: "#8FA3A5", ink: "#5E7477", tint: "#E8EEEC", wash: ["#F5F7F5", "#FCFCFB"], edge: "#E1E8E5" },
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
