import { describe, it, expect } from "vitest";
import { calculation, evaluateArithmetic, formatResult } from "../arithmetic";

describe("arithmetic", () => {
  it("works out a typed sum", () => {
    expect(calculation("540 * 40")).toBe("21600");
    expect(calculation("2 × (150 + 120)")).toBe("540");
    expect(calculation("10 ÷ 4")).toBe("2.5");
    expect(calculation("1,000 - 1")).toBe("999");
    expect(calculation("540 x 40")).toBe("21600");
    expect(calculation("12 − 5")).toBe("7");
  });

  it("stays quiet for a plain number or something that isn't a sum", () => {
    expect(calculation("21600")).toBeNull();
    expect(calculation("-3")).toBeNull();
    expect(calculation("540 *")).toBeNull();
    expect(calculation("5 / 0")).toBeNull();
    expect(calculation("x + 2")).toBeNull();
    expect(evaluateArithmetic("alert(1)")).toBeNull();
  });
});

describe("a school calculator", () => {
  it("does powers and roots", () => {
    expect(calculation("2^10")).toBe("1024");
    expect(calculation("2**3")).toBe("8");
    expect(calculation("5²")).toBe("25");
    expect(calculation("3³")).toBe("27");
    expect(calculation("√144")).toBe("12");
    expect(calculation("sqrt(2)")).toBe("1.414214");
    expect(calculation("√(9 + 16)")).toBe("5");
    expect(calculation("∛27")).toBe("3");
    expect(calculation("cbrt(-8)")).toBe("-2");
    expect(calculation("2^-1")).toBe("0.5");
    expect(calculation("2^3^2")).toBe("512"); // right to left, like a calculator
  });

  it("follows BODMAS with the new operators", () => {
    expect(calculation("-2²")).toBe("-4");
    expect(calculation("(-2)²")).toBe("4");
    expect(calculation("2 + 3 × 4^2")).toBe("50");
    expect(calculation("√16 + 2 × 3")).toBe("10");
  });

  it("does logs, in base 10 and natural", () => {
    expect(calculation("log 1000")).toBe("3");
    expect(calculation("log(100)")).toBe("2");
    expect(calculation("ln(e)")).toBe("1");
    expect(calculation("ln e^2")).toBe("2");
  });

  it("does trigonometry in degrees, as school does", () => {
    expect(calculation("sin 30")).toBe("0.5");
    expect(calculation("cos(60)")).toBe("0.5");
    expect(calculation("tan 45")).toBe("1");
    expect(calculation("sin(90) + cos(0)")).toBe("2");
  });

  it("knows π and e, and multiplies what's written side by side", () => {
    expect(calculation("π")).toBe("3.141593");
    expect(calculation("2π")).toBe("6.283185");
    expect(calculation("pi * 7^2")).toBe("153.93804");
    expect(calculation("3(4 + 5)")).toBe("27");
    expect(calculation("(1 + 2)(3 + 4)")).toBe("21");
    expect(calculation("2√9")).toBe("6");
  });

  it("does factorials and percentages", () => {
    expect(calculation("5!")).toBe("120");
    expect(calculation("0!")).toBe("1");
    expect(calculation("20% of 150")).toBe("30");
    expect(calculation("15%")).toBe("0.15");
    expect(calculation("50% × 80")).toBe("40");
  });

  it("stays quiet when there's no real answer", () => {
    expect(calculation("√-4")).toBeNull();
    expect(calculation("log 0")).toBeNull();
    expect(calculation("ln(-1)")).toBeNull();
    expect(calculation("tan 90")).toBeNull();
    expect(calculation("2.5!")).toBeNull();
    expect(calculation("(-3)!")).toBeNull();
    expect(calculation("10^400")).toBeNull();
    expect(calculation("1 / (2 - 2)")).toBeNull();
  });

  it("leaves algebra, words and typos alone", () => {
    expect(calculation("2x + 3")).toBeNull();
    expect(calculation("3y")).toBeNull();
    expect(calculation("2 3")).toBeNull();
    expect(calculation("sin")).toBeNull();
    expect(calculation("((2)")).toBeNull();
    expect(calculation("seven + 2")).toBeNull();
  });

  it("shows results as a calculator does", () => {
    expect(calculation("0.1 + 0.2")).toBe("0.3");
    expect(formatResult(-0.0000001)).toBe("0");
    expect(formatResult(2 / 3)).toBe("0.666667");
  });
});
