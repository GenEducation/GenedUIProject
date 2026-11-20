import { describe, it, expect } from "vitest";
import { calculation, evaluateArithmetic, numericAnswerToSend } from "../arithmetic";

describe("arithmetic", () => {
  it("works out a typed sum", () => {
    expect(calculation("540 * 40")).toBe("21600");
    expect(calculation("2 × (150 + 120)")).toBe("540");
    expect(calculation("10 ÷ 4")).toBe("2.5");
    expect(calculation("1,000 - 1")).toBe("999");
    expect(calculation("540 x 40")).toBe("21600");
    expect(calculation("12 − 5")).toBe("7");
  });

  // There are no calculator keys: these are worked out only when typed, so they must work as a keyboard spells them.
  it("works out roots, powers, logs, trig and the rest as typed on a keyboard", () => {
    expect(calculation("sqrt(144)")).toBe("12");
    expect(calculation("cbrt(27)")).toBe("3");
    expect(calculation("2^10")).toBe("1024");
    expect(calculation("log 100")).toBe("2");
    expect(calculation("sin 30")).toBe("0.5");
    expect(calculation("5!")).toBe("120");
    expect(calculation("20% of 150")).toBe("30");
    expect(calculation("3(4 + 5)")).toBe("27");
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

describe("numericAnswerToSend", () => {
  it("sends a plain fraction as typed, never as its rounded decimal", () => {
    expect(numericAnswerToSend("1/3", calculation("1/3"))).toBe("1/3");
    expect(numericAnswerToSend(" 2 / 3 ", calculation("2 / 3"))).toBe("2 / 3");
    expect(numericAnswerToSend("1/12", calculation("1/12"))).toBe("1/12");
    expect(numericAnswerToSend("-1/4", calculation("-1/4"))).toBe("-1/4");
  });
  it("still sends a calculation as its result and a plain number as typed", () => {
    expect(numericAnswerToSend("540 * 40", calculation("540 * 40"))).toBe("21600");
    expect(numericAnswerToSend("1/4 + 1/4", calculation("1/4 + 1/4"))).toBe("0.5");
    expect(numericAnswerToSend("21600", calculation("21600"))).toBe("21600");
    expect(numericAnswerToSend("3 1/2", calculation("3 1/2"))).toBe("3 1/2");
  });
});
