import { describe, it, expect } from "vitest";
import { TYPE_TO_INTERACTION } from "../types";
import { COMPONENT_REGISTRY } from "../registry";

/**
 * The frontend TYPE_TO_INTERACTION map MUST mirror the backend
 * core-service/src/core_service/math_interactives/validator.py
 * (INTERACTIVE_TYPE_TO_INTERACTION). Drift here silently posts answers in a
 * shape the grader can't match → every student answer marked wrong. This test
 * is the canary; update BACKEND_MAP only when validator.py changes.
 */
const BACKEND_MAP: Record<string, string> = {
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

describe("interactive type contract", () => {
  it("frontend TYPE_TO_INTERACTION matches the backend validator map exactly", () => {
    expect(TYPE_TO_INTERACTION).toEqual(BACKEND_MAP);
  });

  it("every backend interactive_type has a registered renderer", () => {
    for (const type of Object.keys(BACKEND_MAP)) {
      expect(COMPONENT_REGISTRY[type], `missing renderer for ${type}`).toBeDefined();
    }
  });

  it("registry has no renderer for an unknown interactive_type", () => {
    expect(COMPONENT_REGISTRY["totally_made_up"]).toBeUndefined();
  });

  it("uses only the five known interaction_type buckets", () => {
    const buckets = new Set(Object.values(BACKEND_MAP));
    expect([...buckets].sort()).toEqual(
      ["build", "match", "order", "place_point", "select_cells"].sort()
    );
  });
});
