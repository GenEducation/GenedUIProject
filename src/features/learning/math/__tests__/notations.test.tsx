import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { filterNotations, NOTATIONS } from "../notations";
import { LearnerText } from "../LearnerText";

describe("the / notations menu", () => {
  it("offers every notation for a bare /, and narrows as the student types", () => {
    expect(filterNotations("")).toHaveLength(NOTATIONS.length);
    expect(filterNotations("li")[0].id).toBe("line");
    expect(filterNotations("frac")[0].id).toBe("fraction");
    // Found by what it's for, not only its name.
    expect(filterNotations("geometry").map((n) => n.id)).toEqual(expect.arrayContaining(["line", "ray", "angle"]));
    expect(filterNotations("zzz")).toEqual([]);
    // One letter goes by first letters only, not every name with an l in it.
    expect(filterNotations("l").map((n) => n.id)).toEqual(["line", "segment", "leq"]);
    expect(filterNotations("angle").map((n) => n.id)).toEqual(["angle", "degree", "triangle"]);
  });
});

describe("what the student sent", () => {
  it("draws their $…$ maths, and leaves words (and money) as plain text", () => {
    const { container } = render(<LearnerText text="The line $\overleftrightarrow{AB}$ costs $5" />);
    expect(container.querySelectorAll(".katex")).toHaveLength(1);
    expect(container.textContent).toContain("costs $5");
    expect(render(<LearnerText text="<b>hi</b>" />).container.querySelector("b")).toBeNull();
  });
});
