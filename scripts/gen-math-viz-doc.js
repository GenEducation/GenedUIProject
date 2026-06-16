const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageOrientation, LevelFormat,
} = require("docx");

// ---- layout constants (US Letter landscape, 1" margins) ----
// Landscape: pass portrait dims; docx-js swaps internally.
// Content width on long edge = 15840 - 1440 - 1440 = 12960 DXA
const CONTENT_W = 12960;
const COLS = [2100, 2900, 2900, 2160, 1700, 1200]; // sums to 12960
const HEADERS = ["Topic", "What to visualize", "Student interaction", "Block type", "Library", "Returns"];

const HEADER_FILL = "5B4DC7";
const HEADER_TEXT = "FFFFFF";
const ZEBRA_FILL = "F1EFF9";
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 110, right: 110 };

function cell(text, width, opts = {}) {
  const { bold = false, color = "222222", fill = null, align = AlignmentType.LEFT } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, color, size: 18 })],
    })],
  });
}

function headerRow() {
  return new TableRow({
    tableHeader: true,
    children: HEADERS.map((h, i) =>
      cell(h, COLS[i], { bold: true, color: HEADER_TEXT, fill: HEADER_FILL })),
  });
}

function strandTable(rows) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: COLS,
    rows: [
      headerRow(),
      ...rows.map((r, idx) =>
        new TableRow({
          children: r.map((val, i) =>
            cell(val, COLS[i], { fill: idx % 2 === 1 ? ZEBRA_FILL : null })),
        })),
    ],
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun(text)] });
}
function body(runs, spacing = { after: 120 }) {
  const children = Array.isArray(runs) ? runs : [new TextRun(runs)];
  return new Paragraph({ spacing, children });
}
function bullet(text) {
  return new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun(text)] });
}

