import { describe, it, expect } from "vitest";
import { parseReport, summarizeReport } from "../reportSummary";
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

});

describe("who fixes a check", () => {
  const report = "## Validation\n- VIOLATION single_component_share items: share None below 0.7\n- VIOLATION SYNTHETIC_check x: y\n";
  it("tells the partner to add questions when there are too few", () => {
    const [p] = summarizeReport(report).problems;
    expect(p).toMatchObject({ code: "single_component_share", fixedBy: "you" });
    expect(p.text).toMatch(/Add questions/);
  });
  it("takes the server's owner over the default", () => {
    const owners = { single_component_share: "gened", SYNTHETIC_check: "partner" } as const;
    const byCode = Object.fromEntries(summarizeReport(report, owners).problems.map((p) => [p.code, p.fixedBy]));
    expect(byCode).toEqual({ single_component_share: "admin", SYNTHETIC_check: "you" });
  });
});

describe("parseReport", () => {
  // SYNTHETIC: every section the backend writes (gened_ingestion.pipeline.assemble.review_report), placeholder content.
  const FULL = [
    "# Ingestion review: synthetic-source",
    "",
    'Source: SYNTHETIC Book, 2024, chapter 4 "SYNTHETIC" (PDF sha256 abc123...)',
    "Config hash: SYNTHETIC",
    "Model usage: {'calls': 3}",
    "",
    "## Counts",
    "- sections 6, chunks 233, textbook figure groups 20 (redrawn, never published), crops 20",
    "",
    "## Validation",
    "- warning soft_check x: y",
    "- passed",
    "",
    "## Pages that could not be read (missing from this run: check them before accepting the chapter)",
    "- PDF page 14: the reading ran past the output cap",
    "",
    "## Pages needing a visual check (text marked not fully legible)",
    "- page 9, section 4.2: SYNTHETIC smudged line",
    "",
    "## Components",
    "- [novel] `4.1:abc` SYNTHETIC tally marks: Marks grouped in fives to count. (LO G6-LO1, bloom 2, difficulty 1)",
    "",
    "## Items",
    "- `i1` numeric: SYNTHETIC how many? -> key {'kind': 'numeric', 'value': '12', 'tolerance': 0}",
    "- `i2` text_set: SYNTHETIC name two -> key {'kind': 'text_set', 'values': ['red', 'blue']}",
    "",
    "## Number-changed questions (ADR 0012: made by code from a printed question, used only as retry questions)",
    "- `v1` SYNTHETIC how many now? -> key {'kind': 'numeric', 'value': '15'}; number-changed version of: SYNTHETIC how many?",
    "",
    "## Keys the independent check did not reproduce (removed; restore with a key in overrides)",
    "- override key `k1`: SYNTHETIC tricky -> key {'kind': 'numeric', 'value': '7'}; independent answer 8",
    "",
    "## Skipped questions",
    "- section 4.3 [c12] not_machine_scorable: SYNTHETIC explain why",
    "",
    "## Held back: waiting for its picture (published by a later run once a partner accepts its redraws)",
    "- `f9` SYNTHETIC look at the picture",
    "",
    "## Pictures and their visuals",
    "Textbook figures are not published; each non-decorative one is redrawn, and the redraw is linked here.",
    "- counts by role: {'teaching': 1}",
    "- [4.1:2] teaching: shows tallies; redraw linked by text to SYNTHETIC tally marks; step n3; printed []; tutor []",
  ].join("\n");

  it("reads each section into lists a partner can scan", () => {
    const r = parseReport(FULL);
    expect(r.passed).toBe(true);
    expect(r.warnings).toBe(1);
    expect(r.unreadablePages).toEqual([14]);
    expect(r.visualCheck).toEqual([{ page: 9, text: "SYNTHETIC smudged line" }]);
    expect(r.concepts).toEqual([{ resolution: "novel", title: "SYNTHETIC tally marks", definition: "Marks grouped in fives to count.", lo: "G6-LO1" }]);
    expect(r.questions).toEqual([
      { prompt: "SYNTHETIC how many?", answer: "12" },
      { prompt: "SYNTHETIC name two", answer: "red, blue" },
    ]);
    expect(r.variants[0]).toMatchObject({ prompt: "SYNTHETIC how many now?", answer: "15", note: "From: SYNTHETIC how many?" });
    expect(r.removed[0]).toMatchObject({ prompt: "SYNTHETIC tricky", answer: "7", note: "The second check got 8" });
    expect(r.skipped).toEqual([{ reason: "not machine scorable", prompt: "SYNTHETIC explain why" }]);
    expect(r.held).toEqual(["SYNTHETIC look at the picture"]);
    expect(r.figures[0]).toMatchObject({ role: "teaching", reason: "shows tallies" });
  });
});
