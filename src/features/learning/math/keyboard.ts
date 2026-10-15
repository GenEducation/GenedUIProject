import type { VirtualKeyboardLayout } from "mathlive";

/**
 * The maths keyboard for touch screens: Grade 6 keys only, in two tabs, instead of MathLive's defaults (ln, sin, ∫, ∃,
 * Greek). Every layout ends with a close key, so the keyboard is never a trap. `#@` takes what was typed just before
 * (so 3 then the fraction key makes 3/□), `#?` is a box to fill.
 */
const ACTIONS = [
  { label: "[left]", width: 1 },
  { label: "[right]", width: 1 },
  "[backspace]",
  "[hide-keyboard]",
] as const;

export const GRADE6_KEYBOARD: VirtualKeyboardLayout[] = [
  {
    label: "123",
    tooltip: "Numbers",
    displayEditToolbar: false,
    rows: [
      ["x", "y", "[separator-5]", "7", "8", "9", { latex: "\\div", label: "÷" }, "[separator-5]",
        { latex: "\\frac{\\Box}{\\Box}", insert: "\\frac{#@}{#?}", tooltip: "Fraction" },
        { latex: "\\Box^{\\Box}", insert: "#@^{#?}", tooltip: "Power" }],
      ["(", ")", "[separator-5]", "4", "5", "6", { latex: "\\times", label: "×" }, "[separator-5]",
        { latex: "\\Box^{2}", insert: "#@^{2}", tooltip: "Squared" },
        { latex: "\\sqrt{\\Box}", insert: "\\sqrt{#0}", tooltip: "Square root" }],
      ["=", ",", "[separator-5]", "1", "2", "3", { latex: "-", label: "−" }, "[separator-5]",
        { latex: "\\pi", label: "π" },
        { latex: "\\%", label: "%" }],
      [...ACTIONS.slice(0, 2), "[separator-5]", "0", ".", { latex: "+", label: "+" }, { latex: "<", label: "<" }, "[separator-5]",
        ACTIONS[2], ACTIONS[3]],
    ],
  },
  {
    label: "∠△",
    tooltip: "Geometry",
    displayEditToolbar: false,
    rows: [
      ["A", "B", "C", "D", "E", "F", "O", "P"],
      [
        { latex: "\\overleftrightarrow{AB}", insert: "\\overleftrightarrow{#?}", tooltip: "Line" },
        { latex: "\\overrightarrow{AB}", insert: "\\overrightarrow{#?}", tooltip: "Ray" },
        { latex: "\\overline{AB}", insert: "\\overline{#?}", tooltip: "Line segment" },
        { latex: "\\angle", tooltip: "Angle" },
        { latex: "\\Box^{\\circ}", insert: "#@^{\\circ}", tooltip: "Degrees" },
        { latex: "\\triangle", tooltip: "Triangle" },
        { latex: "\\parallel", tooltip: "Parallel" },
        { latex: "\\perp", tooltip: "Perpendicular" },
      ],
      [{ latex: "\\le", label: "≤" }, { latex: "\\ge", label: "≥" }, { latex: "\\ne", label: "≠" }, "=", "<", ">", "[separator-5]", "[separator-5]"],
      [...ACTIONS.slice(0, 2), "[separator-5]", "[separator-5]", "[separator-5]", "[separator-5]", ACTIONS[2], ACTIONS[3]],
    ],
  },
] as VirtualKeyboardLayout[];