// ---- data: 13 strands ----
const strands = [
  ["1. Number & place value", [
    ["Place value (ones to lakhs)", "Base-ten blocks / place chart", "Drag blocks to build a number", "base_ten_blocks", "SVG + dnd-kit", "build"],
    ["Regrouping / carrying", "Bundling 10 ones into 1 ten", 'Tap to "bundle" or "break"', "base_ten_blocks", "SVG", "build"],
    ["Compare & order numbers", "Number cards / number line", "Drag to order, or tap < = >", "sortable_sequence / number_line", "dnd-kit / SVG", "order / place_point"],
    ["Rounding", "Number line with midpoints", "Drag marker to nearest 10/100", "number_line", "SVG", "place_point"],
    ["Roman numerals / number names", "Match pairs", "Match symbol to value", "drag_match", "dnd-kit", "match"],
  ]],
  ["2. Fractions", [
    ['Identify a fraction (the "select 1/4")', "Grid / circle / bar in equal parts", "Click cells to shade target", "selectable_grid", "SVG", "select_cells"],
    ["Equivalent fractions", "Two stacked partitioned bars", "Split/select to match a bar", "fraction_bar", "SVG", "select_cells"],
    ["Compare fractions", "Aligned fraction bars", "Tap the larger, or order them", "fraction_bar / sortable_sequence", "SVG / dnd-kit", "select_cells / order"],
    ["Fraction on a number line", "Number line 0 to 1", "Drag point to 3/4", "number_line", "SVG", "place_point"],
    ["Add/subtract like fractions", "Partitioned bar", "Shade parts to show sum", "selectable_grid", "SVG", "select_cells"],
    ["Fraction of a set", "Group of objects", "Circle/select the fraction", "selectable_grid (set mode)", "SVG", "select_cells"],
  ]],
  ["3. Decimals", [
    ["Decimal place value", "10x10 hundredths grid", "Shade 0.07, 0.4, etc.", "selectable_grid (10x10)", "SVG", "select_cells"],
    ["Decimals on a number line", "Zoomable line 0 to 1", "Place 0.6", "number_line", "SVG", "place_point"],
    ["Decimal to fraction", "Pair cards", "Match 0.25 to 1/4", "drag_match", "dnd-kit", "match"],
    ["Compare decimals", "Grids side by side", "Tap the larger", "selectable_grid", "SVG", "select_cells"],
  ]],
  ["4. Percentage", [
    ["Percent as 100-grid", "10x10 grid", "Shade 35%", "selectable_grid (10x10)", "SVG", "select_cells"],
    ["Percent / fraction / decimal", "Triple-match", "Match 50% / 1/2 / 0.5", "drag_match", "dnd-kit", "match"],
    ["Percent of a quantity", "Bar model", "Drag to mark 25% of 80", "bar_model", "SVG", "place_point"],
    ["Discount / simple interest", "Bar model with parts", "Build the part-whole", "bar_model", "SVG", "build"],
  ]],
  ["5. Ratio & proportion", [
    ["Ratio as groups", "Two-color counters", "Build a 2:3 set", "array_builder / data_builder", "SVG / dnd", "build"],
    ["Equivalent ratios", "Double number line / table", "Fill the matching value", "number_line (x2)", "SVG", "place_point"],
    ["Unitary method", "Bar model", "Partition into equal units", "bar_model", "SVG", "build"],
    ["Scale / proportion", "Two figures", "Drag slider to scale", "chart / slider", "recharts / SVG", "place_point"],
  ]],
  ["6. Integers & negative numbers", [
    ["Number line with negatives", "Line -10 to +10", "Place -3", "number_line", "SVG", "place_point"],
    ["Adding/subtracting integers", "Jumps on a number line", "Drag jump arrows", "number_line", "SVG", "place_point"],
    ["Integers in context", "Thermometer / elevation", "Set the level", "number_line (vertical)", "SVG", "place_point"],
  ]],
  ["7. Operations, factors & multiples", [
    ["Multiplication as array", "Dot array", "Build rows x cols", "array_builder", "SVG", "build"],
    ["Multiplication / division", "Area model", "Partition the rectangle", "area_model", "SVG", "select_cells"],
    ["Multiples & patterns", "1 to 100 grid", "Tap all multiples of 4", "hundred_chart", "SVG", "select_cells"],
    ["Factors / prime", "Number grid or factor tree", "Tap factors, build tree", "hundred_chart / sortable_sequence", "SVG / dnd", "select_cells"],
    ["LCM / HCF", "Two highlighted multiple sets", "Tap common multiples", "hundred_chart", "SVG", "select_cells"],
  ]],
  ["8. Patterns, sequences & algebra", [
    ["Number series / next term", "Sequence of tiles", "Tap/enter the next term", "sortable_sequence / fill-blank", "dnd-kit", "order"],
    ["Growing/shape patterns", "Figurate dot patterns", "Build the next figure", "array_builder", "SVG", "build"],
    ["Skip counting", "100-chart", "Tap the skip-count path", "hundred_chart", "SVG", "select_cells"],
    ["Simple expressions", "Algebra tiles", "Drag tiles for 2x + 3", "expression_builder *", "dnd-kit", "build"],
    ["Linear equations", "Balance scale", "Add/remove to balance", "balance_scale", "SVG + dnd", "build"],
  ]],
  ["9. Geometry", [
    ["Lines, rays, angles vocab", "Labeled diagram", "Tap the obtuse angle", "hotspot", "SVG", "select_cells"],
    ["Measure / build angles", "Protractor", "Drag arm to 60 degrees", "angle_tool", "SVG", "place_point"],
    ["2D shapes & properties", "Shape gallery", "Sort by sides/symmetry", "drag_match", "dnd-kit", "match"],
    ["Symmetry", "Half-figure on a grid", "Complete the reflection", "symmetry_grid", "SVG", "select_cells"],
    ["3D solids & nets", "Foldable net", "Fold/match net to solid", "net_folding * / drag_match", "SVG / dnd", "match"],
    ["Tiling / tessellation", "Pattern grid", "Place tiles to fill", "selectable_grid", "SVG", "select_cells"],
  ]],
  ["10. Mensuration (perimeter, area, volume)", [
    ["Perimeter", "Shape on a grid", "Trace/count edge units", "area_model", "SVG", "select_cells"],
    ["Area by counting", "Unit-square grid", "Shade the region", "area_model", "SVG", "select_cells"],
    ["Area formulas", "Resizable rectangle", "Drag to dimensions", "area_model + slider", "SVG", "place_point"],
    ["Volume", "Stacked unit cubes", "Build the cuboid", "base_ten_blocks (3D)", "SVG", "build"],
  ]],
  ["11. Coordinate geometry", [
    ["Plot points", "Grid plane", "Tap to plot (3, 4)", "coordinate_plane", "SVG", "place_point"],
    ["Read coordinates", "Plane with a point", "Enter/select its coords", "coordinate_plane", "SVG", "place_point"],
    ["Plot a shape / line", "Grid plane", "Plot multiple points", "coordinate_plane", "SVG", "build"],
  ]],
  ["12. Measurement (time, money, units)", [
    ["Telling time", "Analog clock", "Drag hands to 3:45", "clock", "SVG", "place_point"],
    ["Elapsed time", "Two clocks / line", "Set end time", "clock / number_line", "SVG", "place_point"],
    ["Money / making change", "Coin & note tray", "Drag coins to a total", "money_counter *", "SVG / dnd", "build"],
    ["Unit conversion", "Double number line", "Mark the equivalent", "number_line", "SVG", "place_point"],
  ]],
  ["13. Data handling & probability", [
    ["Read bar/pictograph", "Chart", "Click the tallest bar", "chart", "recharts", "select_cells"],
    ["Build a graph", "Empty axes", "Drag bars to data values", "data_builder", "recharts / dnd", "build"],
    ["Pictograph", "Icon grid", "Place icons per category", "data_builder", "SVG / dnd", "build"],
    ["Mean / median / mode", "Dot plot", "Arrange/level the dots", "data_builder", "SVG / dnd", "build"],
    ["Probability", "Spinner / number cube", "Spin, predict outcome", "probability_spinner *", "SVG", "select_cells"],
  ]],
];

