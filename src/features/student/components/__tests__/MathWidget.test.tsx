import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { MathWidget } from "../MathWidget";

const COUNTING_PAYLOAD =
  "(x-2)^2 + (y-2)^2 = 0.1, (x-2)^2 + (y-4)^2 = 0.1, (x-4)^2 + (y-2)^2 = 0.1";

function srcDocOf(expression: string): string {
  const { container } = render(<MathWidget expression={expression} minimal />);
  const iframe = container.querySelector("iframe");
  expect(iframe).not.toBeNull();
  return iframe!.getAttribute("srcdoc") ?? "";
}

function scriptBodyOf(html: string): string {
  // The inline harness is the last <script> in the document.
  const bodies = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  expect(bodies.length).toBeGreaterThan(0);
  return bodies[bodies.length - 1];
}

describe("MathWidget — Desmos harness", () => {
  it("emits a syntactically valid script", () => {
    // The harness is built by stringifying functions into a template literal,
    // which is exactly the kind of thing that breaks silently on an escaping
    // slip. Compiling it here catches that; the graph failing to parse in a
    // sandboxed iframe would otherwise be invisible.
    const body = scriptBodyOf(srcDocOf(COUNTING_PAYLOAD));
    expect(() => new Function(body)).not.toThrow();
  });

  it("injects the payload splitter and the viewport fitter", () => {
    const body = scriptBodyOf(srcDocOf(COUNTING_PAYLOAD));

    expect(body).toContain("var splitExpressions =");
    expect(body).toContain("var contentBounds =");
    // Each expression is set individually — a single setExpression call with
    // the whole comma-separated list is what silently drew nothing.
    expect(body).toContain("calculator.setExpression({ id: 'expr-' + i, latex: latex })");
    expect(body).toContain("calculator.setMathBounds");
  });

  it("does not gate the graph behind expressionAnalysis", () => {
    // Measured against the live API: expressionAnalysis stays empty and its
    // observer never fires, so treating it as a validity signal replaced
    // working graphs with an error card seconds after they had drawn.
    const body = scriptBodyOf(srcDocOf(COUNTING_PAYLOAD));

    // Comments stripped first — the harness explains in prose why this API is
    // avoided, and that explanation must not trip the assertion.
    const code = body.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

    expect(code).not.toContain("expressionAnalysis");
    expect(code).not.toContain("observe(");
    expect(code).not.toContain("isValid");
    // No delayed verdict at all — success is reported once expressions are set.
    expect(code).not.toContain("setTimeout");
  });

  it("carries the raw payload through to the frame", () => {
    const body = scriptBodyOf(srcDocOf(COUNTING_PAYLOAD));
    expect(body).toContain(JSON.stringify(COUNTING_PAYLOAD));
  });

  it("escapes a payload that would otherwise break out of the script", () => {
    const nasty = 'y = x </script><script>window.pwned = 1;</script>';
    const html = srcDocOf(nasty);

    // Only a closing tag can terminate the script early, and JSON.stringify
    // does not escape it — so the payload's "</script>" must arrive escaped,
    // leaving exactly the one real closing tag that ends the harness.
    expect(html).toContain(String.raw`<\/script>`);
    expect(html.match(/<\/script>/g) ?? []).toHaveLength(1);

    // And the injected code must still be one intact, parseable script.
    expect(() => new Function(scriptBodyOf(html))).not.toThrow();
  });

  it("shows a readable message instead of an empty grid when the backend flags an error", () => {
    render(<MathWidget expression="y = x" meta={{ error: true, message: "Bad expression" }} />);

    expect(screen.getByText(/interactive graph unavailable/i)).toBeInTheDocument();
    expect(screen.getByText("Bad expression")).toBeInTheDocument();
  });
});
