/**
 * Design tokens mirrored from the web app.
 *
 * - Student portal palette → src/features/student/components/StudentHome.tsx (the `C` object)
 * - Auth palette          → src/app/globals.css  (--navy / --emerald)
 * - Report editorial      → src/components/report-card/StudentReportCard.tsx (:root vars)
 *
 * Keep these in sync with the web until a shared `packages/shared` workspace exists.
 */

export const colors = {
  /* Student portal (home / profile) */
  primary: "#059F6D", // emerald — primary CTA fill; never use tutor purple for CTAs
  genPurple: "#5B4DC7",
  genBlue: "#4A90D9",
  edGreen: "#2D6A4F",
  sparkle: "#8B7FE8",
  growth: "#00B894",
  sun: "#F0AD4E",
  coral: "#E8635A",
  sky: "#5DADE2",

  /* Tutor (Nia) accent — chat bubbles, voice orb, presence only, never a CTA fill */
  tutor: "#5B4DC7",
  tutorLight: "#8B7FE8",
  tutorSoft: "#4A90D9",

  text: "#1A2332",
  textMid: "#4A5568",
  textMuted: "#94A3B8",
  textFaint: "#CBD5E1",
  pageBg: "#F7F8FC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  sidebarBg: "#1C2333",
  sidebarText: "rgba(200,209,220,1)",
  sidebarMuted: "rgba(255,255,255,0.25)",
  sidebarActive: "#FFFFFF",
  sidebarBorder: "rgba(255,255,255,0.06)",
  sidebarHover: "rgba(255,255,255,0.06)",
  sidebarActiveBg: "rgba(255,255,255,0.10)",

  /* Auth (sign-in / sign-up) */
  navy: "#042E5C",
  emerald: "#059F6D",
  emeraldDark: "#047A54",

  /* Report card (editorial Learner Report) */
  reportBg: "#F8F9FA",
  ink: "#0F172A",
  ink2: "#334155",
  muted: "#64748B",
  proficient: "#1D4ED8",
  proficientBg: "#EFF6FF",
  proficientBd: "#BFDBFE",
  approaching: "#B45309",
  approachingBg: "#FFFBEB",
  approachingBd: "#FDE68A",
  developing: "#BE123C",
  developingBg: "#FFF1F2",
  developingBd: "#FECDD3",
  advanced: "#047857",
} as const;

/**
 * Font family names as loaded by @expo-google-fonts in app/_layout.tsx.
 *
 * Student-portal headings/body mirror web's --font-display (Baloo 2) /
 * --font-body (Mukta). `nunito`/`dm` keys are kept (remapped to the new
 * families) so existing components referencing them by name pick up the
 * new look without a per-component rename.
 */
export const fonts = {
  display: "Baloo2_800ExtraBold",
  displaySemiBold: "Baloo2_700Bold",
  displayMedium: "Baloo2_600SemiBold",
  body: "Mukta_500Medium",
  bodyRegular: "Mukta_400Regular",
  bodySemiBold: "Mukta_600SemiBold",
  bodyBold: "Mukta_700Bold",

  // Legacy aliases — remapped to Baloo 2 / Mukta so callers keep working.
  nunito: "Baloo2_800ExtraBold",
  nunitoBold: "Baloo2_700Bold",
  dm: "Mukta_400Regular",
  dmMedium: "Mukta_500Medium",
  dmBold: "Mukta_700Bold",

  // Editorial (report card) — unchanged.
  serif: "SourceSerif4_500Medium",
  serifItalic: "SourceSerif4_500Medium_Italic",
  mono: "JetBrainsMono_600SemiBold",
  playfair: "PlayfairDisplay_700Bold",
} as const;

/** Subject visual map — mirrors SUBJECTS_VISUAL in StudentHome.tsx */
export const subjectVisual: Record<
  string,
  { color: string; bg: string; icon: string; label: string }
> = {
  english: { color: "#4A90D9", bg: "#EBF3FB", icon: "📖", label: "English" },
  mathematics: { color: "#2D6A4F", bg: "#E8F5EF", icon: "🧮", label: "Mathematics" },
  science: { color: "#D4820A", bg: "#FEF5E7", icon: "🔬", label: "Science" },
  hindi: { color: "#7B5EA7", bg: "#F3EDF9", icon: "✏️", label: "Hindi" },
  socialscience: { color: "#B0543F", bg: "#FBEEEA", icon: "🌍", label: "Social Science" },
};

/** Normalize a raw API subject string ("social_science", "Social Science") → subjectVisual key */
export function normalizeSubjectKey(raw: string | undefined | null): string {
  if (!raw) return "";
  const s = raw.toLowerCase().replace(/[_\s-]/g, "");
  if (s.includes("math")) return "mathematics";
  if (s.includes("english")) return "english";
  if (s.includes("social")) return "socialscience";
  if (s.includes("science")) return "science";
  if (s.includes("hindi")) return "hindi";
  return s;
}

export const radius = { sm: 8, md: 14, lg: 18, xl: 24 } as const;
