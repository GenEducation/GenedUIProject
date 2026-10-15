/**
 * The maths a student can put in a chat message, offered by typing `/` at the start of a word (like a slash command).
 * Each one inserts real maths with boxes (`#?`) to fill in; Tab moves between boxes, Space goes back to words.
 *
 * `sample` is how the menu shows it (plain Unicode, so the list renders before MathLive has loaded).
 */
export interface Notation {
  id: string;
  name: string;
  sample: string;
  /** Other words a student might type to find it. */
  aliases: string[];
  latex: string;
}

export const NOTATIONS: Notation[] = [
  { id: "fraction", name: "Fraction", sample: "a⁄b", aliases: ["divide", "over", "half"], latex: "\\frac{#?}{#?}" },
  { id: "power", name: "Power", sample: "xⁿ", aliases: ["exponent", "index"], latex: "#?^{#?}" },
  { id: "square", name: "Squared", sample: "x²", aliases: ["power", "two"], latex: "#?^{2}" },
  { id: "root", name: "Square root", sample: "√x", aliases: ["sqrt", "radical"], latex: "\\sqrt{#?}" },
  { id: "line", name: "Line", sample: "↔AB", aliases: ["geometry"], latex: "\\overleftrightarrow{#?}" },
  { id: "ray", name: "Ray", sample: "→AB", aliases: ["geometry", "arrow"], latex: "\\overrightarrow{#?}" },
  { id: "segment", name: "Line segment", sample: "A͞B", aliases: ["geometry", "bar"], latex: "\\overline{#?}" },
  { id: "angle", name: "Angle", sample: "∠ABC", aliases: ["geometry"], latex: "\\angle #?" },
  { id: "degree", name: "Degrees", sample: "45°", aliases: ["angle"], latex: "#?^{\\circ}" },
  { id: "triangle", name: "Triangle", sample: "△ABC", aliases: ["geometry"], latex: "\\triangle #?" },
  { id: "parallel", name: "Parallel", sample: "∥", aliases: ["geometry"], latex: "\\parallel" },
  { id: "perpendicular", name: "Perpendicular", sample: "⊥", aliases: ["geometry"], latex: "\\perp" },
  { id: "times", name: "Times", sample: "×", aliases: ["multiply"], latex: "\\times" },
  { id: "divide", name: "Divided by", sample: "÷", aliases: ["division"], latex: "\\div" },
  { id: "leq", name: "Less than or equal", sample: "≤", aliases: ["inequality"], latex: "\\le" },
  { id: "geq", name: "Greater than or equal", sample: "≥", aliases: ["inequality"], latex: "\\ge" },
  { id: "neq", name: "Not equal", sample: "≠", aliases: ["inequality"], latex: "\\ne" },
  { id: "pi", name: "Pi", sample: "π", aliases: ["circle"], latex: "\\pi" },
  { id: "maths", name: "Maths", sample: "x+1", aliases: ["math", "expression", "equation", "formula"], latex: "" },
];

/**
 * The notations matching what was typed after `/`, best first: name starts, then alias starts, then (from three letters,
 * so `/l` isn't every name with an l in it) contains.
 */
export function filterNotations(query: string, list: Notation[] = NOTATIONS): Notation[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const score = (n: Notation) => {
    const name = n.name.toLowerCase();
    if (name.startsWith(q) || n.id.startsWith(q)) return 0;
    if (n.aliases.some((a) => a.startsWith(q))) return 1;
    if (q.length >= 3 && name.includes(q)) return 2;
    return 3;
  };
  return list
    .map((n) => [n, score(n)] as const)
    .filter(([, s]) => s < 3)
    .sort((a, b) => a[1] - b[1])
    .map(([n]) => n);
}