const children = [];

// Title
children.push(new Paragraph({
  alignment: AlignmentType.LEFT,
  spacing: { after: 60 },
  children: [new TextRun({ text: "Grade 4–8 Mathematics — Visualization Topics", bold: true, size: 40, color: "3C3489" })],
}));
children.push(new Paragraph({
  spacing: { after: 240 },
  children: [new TextRun({ text: "Interactive, server-driven (SDUI) visuals — what to build, which library, and how the answer is graded.", italics: true, color: "5F5E5A", size: 22 })],
}));

// Interaction loop
children.push(h1("The universal interaction loop"));
children.push(body("Every topic below uses the same loop, so the build is a small set of reusable blocks, not one widget per topic:"));
children.push(bullet("Backend sends a typed block spec with a directive_id (and privately holds the answer key)."));
children.push(bullet("Frontend renders the matching component; the student manipulates it (click / drag / place)."));
children.push(bullet("On submit, the frontend calls submitComprehensionAnswer(directive_id, interaction_type, answer)."));
children.push(bullet("Backend grades the payload and returns { is_correct }."));
children.push(bullet("Frontend shows green (correct) / red (try again) with retry — same pattern as the existing ComprehensionWidget."));
children.push(body([new TextRun({ text: "Per topic you decide only three things: which block, what the student does, and the answer payload shape.", color: "3C3489" })], { before: 120, after: 120 }));

// Strand tables
children.push(h1("Topic catalog by strand"));
for (const [title, rows] of strands) {
  children.push(h2(title));
  children.push(strandTable(rows));
  children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
}

// Footnote on new types
children.push(body([new TextRun({ text: "* New block types beyond the v1 catalog: expression_builder, net_folding, money_counter, probability_spinner. Everything else reuses blocks already defined in the SDUI rule book.", italics: true, color: "5F5E5A", size: 18 })], { before: 60, after: 200 }));

// Takeaways
children.push(h1("Takeaways for the build"));
children.push(bullet("About 9 reusable block types cover most of grade 4–8 math: selectable_grid, number_line, area_model, bar_model, base_ten_blocks, drag_match, sortable_sequence, hundred_chart, coordinate_plane (plus clock / angle_tool for measurement-geometry)."));
children.push(bullet("You are not building one widget per topic — you build a small parameterized library; the backend reuses each block across many topics by changing the spec (rows, target, labels)."));
children.push(bullet("The answer vocabulary collapses to five interaction_type values: select_cells, place_point, match, order, build — so the backend grading layer only understands five payload shapes total."));

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: "Arial", color: "3C3489" },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "26215C" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 280 } } } },
      ] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children,
  }],
});

const outPath = path.join("D:\\GenedUIProject", "grade4-8-math-visualization-topics.docx");
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log("Wrote", outPath, buffer.length, "bytes");
});
