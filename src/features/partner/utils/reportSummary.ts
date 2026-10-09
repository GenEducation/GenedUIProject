/**
 * A partner-readable summary of an ingestion review report (the Markdown from
 * `GET /v1/sources/{id}/report`).
 *
 * The report is written for operators: one `- VIOLATION <code> <path>: <detail>`
 * line per problem, often dozens of identical ones, plus CLI hints and model
 * usage. This groups the violations by code, counts them, and explains the
 * ones a partner can understand or act on. Everything else is still listed,
 * by code, for an admin. The full report stays one click away.
 */

export type FixedBy = "you" | "admin";

export interface ReportProblem {
  code: string;
  count: number;
  /** One plain sentence. */
  text: string;
  fixedBy: FixedBy;
  /** Learning-outcome codes named by `plan_lo_uncovered`, when that is the problem. */
  outcomes?: string[];
}

export interface ReportSummary {
  problems: ReportProblem[];
  /** Headline numbers from the report's Counts section, when present. */
  counts: { sections?: number; concepts?: number; questions?: number; steps?: number };
}

const VIOLATION = /^- VIOLATION (\S+) ([^:]*):\s*(.*)$/;

type Explainer = (count: number, lines: { path: string; detail: string }[]) => Omit<ReportProblem, "code" | "count">;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const EXPLAIN: Record<string, Explainer> = {
  plan_lo_uncovered: (_n, lines) => {
    const outcomes = [...new Set(lines.map((l) => l.detail.split(" ")[0]).filter(Boolean))];
    return {
      text:
        `${outcomes.length === 1 ? "A learning outcome you chose isn't" : "Learning outcomes you chose aren't"} taught by ` +
        `any concept in this chapter: ${outcomes.join(", ")}. Upload the chapter again without ` +
        `${outcomes.length === 1 ? "it" : "them"}, or check the page range covers where ${outcomes.length === 1 ? "it is" : "they are"} taught.`,
      fixedBy: "you",
      outcomes,
    };
  },
  lo_coverage_scope: () => ({
    text: "The coverage marked for a learning outcome doesn't match the outcomes chosen. Upload again with the outcomes you mean.",
    fixedBy: "you",
  }),
  page_range: () => ({
    text: "The page range doesn't match the chapter. Upload again with the first and last page of the chapter itself.",
    fixedBy: "you",
  }),
  manifest_chapter_coverage: () => ({
    text: "The pages don't cover the chapter as expected. Check the page range includes the whole chapter and nothing else.",
    fixedBy: "you",
  }),
  section_order: () => ({
    text: "The chapter's sections came out of order. Check the page range holds one chapter, without an answer key or another chapter.",
    fixedBy: "you",
  }),
  figure_group_unresolved: (n) => ({
    text: `${plural(n, "textbook figure needs", "textbook figures need")} to be linked to the concept ${n === 1 ? "it teaches" : "they teach"}. An admin confirms these links before the chapter can be published.`,
    fixedBy: "admin",
  }),
  item_picture_unlinked: (n) => ({
    text: `${plural(n, "question refers", "questions refer")} to a picture that isn't linked to ${n === 1 ? "it" : "them"} yet. An admin links them.`,
    fixedBy: "admin",
  }),
  unassessed_component: (n) => ({
    text: `${plural(n, "concept has", "concepts have")} no practice question to check it. An admin adds questions or adjusts the plan.`,
    fixedBy: "admin",
  }),
};

const otherProblem: Explainer = (n, lines) => ({
  text: `${plural(n, "other check", "other checks")} failed (${lines[0]?.detail || "see the full report"}). An admin reviews these.`,
  fixedBy: "admin",
});

function countAfter(report: string, label: string): number | undefined {
  const match = report.match(new RegExp(`\\b${label} (\\d+)`));
  return match ? Number(match[1]) : undefined;
}

export function summarizeReport(report: string): ReportSummary {
  const groups = new Map<string, { path: string; detail: string }[]>();
  for (const line of report.split("\n")) {
    const match = line.trim().match(VIOLATION);
    if (!match) continue;
    const [, code, path, detail] = match;
    const list = groups.get(code) ?? [];
    list.push({ path, detail });
    groups.set(code, list);
  }

  const problems = [...groups.entries()].map(([code, lines]) => ({
    code,
    count: lines.length,
    ...(EXPLAIN[code] ?? otherProblem)(lines.length, lines),
  }));
  // What the partner can fix first, then the biggest groups.
  problems.sort((a, b) => (a.fixedBy === b.fixedBy ? b.count - a.count : a.fixedBy === "you" ? -1 : 1));

  return {
    problems,
    counts: {
      sections: countAfter(report, "sections"),
      concepts: countAfter(report, "components"),
      questions: countAfter(report, "items"),
      steps: countAfter(report, "nodes"),
    },
  };
}
