import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ── Controllable store mock (shared by every block) ──────────────────────────
const submitInteractiveAnswer = vi.fn();
const clearInteractiveResult = vi.fn();
let interactiveResults: Record<string, any> = {};

vi.mock("../../../store/useStudentStore", () => ({
  useStudentStore: () => ({ submitInteractiveAnswer, interactiveResults, clearInteractiveResult }),
}));

import { InteractiveBlock } from "../InteractiveBlock";

beforeEach(() => {
  submitInteractiveAnswer.mockReset().mockResolvedValue({ is_correct: true, attempts: 1 });
  clearInteractiveResult.mockReset();
  interactiveResults = {};
});

type Fixture = {
  interactionType: string;
  render: Record<string, any>;
  interaction?: Record<string, any>;
  // Make the widget submittable by simulating a minimal student interaction.
  interact: (container: HTMLElement) => void;
  // Optional assertion on the posted answer object.
  expectAnswer?: (answer: any) => void;
};

const PROMPT = (t: string) => `Question for ${t}`;

function meta(type: string, f: Fixture) {
  return {
    directive_id: "dir-" + type,
    interactive_type: type,
    interaction_type: f.interactionType,
    label: "Activity",
    question: PROMPT(type),
    render: f.render,
    interaction: f.interaction ?? {},
  };
}

const checkBtn = () => screen.getByRole("button", { name: /check/i });
const cells = (c: HTMLElement) => Array.from(c.querySelectorAll("button")).filter((b) => !/check/i.test(b.textContent || ""));
const ranges = (c: HTMLElement) => Array.from(c.querySelectorAll('input[type="range"]')) as HTMLInputElement[];

const FIXTURES: Record<string, Fixture> = {
  selectable_grid: {
    interactionType: "select_cells",
    render: { shape: "grid", rows: 2, cols: 4 },
    interact: (c) => fireEvent.click(cells(c)[0]),
    expectAnswer: (a) => expect(Array.isArray(a.selected)).toBe(true),
  },
  fraction_bar: {
    interactionType: "select_cells",
    render: { reference_bar: { segments: 2, shaded: [0] }, answer_bar: { segments: 4, shaded: [] } },
    interact: () => fireEvent.click(screen.getByRole("button", { name: "segment 1" })),
    expectAnswer: (a) => expect(a.selected).toContain(0),
  },
  number_line: {
    interactionType: "place_point",
    render: { min: 0, max: 1, tick_step: 0.25 },
    interact: (c) => {
      const slider = c.querySelector('[role="slider"]')!;
      fireEvent.keyDown(slider, { key: "ArrowRight" });
    },
    expectAnswer: (a) => expect(typeof a.value).toBe("number"),
  },
  base_ten_blocks: {
    interactionType: "build",
    render: { available: ["hundred", "ten", "one"] },
    interact: () => fireEvent.click(screen.getByRole("button", { name: "one" })),
    expectAnswer: (a) => expect(a.ones).toBeGreaterThan(0),
  },
  hundred_chart: {
    interactionType: "select_cells",
    render: { start: 1, end: 10, columns: 5 },
    interact: () => fireEvent.click(screen.getByRole("button", { name: "1" })),
    expectAnswer: (a) => expect(a.selected).toContain(1),
  },
  array_builder: {
    interactionType: "build",
    render: { max_rows: 4, max_cols: 4 },
    interact: (c) => fireEvent.change(ranges(c)[0], { target: { value: "3" } }),
    expectAnswer: (a) => expect(a.rows).toBeGreaterThanOrEqual(1),
  },
  sortable_sequence: {
    interactionType: "order",
    render: { items: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }] },
    interact: () => {}, // already submittable; ordering produced from current (shuffled) state
    expectAnswer: (a) => expect(a.order).toHaveLength(3),
  },
  bar_model: {
    interactionType: "place_point",
    render: { whole: 100, unit_ticks: 4 },
    interact: (c) => fireEvent.change(ranges(c)[0], { target: { value: "2" } }),
    expectAnswer: (a) => expect(typeof a.value).toBe("number"),
  },
  balance_scale: {
    interactionType: "build",
    render: { left_pan: [{ type: "x" }, { type: "unit", count: 2 }], right_pan: [{ type: "unit", count: 5 }] },
    interact: (c) => fireEvent.click(cells(c)[1]), // the "+" stepper
    expectAnswer: (a) => expect(typeof a.solve_x).toBe("number"),
  },
  hotspot: {
    interactionType: "select_cells",
    render: { regions: [{ id: "a", shape: "rect", coords: [0, 0, 50, 50] }], image_width: 100, image_height: 100 },
    interact: (c) => fireEvent.click(c.querySelector("rect")!),
    expectAnswer: (a) => expect(a.selected).toContain("a"),
  },
  angle_tool: {
    interactionType: "place_point",
    render: { snap_step: 5 },
    interact: (c) => fireEvent.change(ranges(c)[0], { target: { value: "45" } }),
    expectAnswer: (a) => expect(a.degrees).toBe(45),
  },
  symmetry_grid: {
    interactionType: "select_cells",
    render: { rows: 4, cols: 4, given_cells: [0] },
    interact: (c) => fireEvent.click(cells(c).find((b) => !(b as HTMLButtonElement).disabled)!),
    expectAnswer: (a) => expect(Array.isArray(a.selected)).toBe(true),
  },
  area_model: {
    interactionType: "select_cells",
    render: { rows: 4, cols: 4 },
    interact: (c) => fireEvent.click(cells(c)[0]),
    expectAnswer: (a) => expect(Array.isArray(a.selected)).toBe(true),
  },
  coordinate_plane: {
    interactionType: "place_point",
    render: { x_range: [0, 10], y_range: [0, 10], grid_step: 1 },
    interact: (c) => fireEvent.click(c.querySelector('[role="group"]')!, { clientX: 160, clientY: 35 }),
    expectAnswer: (a) => expect(Array.isArray(a.points)).toBe(true),
  },
  clock: {
    interactionType: "place_point",
    render: { initial_hour: 3, initial_minute: 15 },
    interaction: { mode: "set_time" },
    interact: () => {}, // submittable at its initial time
    expectAnswer: (a) => expect(a).toHaveProperty("hour"),
  },
  money_counter: {
    interactionType: "build",
    render: { currency: "INR", denominations: [1, 2, 5] },
    interact: () => fireEvent.click(screen.getByRole("button", { name: "₹1" })),
    expectAnswer: (a) => expect(a.amount).toBeGreaterThan(0),
  },
  expression_builder: {
    interactionType: "build",
    render: { tile_palette: ["x", "unit"] },
    interact: () => fireEvent.click(screen.getByRole("button", { name: "+ x" })),
    expectAnswer: (a) => expect(a.expression).toContain("x"),
  },
  chart: {
    interactionType: "select_cells",
    render: { data: [{ id: "a", label: "A", value: 3 }, { id: "b", label: "B", value: 5 }] },
    interact: () => fireEvent.click(screen.getByRole("button", { name: "A: 3" })),
    expectAnswer: (a) => expect(a.selected).toContain("a"),
  },
  data_builder: {
    interactionType: "build",
    render: { categories: ["A", "B"], max_value: 10 },
    interact: (c) => fireEvent.change(ranges(c)[0], { target: { value: "4" } }),
    expectAnswer: (a) => expect(a.values).toBeTruthy(),
  },
  net_folding: {
    interactionType: "match",
    render: { net: "cube_cross", options: [{ id: "o1", label: "Cube" }, { id: "o2", label: "Pyramid" }] },
    interact: () => fireEvent.click(screen.getByRole("button", { name: "Cube" })),
    expectAnswer: (a) => expect(a.pairs[0][1]).toBe("o1"),
  },
  probability_spinner: {
    interactionType: "select_cells",
    render: { sectors: [{ id: "s1", label: "Red", weight: 1 }, { id: "s2", label: "Blue", weight: 1 }] },
    interact: () => fireEvent.click(screen.getByRole("button", { name: "Red" })),
    expectAnswer: (a) => expect(a.selected).toContain("s1"),
  },
  shape_partition: {
    interactionType: "build",
    render: { shape: "circle", allowed_parts: [2, 3, 4] },
    interaction: { target_parts: 4 },
    interact: () => fireEvent.click(screen.getByRole("button", { name: "4" })),
    expectAnswer: (a) => expect(a.parts).toBe(4),
  },
};

