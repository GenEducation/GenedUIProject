import { describe, it, expect } from "vitest";
import type { ReleaseProposal } from "../../types/sources";
import { answerOf, buildLookup, namesFor } from "../releaseDetails";

const p = (kind: string, content: Record<string, unknown>): ReleaseProposal =>
  ({ id: kind, kind, target_id: null, state: "pending", content_hash: "h", content }) as ReleaseProposal;

describe("release details in words", () => {
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
});
