import type React from "react";
import type { InteractiveProps } from "./types";

import SelectableGrid from "./blocks/SelectableGrid";
import FractionBar from "./blocks/FractionBar";
import ShapePartition from "./blocks/ShapePartition";
import NumberLine from "./blocks/NumberLine";
import BaseTenBlocks from "./blocks/BaseTenBlocks";
import HundredChart from "./blocks/HundredChart";
import ArrayBuilder from "./blocks/ArrayBuilder";
import SortableSequence from "./blocks/SortableSequence";
import DragMatch from "./blocks/DragMatch";
import BarModel from "./blocks/BarModel";
import BalanceScale from "./blocks/BalanceScale";
import Hotspot from "./blocks/Hotspot";
import AngleTool from "./blocks/AngleTool";
import SymmetryGrid from "./blocks/SymmetryGrid";
import AreaModel from "./blocks/AreaModel";
import CoordinatePlane from "./blocks/CoordinatePlane";
import Clock from "./blocks/Clock";
import MoneyCounter from "./blocks/MoneyCounter";
import ExpressionBuilder from "./blocks/ExpressionBuilder";
import Chart from "./blocks/Chart";
import DataBuilder from "./blocks/DataBuilder";
import NetFolding from "./blocks/NetFolding";
import ProbabilitySpinner from "./blocks/ProbabilitySpinner";

export const COMPONENT_REGISTRY: Record<string, React.ComponentType<InteractiveProps>> = {
  selectable_grid: SelectableGrid,
  fraction_bar: FractionBar,
  shape_partition: ShapePartition,
  number_line: NumberLine,
  base_ten_blocks: BaseTenBlocks,
  hundred_chart: HundredChart,
  array_builder: ArrayBuilder,
  sortable_sequence: SortableSequence,
  drag_match: DragMatch,
  bar_model: BarModel,
  balance_scale: BalanceScale,
  hotspot: Hotspot,
  angle_tool: AngleTool,
  symmetry_grid: SymmetryGrid,
  area_model: AreaModel,
  coordinate_plane: CoordinatePlane,
  clock: Clock,
  money_counter: MoneyCounter,
  expression_builder: ExpressionBuilder,
  chart: Chart,
  data_builder: DataBuilder,
  net_folding: NetFolding,
  probability_spinner: ProbabilitySpinner,
};