describe("interactive blocks — render, interact, submit", () => {
  for (const [type, f] of Object.entries(FIXTURES)) {
    it(`${type}: renders prompt, accepts interaction, posts the right shape`, async () => {
      const { container } = render(<InteractiveBlock directiveId={"dir-" + type} meta={meta(type, f) as any} />);

      // 1. Prompt is visible (regression guard for the question/prompt field mapping).
      expect(screen.getByText(PROMPT(type))).toBeInTheDocument();

      // 2. Student interacts, then submits.
      f.interact(container);
      const btn = checkBtn();
      expect(btn).not.toBeDisabled();
      await act(async () => {
        fireEvent.click(btn);
      });

      // 3. Posted with the correct interaction_type and a parseable answer.
      expect(submitInteractiveAnswer).toHaveBeenCalledTimes(1);
      const [dir, itype, payload] = submitInteractiveAnswer.mock.calls[0];
      expect(dir).toBe("dir-" + type);
      expect(itype).toBe(f.interactionType);
      const answer = JSON.parse(payload);
      f.expectAnswer?.(answer);
    });
  }

  it("drag_match renders both columns and stays un-submittable until a pair is made", () => {
    const f: Fixture = {
      interactionType: "match",
      render: { left: [{ id: "l1", label: "L1" }], right: [{ id: "r1", label: "R1" }] },
      interact: () => {},
    };
    render(<InteractiveBlock directiveId="dir-dm" meta={meta("drag_match", f) as any} />);
    expect(screen.getByText("L1")).toBeInTheDocument();
    expect(screen.getByText("R1")).toBeInTheDocument();
    // No pair yet → Check disabled (can't submit an empty match).
    expect(checkBtn()).toBeDisabled();
  });
});

describe("unknown / error blocks fall back gracefully", () => {
  it("renders the fallback chip for an unknown interactive_type", () => {
    render(<InteractiveBlock directiveId="x" meta={{ interactive_type: "made_up", directive_id: "x" } as any} />);
    expect(screen.getByText(/Activity unavailable/i)).toBeInTheDocument();
  });

  it("renders the fallback chip for an error block", () => {
    render(<InteractiveBlock directiveId="x" meta={{ is_fallback: true, label: "Oops" } as any} />);
    expect(screen.getByText(/Activity unavailable/i)).toBeInTheDocument();
  });
});
