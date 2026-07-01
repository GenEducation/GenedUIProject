import { describe, it, expect } from "vitest";
import { parseContent } from "../parseContent";

describe("parseContent — interactive history rehydration", () => {
  const block = {
    directive_id: "abc-123",
    interactive_type: "selectable_grid",
    interaction_type: "select_cells",
    prompt: "Shade one quarter",
    render: { shape: "grid", rows: 2, cols: 4 },
    interaction: {},
  };
  const content = `Here is an activity.\n\n<<VISUAL type="interactive" label="Fractions">>\n${JSON.stringify(block)}\n<</VISUAL>>\n\n`;

  it("parses the persisted interactive tag into an interactive element", () => {
    const els = parseContent(content);
    const interactive = els.find((e) => e.type === "interactive");
    expect(interactive).toBeTruthy();
    expect(interactive!.meta?.interactive_type).toBe("selectable_grid");
  });

  it("maps prompt → question and preserves directive_id for result lookup", () => {
    const interactive = parseContent(content).find((e) => e.type === "interactive")!;
    expect(interactive.meta?.question).toBe("Shade one quarter");
    expect(interactive.meta?.directive_id).toBe("abc-123");
    expect(interactive.meta?.interaction_type).toBe("select_cells");
  });

  it("marks the block read_only so it renders the past attempt without a Check button", () => {
    const interactive = parseContent(content).find((e) => e.type === "interactive")!;
    expect(interactive.meta?.read_only).toBe(true);
  });

  it("a raw <<math_interactive>> directive emitted as text has no directive_id (ungradable)", () => {
    const raw = `<<math_interactive interactive_type="number_line" prompt="Place 0.5" render="{}" interaction="{}">>`;
    const interactive = parseContent(raw).find((e) => e.type === "interactive");
    expect(interactive).toBeTruthy();
    expect(interactive!.meta?.directive_id).toBeUndefined();
  });
});
