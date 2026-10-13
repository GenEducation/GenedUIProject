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
  primary: "#075E63",
  tutor: "#075E63",
  tutorLight: "#3C8A8E",
  tutorSoft: "#5FA8A3",

  // Deep Ocean + Citron brand surfaces — mirror --accent / --canvas /
  // --soft-surface. Citron is a fill only; put ink text on it, never white.
  accent: "#D9F279",
  accentDeep: "#B8D63F",
  ink: "#122D30",
  canvas: "#F6F7F2",
  softSurface: "#DCEBE7",

  // Accents
  growth: "#4E8F2F",
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
  text: "#122D30",
  textMid: "#3E5558",
  textMuted: "#5E7477",
  textFaint: "#C5D1CF",

  // Surfaces
  pageBg: "#F6F7F2",
  card: "#FFFFFF",
  border: "#E3E8E2",

  // Dark sidebar ground
  sidebarBg: "#122D30",
  sidebarText: "rgba(205,222,218,1)",
  sidebarMuted: "rgba(255,255,255,0.25)",
  sidebarActive: "#FFFFFF",
  sidebarBorder: "rgba(255,255,255,0.06)",
  sidebarHover: "rgba(255,255,255,0.06)",
  sidebarActiveBg: "rgba(255,255,255,0.10)",

  // Light sidebar ground — the redesigned StudentHomeSidebar. Kept separate
  // from the dark `sidebar*` keys above, which StudentChatSidebar still uses.
  sidebarLightBg: "#FBFBF8",
  sidebarLightText: "#4C6366",
  sidebarLightActive: "#075E63",
  sidebarLightActiveBg: "#DCEBE7",
  sidebarLightBorder: "#E7ECE6",
  sidebarLightHover: "#EEF4F1",
  sidebarLightName: "#122D30",
} as const;
