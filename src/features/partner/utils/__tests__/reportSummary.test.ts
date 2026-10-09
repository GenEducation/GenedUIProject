import { describe, it, expect } from "vitest";
import { summarizeReport } from "../reportSummary";
import { SYNTHETIC_REPORT } from "@/test/syntheticReport";

describe("summarizeReport", () => {
  it("groups violations, says who fixes each, and puts the partner's fixes first", () => {
    const { problems } = summarizeReport(SYNTHETIC_REPORT);
    expect(problems.map((p) => [p.code, p.count, p.fixedBy])).toEqual([
      ["plan_lo_uncovered", 1, "you"],
      ["figure_group_unresolved", 3, "admin"],
      ["node_checks", 1, "admin"],
    ]);
    expect(problems[0].outcomes).toEqual(["G6-MATH-LO1.2.1"]);
    expect(problems[0].text).toMatch(/isn't taught by any concept in this chapter: G6-MATH-LO1\.2\.1/);
    expect(problems[1].text).toMatch(/^3 textbook figures need to be linked/);
    expect(problems[2].text).toMatch(/1 other check failed \(SYNTHETIC structural detail\)/);
  });

  it("reads the headline counts", () => {
    expect(summarizeReport(SYNTHETIC_REPORT).counts).toEqual({ sections: 4, concepts: 8, questions: 14, steps: 15 });
  });

  it("has nothing to fix for a report without violations", () => {
    expect(summarizeReport("# Ingestion review\n\n## Validation\n- passed").problems).toEqual([]);
  });
});
