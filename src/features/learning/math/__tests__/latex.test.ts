import { describe, it, expect } from "vitest";
import { answerFromField, answerFromLatex, calcTextFromField, calcTextFromLatex, chatTextFromLatex, latexFromChatText, splitMath } from "../latex";

describe("answers for the checker (numbers, letters, + - * / ^ and brackets; no implied multiplication)", () => {
  it.each([
    ["2x+1", "2*x+1"],
    ["\\frac{3}{4}", "3/4"],
    ["\\frac{x+1}{2}", "(x+1)/2"],
    ["2\\frac{1}{2}", "2+1/2"],
    ["2\\frac{1}{2}x", "(2+1/2)*x"],
    ["x^{2}+2x", "x^2+2*x"],
    ["(a+b)(a-b)", "(a+b)*(a-b)"],
    ["3\\times4\\div2", "3*4/2"],
    ["\\left(x+1\\right)^2", "(x+1)^2"],
    ["xy", "x*y"],
    ["2, 3, 5", "2,3,5"],
  ])("%s → %s", (latex, answer) => expect(answerFromLatex(latex)).toBe(answer));

  it("gives up on what the checker can't read, so it is sent unchanged", () => {
    expect(answerFromLatex("\\sqrt{2}")).toBeNull();
    expect(answerFromLatex("\\pi r^2")).toBeNull();
  });
});

describe("a maths lesson's answer box (typed like any text box, maths from the / menu)", () => {
  it("sends what was typed as typed, and the picked maths in the checker's form", () => {
    expect(answerFromField("30, 20, 10")).toBe("30, 20, 10");
    expect(answerFromField("seven apples")).toBe("seven apples");
    expect(answerFromField("$\\frac{3}{4}$")).toBe("3/4");
    expect(answerFromField("x = $ 2\\frac{1}{2} $")).toBe("x = 2+1/2");
    expect(calcTextFromField("$\\sqrt{144}$")).toBe("sqrt(144)");
  });
});

describe("chat messages", () => {
  it("keeps words as words and maths as $…$, from MathLive's text-first value", () => {
    expect(chatTextFromLatex("The line $ \\overleftrightarrow{AB} $ goes on forever")).toBe(
      "The line $\\overleftrightarrow{AB}$ goes on forever",
    );
    expect(chatTextFromLatex("just words, 100\\% sure, \\$5")).toBe("just words, 100% sure, $5");
    expect(chatTextFromLatex("\\text{The line }\\overleftrightarrow{AB}")).toBe("The line \\overleftrightarrow{AB}");
  });

  it("round-trips a message through the maths field", () => {
    const msg = "Is $\\frac{1}{2}$ bigger than 40% of $x$?";
    expect(chatTextFromLatex(latexFromChatText(msg))).toBe(msg);
  });

  it("finds the maths in a message, leaving a lone dollar sign alone", () => {
    expect(splitMath("I paid $5 for $\\frac{1}{2}$ kg")).toEqual([
      { math: false, value: "I paid $5 for " },
      { math: true, value: "\\frac{1}{2}" },
      { math: false, value: " kg" },
    ]);
  });
});

describe("the answer box's calculator reads the field's maths", () => {
  it.each([
    ["\\sqrt{144}", "sqrt(144)"],
    ["\\frac{3}{4}", "((3)/(4))"],
    ["2^{10}", "2^(10)"],
    ["\\pi\\times2", "pi*2"],
  ])("%s → %s", (latex, calc) => expect(calcTextFromLatex(latex)).toBe(calc));
});
