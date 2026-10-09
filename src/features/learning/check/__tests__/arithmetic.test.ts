import { describe, it, expect } from "vitest";
import { calculation, evaluateArithmetic } from "../arithmetic";

describe("arithmetic", () => {
  it("works out a typed sum", () => {
    expect(calculation("540 * 40")).toBe("21600");
    expect(calculation("2 × (150 + 120)")).toBe("540");
    expect(calculation("10 ÷ 4")).toBe("2.5");
    expect(calculation("1,000 - 1")).toBe("999");
  });

  it("stays quiet for a plain number or something that isn't a sum", () => {
    expect(calculation("21600")).toBeNull();
    expect(calculation("540 *")).toBeNull();
    expect(calculation("5 / 0")).toBeNull();
    expect(calculation("x + 2")).toBeNull();
    expect(evaluateArithmetic("alert(1)")).toBeNull();
  });
});
