import { describe, it, expect } from "vitest";
import type { ReleaseProposal } from "../../types/sources";
import { answerOf, buildLookup, difficultyLabel, humanize, namesFor, thinkingLevel, valueOf } from "../releaseDetails";
import { summarize } from "../releaseSummary";

const p = (kind: string, content: Record<string, unknown>): ReleaseProposal =>
  ({ id: kind, kind, target_id: null, state: "pending", content_hash: "h", content }) as ReleaseProposal;

describe("release details in words", () => {
  it("reads a record bound to the release, or a bare one", () => {
    const wrapped = p("component", { artifact_hash: "a", value: { title: "SYNTHETIC concept", definition: "SYNTHETIC def." } });
    expect(valueOf(wrapped)).toMatchObject({ title: "SYNTHETIC concept" });
    expect(summarize(wrapped)).toEqual({ title: "SYNTHETIC concept", detail: "SYNTHETIC def." });
    expect(valueOf(p("component", { title: "SYNTHETIC bare" }))).toMatchObject({ title: "SYNTHETIC bare" });
  });

  it("names the ids records point at, counting any published elsewhere", () => {
    const lookup = buildLookup([
      p("component", { value: { id: "c1", title: "SYNTHETIC concept" } }),
      p("source_section", { value: { version_id: "s1", title: "SYNTHETIC section" } }),
      p("asset", { value: { figure_group_id: "f1", learner_alt_text: "SYNTHETIC picture" } }),
    ]);
    expect(namesFor(["c1", "c9"], lookup.concept)).toEqual({ named: ["SYNTHETIC concept"], unnamed: 1 });
    expect(lookup.section.get("s1")).toBe("SYNTHETIC section");
    expect(lookup.figureImages.get("f1")).toEqual(["SYNTHETIC picture"]);
  });

  it("puts each kind of answer in words", () => {
    const none = new Map<string, string>();
    expect(answerOf({ kind: "numeric", expected: "42", abs_tolerance: "0.5" }, none)).toEqual({ label: "Answer", values: ["42 (± 0.5)"] });
    expect(answerOf({ kind: "numeric", expected: "7" }, none)?.values).toEqual(["7"]);
    expect(answerOf({ kind: "numeric_set", expected: ["2", "3"] }, none)).toEqual({ label: "Answers (any order)", values: ["2", "3"] });
    expect(answerOf({ kind: "symbolic", expected: "2*x+1" }, none)?.label).toBe("Answer (any equivalent form)");
    expect(answerOf({ kind: "string_set", accepted: ["seven", "7"] }, none)?.values).toEqual(["seven", "7"]);
    expect(answerOf({ kind: "mcq", correct_option_id: "o2" }, new Map([["o2", "SYNTHETIC b"]]))).toEqual({ label: "Correct option", values: ["SYNTHETIC b"] });
    expect(answerOf({ kind: "sequence", expected_order: ["one", { text: "two" }] }, none)?.values).toEqual(["one", "two"]);
    expect(answerOf({ kind: "matching", pairs: [{ left: "a", right: "b" }] }, none)?.values).toEqual(["a → b"]);
    expect(answerOf({ kind: "judge", rubric_id: "r" }, none)?.values[0]).toMatch(/tutor/);
    expect(answerOf({ kind: "unknown" }, none)).toBeNull();
  });

  it("speaks a teacher's language for levels and codes", () => {
    expect(thinkingLevel(1)).toBe("Remember");
    expect(thinkingLevel(6)).toBe("Create");
    expect(thinkingLevel(9)).toBeNull();
    expect(difficultyLabel(0.2)?.label).toBe("Easy");
    expect(difficultyLabel(0.5)?.label).toBe("Medium");
    expect(difficultyLabel(0.8)?.label).toBe("Hard");
    expect(humanize("math_numbers")).toBe("Math numbers");
  });
});
