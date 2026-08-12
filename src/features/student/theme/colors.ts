/**
 * Single source of truth for the student app's color palette.
 *
 * Previously StudentHome.tsx, StudentHomeSidebar.tsx, StudentChatSidebar.tsx,
 * and StudentProfile.tsx each declared their own `const C = {...}` palette
 * with slightly different values for the same colors (e.g. "#1a2332" vs
 * "#1A202C" for ink) — this file replaces all four.
 *
 * Kept as plain hex strings (not CSS custom properties) because the app
 * relies heavily on hex-alpha-suffix concatenation like `${C.tutor}12` for
 * translucent fills — a pattern CSS var() cannot support.
 */
export const STUDENT_COLORS = {
  // Brand — mirrors --primary / --tutor in globals.css. Raw hex here too
  // (not var()) so downstream alpha-suffix concatenation keeps working.
  primary: "#059F6D",
  tutor: "#5B4DC7",
  tutorLight: "#8B7FE8",
  tutorSoft: "#4A90D9",

  // Accents
  growth: "#00B894",
  warn: "#F0AD4E",
  danger: "#E8635A",
  sky: "#5DADE2",

  // Subject colors — tint icons/progress/card headers only, never a
  // primary CTA fill (see Button component).
  subjectEnglish: "#4A90D9",
  subjectMath: "#2D6A4F",
  subjectScience: "#D4820A",
  subjectSocial: "#B0543F",
  subjectHindi: "#7B5EA7",

  // Text
  text: "#1a2332",
  textMid: "#4a5568",
  textMuted: "#94a3b8",
  textFaint: "#cbd5e1",

  // Surfaces
  pageBg: "#F7F8FC",
  card: "#FFFFFF",
  border: "#e2e8f0",

  // Dark sidebar ground
  sidebarBg: "#1C2333",
  sidebarText: "rgba(200,209,220,1)",
  sidebarMuted: "rgba(255,255,255,0.25)",
  sidebarActive: "#FFFFFF",
  sidebarBorder: "rgba(255,255,255,0.06)",
  sidebarHover: "rgba(255,255,255,0.06)",
  sidebarActiveBg: "rgba(255,255,255,0.10)",
} as const;
