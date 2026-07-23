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
  brandSoft: "#EDE9FE",
  success: "#00B894",
  danger: "#E53E3E",
  ink: "#1A202C",
  muted: "#94A3B8",
  border: "#E2E8F0",
  cell: "#F1EFFA",
  panel: "#F7F6FD",
};

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
