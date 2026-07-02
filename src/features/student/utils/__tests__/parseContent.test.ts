import { describe, it, expect } from "vitest";

import { parseContent, normalizeSvg, generateHistoricalSVG } from "../parseContent";

// Interactive-block rehydration is covered by parseContent.interactive.test.ts.
// This suite covers the non-interactive segmentation + the two pure SVG helpers.

describe("parseContent — segmentation", () => {
  it("returns [] for empty or whitespace-only input", () => {
    expect(parseContent("")).toEqual([]);
    expect(parseContent("   \n  ")).toEqual([]);
  });

  it("wraps plain markdown in a single trimmed text element", () => {
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

  it("normalizes a raw <svg> block and flags it as backend SVG", () => {
    const els = parseContent('<svg width="400px" height="200px"><rect /></svg>');
    expect(els).toHaveLength(1);
    expect(els[0].type).toBe("svg");
    expect(els[0].meta?.isRawBackendSvg).toBe(true);
    expect(els[0].content).toContain('width="100%"');
  });

  it("parses a MATH_WIDGET directive into a widget element", () => {
    const els = parseContent('<<MATH_WIDGET expression="x^2">>');
    expect(els).toHaveLength(1);
    expect(els[0]).toMatchObject({ type: "widget", content: "x^2" });
  });
});

describe("normalizeSvg", () => {
  it("converts pixel width/height to responsive values", () => {
    const out = normalizeSvg('<svg width="400px" height="200px"></svg>');
    expect(out).toContain('width="100%"');
    expect(out).toContain('height="auto"');
  });

  it("injects a viewBox from numeric width/height when missing", () => {
    const out = normalizeSvg('<svg width="400" height="200"></svg>');
    expect(out).toContain('viewBox="0 0 400 200"');
    expect(out).toContain('width="100%"');
    expect(out).toContain('height="auto"');
  });

  it("handles single-quoted pixel attributes", () => {
    expect(normalizeSvg("<svg width='300px'></svg>")).toContain("width='100%'");
  });

  it("is idempotent on already-normalized SVG", () => {
    const already = '<svg viewBox="0 0 1 1" width="100%" height="auto"></svg>';
    expect(normalizeSvg(already)).toBe(already);
  });
});

describe("generateHistoricalSVG", () => {
  it("renders a valid SVG for a known shape", () => {
    const svg = generateHistoricalSVG("rectangle", { width: 4, height: 2 });
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<rect");
  });

  it("treats aliases as their canonical shape (diamond → rhombus)", () => {
    expect(generateHistoricalSVG("diamond", {})).toBe(generateHistoricalSVG("rhombus", {}));
  });

  it("falls back to a placeholder SVG for an unknown type without throwing", () => {
    const svg = generateHistoricalSVG("totally_made_up", {});
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });
});
