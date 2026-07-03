import { parseContent, normalizeSvg, generateHistoricalSVG } from "../parseContent";

describe("parseContent", () => {
  it("returns plain text as a single text element", () => {
    const els = parseContent("Just some prose.");
    expect(els).toHaveLength(1);
    expect(els[0].type).toBe("text");
    expect(els[0].content).toBe("Just some prose.");
  });

  it("returns [] for empty content", () => {
    expect(parseContent("")).toEqual([]);
  });

  it("parses a self-closing <<VISUAL/>> tag", () => {
    const els = parseContent('<<VISUAL type="desmos" label="Graph" expression="y=x^2" />>');
    const visual = els.find((e) => e.type === "visual");
    expect(visual).toBeDefined();
    expect(visual!.content).toBe("desmos");
    expect(visual!.meta?.engine).toBe("desmos");
  });

  it("parses an interactive block with a JSON payload", () => {
    const json = JSON.stringify({
      interactive_type: "number_line",
      directive_id: "d1",
      prompt: "Place 3",
    });
    const els = parseContent(`<<VISUAL type="interactive" label="NL">>${json}<</VISUAL>>`);
    const inter = els.find((e) => e.type === "interactive");
    expect(inter).toBeDefined();
    expect(inter!.meta?.interactive_type).toBe("number_line");
    expect(inter!.meta?.directive_id).toBe("d1");
    expect(inter!.meta?.question).toBe("Place 3");
  });

  it("turns a MATH_DRAW directive into an svg element", () => {
    const els = parseContent('<<MATH_DRAW type="rectangle" params={"width":4,"height":2,"label":"Box"}>>');
    const svg = els.find((e) => e.type === "svg");
    expect(svg).toBeDefined();
    expect(svg!.content).toContain("<svg");
    expect(svg!.meta?.shape).toBe("rectangle");
  });

  it("normalises a raw <svg> block", () => {
    const els = parseContent('<svg width="100" height="50"><rect/></svg>');
    const svg = els.find((e) => e.type === "svg");
    expect(svg).toBeDefined();
    expect(svg!.meta?.isRawBackendSvg).toBe(true);
  });

  it("parses a DIFFICULT_WORD comprehension widget", () => {
    const json = JSON.stringify({ word: "photosynthesis", directive_id: "w1", phonetic: "foh" });
    const els = parseContent(`<<DIFFICULT_WORD:${json}>>`);
    const w = els.find((e) => e.type === "comprehension_widget");
    expect(w).toBeDefined();
    expect(w!.content).toBe("photosynthesis");
    expect(w!.meta?.widget_type).toBe("difficult_word");
  });

  it("preserves ordering of interleaved text and directives", () => {
    const els = parseContent('Before <<MATH_WIDGET expression="x+1">> after');
    expect(els[0]).toMatchObject({ type: "text", content: "Before" });
    expect(els[1]).toMatchObject({ type: "widget", content: "x+1" });
    expect(els[2]).toMatchObject({ type: "text", content: "after" });
  });

  it("does not throw on a malformed interactive payload", () => {
    expect(() => parseContent('<<VISUAL type="interactive" label="X">>{bad json<</VISUAL>>')).not.toThrow();
  });
});

describe("normalizeSvg", () => {
  it("converts px width/height to responsive values", () => {
    const out = normalizeSvg('<svg width="300px" height="150px"></svg>');
    expect(out).toContain('width="100%"');
    expect(out).toContain('height="auto"');
  });

  it("injects a viewBox from numeric width/height when missing", () => {
    const out = normalizeSvg('<svg width="200" height="80"></svg>');
    expect(out).toContain('viewBox="0 0 200 80"');
  });
});

describe("generateHistoricalSVG", () => {
  it("emits a rectangle with its label", () => {
    const svg = generateHistoricalSVG("rectangle", { width: 4, height: 2, label: "Box" });
    expect(svg).toContain("<rect");
    expect(svg).toContain("Box");
  });

  it("draws clock hands when hour/minute are provided on a circle", () => {
    const svg = generateHistoricalSVG("circle", { hour: 3, minute: 15 });
    expect(svg).toContain("<line");
    expect(svg).toContain("<circle");
  });

  it("falls back to the learning blueprint for unknown shapes", () => {
    const svg = generateHistoricalSVG("totally-unknown", {});
    expect(svg).toContain("Learning Blueprint");
  });
});
