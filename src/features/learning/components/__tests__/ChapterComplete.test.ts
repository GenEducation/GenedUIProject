import { describe, it, expect } from "vitest";
import { mood } from "../ChapterComplete";

const report = (answered: number, correct: number) =>
  ({ answers: { answered, correct }, outcomes: [], keep_practising: [], nodes_done: 6, nodes_total: 6 }) as never;

describe("chapter-complete headline", () => {
  it("praises the effort at every level, never grades it", () => {
    expect(mood(report(0, 0)).title).toBe("Chapter done!");
    expect(mood(report(20, 18)).title).toBe("Brilliant work!");
    expect(mood(report(24, 17)).title).toBe("Well done, you did it!");
    expect(mood(report(10, 3)).title).toBe("You made it to the end!");
  });
});
