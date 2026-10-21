import type { ChatElement } from "../../store/useStudentStore";
import { STUDENT_COLORS } from "../../theme/colors";

export interface InteractiveProps {
  directiveId: string;
  meta?: ChatElement["meta"];
  disabled?: boolean;
  readOnly?: boolean;
}

// Brand palette shared across all interactive math widgets. Raw hex (not
// var()) — some consumers (e.g. Hotspot.tsx: `${COLORS.brand}55`) alpha-
// suffix this value, which CSS custom properties can't support.
export const COLORS = {
  brand: STUDENT_COLORS.tutor,
  brandSoft: STUDENT_COLORS.softSurface,
  brandLight: STUDENT_COLORS.tutorSoft,
  // Text-safe "correct" colour (deep ocean). The citron below is what marks a
  // correct answer visually — always as a fill under ink, never as text.
  success: STUDENT_COLORS.tutor,
  danger: "#C2453E",
  ink: STUDENT_COLORS.ink as string,
  muted: "#7F9295",
  border: "#E3E8E2",
  // Neutral strokes for apparatus (scale beam, axes, angle base).
  apparatus: "#8FA1A3",
  cell: "#EEF4F1",
  // The lesson screen's tutor surface, so an activity reads as Nia's.
  panel: "#F1F7F4",
  accent: STUDENT_COLORS.accent,
  accentDeep: STUDENT_COLORS.accentDeep,
  accentInk: STUDENT_COLORS.ink,
};

// Categorical fills for manipulatives that need several distinct colours.
// SERIES_ON_WHITE_TEXT all carry white labels at ≥4.5:1; SERIES_FILL is for
// unlabelled shapes (spinner sectors) and may include citron.
export const SERIES_ON_WHITE_TEXT = [
  STUDENT_COLORS.tutor,
  STUDENT_COLORS.ink,
  STUDENT_COLORS.subjectSocial,
  STUDENT_COLORS.tutorLight,
  STUDENT_COLORS.textMuted,
];
export const SERIES_FILL = [
  STUDENT_COLORS.tutor,
  STUDENT_COLORS.accentDeep,
  STUDENT_COLORS.ink,
  STUDENT_COLORS.danger,
  STUDENT_COLORS.tutorSoft,
  STUDENT_COLORS.warn,
];

export const FONT = "var(--font-body)";

// interactive_type → interaction_type. Mirrors backend validator.py.
export const TYPE_TO_INTERACTION: Record<string, string> = {
  // fractions / parts-of-a-whole
  selectable_grid: "select_cells",
  fraction_bar: "select_cells",
  shape_partition: "build",
  // number & place value
  number_line: "place_point",
  base_ten_blocks: "build",
  hundred_chart: "select_cells",
  array_builder: "build",
  // ordering & matching
  sortable_sequence: "order",
  drag_match: "match",
  // bar / part-whole
  bar_model: "place_point",
  balance_scale: "build",
  // geometry
  hotspot: "select_cells",
  angle_tool: "place_point",
  symmetry_grid: "select_cells",
  area_model: "select_cells",
  coordinate_plane: "place_point",
  clock: "place_point",
  money_counter: "build",
  // algebra
  expression_builder: "build",
  // data & probability
  chart: "select_cells",
  data_builder: "build",
  net_folding: "match",
  probability_spinner: "select_cells",
};
