import type { ChatElement } from "../../../types/api";

export interface InteractiveProps {
  directiveId: string;
  meta?: ChatElement["meta"];
  sessionId?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export const COLORS = {
  brand: "#5B4DC7",
  brandSoft: "#EDE9FE",
  success: "#00B894",
  danger: "#E53E3E",
  ink: "#1A202C",
  muted: "#94A3B8",
  border: "#E2E8F0",
  cell: "#F1EFFA",
  panel: "#F7F6FD",
};

// interactive_type → interaction_type. Mirrors backend validator.py.
export const TYPE_TO_INTERACTION: Record<string, string> = {
  selectable_grid: "select_cells",
  fraction_bar: "select_cells",
  shape_partition: "build",
  number_line: "place_point",
  base_ten_blocks: "build",
  hundred_chart: "select_cells",
  array_builder: "build",
  sortable_sequence: "order",
  drag_match: "match",
  bar_model: "place_point",
  balance_scale: "build",
  hotspot: "select_cells",
  angle_tool: "place_point",
  symmetry_grid: "select_cells",
  area_model: "select_cells",
  coordinate_plane: "place_point",
  clock: "place_point",
  money_counter: "build",
  expression_builder: "build",
  chart: "select_cells",
  data_builder: "build",
  net_folding: "match",
  probability_spinner: "select_cells",
};
