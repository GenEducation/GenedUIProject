import { describe, it, expect } from "vitest";
import { stepped, ticks, toNumber, valueText } from "../check/lineMath";

describe("line math", () => {
  it("reads the payload's number grammar", () => {
    expect(toNumber("12")).toBe(12);
    expect(toNumber("-0.5")).toBe(-0.5);
    expect(toNumber("3/4")).toBe(0.75);
    expect(toNumber("-1 / 4")).toBe(-0.25);
    expect(toNumber("abc")).toBeNaN();
  });

  it("writes a value with no float noise and no trailing zeros", () => {
    expect(valueText(0.1 + 0.2)).toBe("0.3");
    expect(valueText(7)).toBe("7");
    expect(valueText(0.125)).toBe("0.125");
  });

  it("steps along the grid from the minimum and stays on the line", () => {
    expect(stepped(3, 1, 0, 10, 1)).toBe(4);
    expect(stepped(10, 1, 0, 10, 1)).toBe(10);
    expect(stepped(0, -1, 0, 10, 1)).toBe(0);
    expect(stepped(0.5, 1, 0, 1, 0.25)).toBe(0.75);
    expect(stepped(-1, 1, 0, 10, 1)).toBe(0); // from "not placed", the first press lands on the end
  });

  it("labels at most about eleven ticks and always both ends", () => {
    const t = ticks(0, 100, 1);
    expect(t[0]).toBe(0);
    expect(t[t.length - 1]).toBe(100);
    expect(t.length).toBeLessThanOrEqual(12);
    expect(ticks(0, 4, 1)).toEqual([0, 1, 2, 3, 4]);
  });
});
