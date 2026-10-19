/**
 * Chart colours for the Learning Signal dashboard.
 *
 * Duplicated from the `.learning-signal` CSS custom properties in globals.css
 * because recharts sets `fill`/`stroke` as SVG presentation attributes and
 * cannot resolve a `var()` through them. Keep the two in sync.
 */
export const LS_COLORS = {
  emerald: "#059F6D",
  emeraldSoft: "#E6F4EE",
  blue: "#4A90D9",
  blueSoft: "#E8F1FA",
  amber: "#E8A33D",
  amberSoft: "#FDF3E2",
  teal: "#2FA98A",
  tealSoft: "#E4F3EF",
  track: "#EDF2EE",
  grid: "#E9EFEA",
  axis: "#8DA096",
  danger: "#D9534F",
} as const;

/** The four journey stages, in funnel order, as the reference tints them. */
export const STAGE_TONES = ["emerald", "blue", "amber", "teal"] as const;
export type StageTone = (typeof STAGE_TONES)[number];

export const STAGE_FILL: Record<StageTone, string> = {
  emerald: LS_COLORS.emerald,
  blue: LS_COLORS.blue,
  amber: LS_COLORS.amber,
  teal: LS_COLORS.teal,
};

/** Tailwind-free inline styles, since these are per-stage and computed. */
export const STAGE_SOFT: Record<StageTone, string> = {
  emerald: LS_COLORS.emeraldSoft,
  blue: LS_COLORS.blueSoft,
  amber: LS_COLORS.amberSoft,
  teal: LS_COLORS.tealSoft,
};
