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
  genPurple: "#5B4DC7",
  genBlue: "#4A90D9",
  edGreen: "#2D6A4F",
  sparkle: "#8B7FE8",
  growth: "#00B894",
  sun: "#F0AD4E",
  coral: "#E8635A",
  sky: "#5DADE2",

  text: "#1A2332",
  textMid: "#4A5568",
  textMuted: "#94A3B8",
  textFaint: "#CBD5E1",
  pageBg: "#F7F8FC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  sidebarBg: "#1C2333",

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

/** Font family names as loaded by @expo-google-fonts in app/_layout.tsx */
export const fonts = {
  nunito: "Nunito_800ExtraBold",
  nunitoBold: "Nunito_700Bold",
  dm: "DMSans_400Regular",
  dmMedium: "DMSans_500Medium",
  dmBold: "DMSans_700Bold",
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
};

export const radius = { sm: 8, md: 14, lg: 18, xl: 24 } as const;
