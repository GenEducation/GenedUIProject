import { describe, it, expect } from "vitest";
import { splitExpressions, contentBounds } from "../desmosPayload";

describe("splitExpressions", () => {
  it("splits the comma-separated list the tutor sends for a counting visual", () => {
    // The real payload behind an empty graph: twenty circles in one string.
    const raw = "(x-2)^2 + (y-2)^2 = 0.1, (x-2)^2 + (y-4)^2 = 0.1, (x-4)^2 + (y-2)^2 = 0.1";

    expect(splitExpressions(raw)).toEqual([
      "(x-2)^2 + (y-2)^2 = 0.1",
      "(x-2)^2 + (y-4)^2 = 0.1",
      "(x-4)^2 + (y-2)^2 = 0.1",
    ]);
  });

  it("keeps a single expression whole", () => {
    expect(splitExpressions("y = x^2 + 1")).toEqual(["y = x^2 + 1"]);
  });

  it("does not split on commas nested inside brackets or braces", () => {
    expect(splitExpressions("\\left[1, 2, 3\\right], y = x")).toEqual(["\\left[1, 2, 3\\right]", "y = x"]);
    expect(splitExpressions("\\{1, 2\\}")).toEqual(["\\{1, 2\\}"]);
  });

  it("splits on latex line breaks", () => {
    expect(splitExpressions("y = x \\\\ y = 2x")).toEqual(["y = x", "y = 2x"]);
  });

  it("drops empty segments from trailing or doubled separators", () => {
    expect(splitExpressions("y = x, , y = 2x,")).toEqual(["y = x", "y = 2x"]);
  });

  it("returns nothing for an empty payload", () => {
    expect(splitExpressions("")).toEqual([]);
    expect(splitExpressions("   ")).toEqual([]);
  });
});

describe("contentBounds", () => {
  it("frames the circles instead of leaving them sub-pixel in a huge viewport", () => {
    const exprs = splitExpressions(
      "(x-2)^2 + (y-2)^2 = 0.1, (x-4.8)^2 + (y-4)^2 = 0.1",
    );

    const bounds = contentBounds(exprs)!;
    expect(bounds).not.toBeNull();

    // Centres span x 2..4.8 and y 2..4 — the view must contain them with room
    // to spare, and must be nowhere near the -300..300 it used to show.
    expect(bounds.left).toBeLessThan(2);
    expect(bounds.right).toBeGreaterThan(4.8);
    expect(bounds.bottom).toBeLessThan(2);
    expect(bounds.top).toBeGreaterThan(4);
    expect(bounds.right - bounds.left).toBeLessThan(20);
  });

  it("reads a plus sign as a negative centre", () => {
    // "(x + 3)" is centred at -3.
    const bounds = contentBounds(["(x+3)^2 + (y+1)^2 = 1"])!;

    expect(bounds.left).toBeLessThan(-3);
    expect(bounds.right).toBeGreaterThan(-3);
    expect(bounds.bottom).toBeLessThan(-1);
    expect(bounds.top).toBeGreaterThan(-1);
  });

  it("pads a single point so it is not flush against the edge", () => {
    const bounds = contentBounds(["(x-5)^2 + (y-5)^2 = 0.1"])!;

    expect(bounds.left).toBeLessThanOrEqual(3.5);
    expect(bounds.right).toBeGreaterThanOrEqual(6.5);
  });

  it("returns null when the expressions are not point-shaped, so the caller uses a default view", () => {
    expect(contentBounds(["y = x^2 + 1"])).toBeNull();
    expect(contentBounds(["(x-2)^2 = 4"])).toBeNull(); // x centres only, no y
    expect(contentBounds([])).toBeNull();
  });
});
