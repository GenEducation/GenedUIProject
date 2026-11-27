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
  primary: "#287624",
  tutor: "#287624",
  tutorLight: "#4E9A2A",
  tutorSoft: "#86B83A",

  // Zoovi brand surfaces (lime on paper) — mirror --accent / --canvas /
  // --soft-surface. Lime is a fill only; put ink text on it, never white.
  accent: "#A6CF08",
  accentDeep: "#8DB000",
  ink: "#1D6315",
  canvas: "#F7F4EA",
  softSurface: "#E8F0CC",

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

  // The Zoovi logo's folded-paper colours. The dashboard marks each subject with one of these (its dot on the subject
  // card, the card's hover edge), so the page keeps to the logo's palette. logoGoldInk is the gold deepened a step so
  // it still reads on white.
  logoDark: "#2A6E22",
  logoDeep: "#18540C",
  logoGold: "#E0C21E",
  logoGoldInk: "#C5A20E",

  // Text
  text: "#1D6315",
  textMid: "#3B5533",
  textMuted: "#5A6E52",
  textFaint: "#CDD3BF",

  // Surfaces
  pageBg: "#F7F4EA",
  card: "#FFFFFF",
  border: "#E7E2D2",

  // Dark sidebar ground
  sidebarBg: "#1D6315",
  sidebarText: "rgba(226,236,205,1)",
  sidebarMuted: "rgba(255,255,255,0.25)",
  sidebarActive: "#FFFFFF",
  sidebarBorder: "rgba(255,255,255,0.06)",
  sidebarHover: "rgba(255,255,255,0.06)",
  sidebarActiveBg: "rgba(255,255,255,0.10)",

  // Light sidebar ground — the redesigned StudentHomeSidebar. Kept separate
  // from the dark `sidebar*` keys above, which StudentChatSidebar still uses.
  sidebarLightBg: "#FBF9F2",
  sidebarLightText: "#4F6646",
  sidebarLightActive: "#287624",
  sidebarLightActiveBg: "#E8F0CC",
  sidebarLightBorder: "#E9E5D6",
  sidebarLightHover: "#F2F5E5",
  sidebarLightName: "#1D6315",
} as const;
