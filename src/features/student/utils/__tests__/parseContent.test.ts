import { describe, it, expect } from "vitest";

import { parseContent, normalizeSvg, generateHistoricalSVG } from "../parseContent";

// Interactive-block rehydration is covered by parseContent.interactive.test.ts.
// This suite covers the non-interactive segmentation + the two pure SVG helpers.

describe("parseContent — segmentation", () => {
  it("returns [] for blank input and one trimmed text element for plain markdown", () => {
    expect(parseContent("")).toEqual([]);
    expect(parseContent("   \n  ")).toEqual([]);
    // Plain markdown becomes a single trimmed text element.
    const els = parseContent("  Hello **world**  ");
    expect(els).toHaveLength(1);
    expect(els[0]).toMatchObject({ type: "text", content: "Hello **world**" });
  });

  it("preserves order of text around a MATH_DRAW directive", () => {
    const els = parseContent(
      'Look here: <<MATH_DRAW type="rectangle" params={"width":4,"height":2}>> All done.',
    );
    expect(els.map((e) => e.type)).toEqual(["text", "svg", "text"]);
    expect(els[0].content).toBe("Look here:");
    expect(els[1].meta?.shape).toBe("rectangle");
    expect(els[2].content).toBe("All done.");
  });

  it("normalizes a raw <svg> block (flagged as backend SVG) and parses MATH_WIDGET", () => {
    const els = parseContent('<svg width="400px" height="200px"><rect /></svg>');
    expect(els).toHaveLength(1);
    expect(els[0].type).toBe("svg");
    expect(els[0].meta?.isRawBackendSvg).toBe(true);
    expect(els[0].content).toContain('width="100%"');

    const widget = parseContent('<<MATH_WIDGET expression="x^2">>');
    expect(widget).toHaveLength(1);
    expect(widget[0]).toMatchObject({ type: "widget", content: "x^2" });
  });
});

describe("normalizeSvg", () => {
  it("makes pixel sizes responsive, injects a missing viewBox, and is idempotent", () => {
    const out = normalizeSvg('<svg width="400px" height="200px"></svg>');
    expect(out).toContain('width="100%"');
    expect(out).toContain('height="auto"');
    expect(normalizeSvg('<svg width="400" height="200"></svg>')).toContain('viewBox="0 0 400 200"');
    expect(normalizeSvg("<svg width='300px'></svg>")).toContain("width='100%'");
    const already = '<svg viewBox="0 0 1 1" width="100%" height="auto"></svg>';
    expect(normalizeSvg(already)).toBe(already);
  });
});

describe("generateHistoricalSVG", () => {
  it("renders known shapes and aliases, and falls back to a placeholder for unknown types", () => {
    const svg = generateHistoricalSVG("rectangle", { width: 4, height: 2 });
    expect(svg).toContain("<svg");
    expect(svg).toContain("<rect");
    // Aliases are their canonical shape (diamond → rhombus).
    expect(generateHistoricalSVG("diamond", {})).toBe(generateHistoricalSVG("rhombus", {}));
    expect(generateHistoricalSVG("totally_made_up", {})).toContain("</svg>");
  });
});
