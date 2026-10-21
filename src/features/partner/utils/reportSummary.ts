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
  single_component_share: () => ({
    text: "GenEd found too few questions it can check, so students could not practise this chapter. Add questions: give the answers of printed ones, write your own, or let AI suggest some.",
    fixedBy: "you",
  }),
  unassessed_component: (n) => ({
    text: `${plural(n, "concept has", "concepts have")} no question to check ${n === 1 ? "it" : "them"}. Add a question for ${n === 1 ? "it" : "each"}.`,
    fixedBy: "you",
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

/** `owners` is the server's word on who fixes each check (`SourceView.outcome.findings`); it outranks the defaults. */
export function summarizeReport(report: string, owners: Record<string, "partner" | "gened"> = {}): ReportSummary {
  const groups = new Map<string, { path: string; detail: string }[]>();
  for (const line of report.split("\n")) {
    const match = line.trim().match(VIOLATION);
    if (!match) continue;
    const [, code, path, detail] = match;
    const list = groups.get(code) ?? [];
    list.push({ path, detail });
    groups.set(code, list);
  }

  const problems = [...groups.entries()].map(([code, lines]) => {
    const problem = { code, count: lines.length, ...(EXPLAIN[code] ?? otherProblem)(lines.length, lines) };
    const owner = owners[code];
    return owner ? { ...problem, fixedBy: owner === "partner" ? ("you" as const) : ("admin" as const) } : problem;
  });
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

// ─────────────────────────────────────────────────────────
// THE REPORT'S SECTIONS, AS STRUCTURED LISTS
// ─────────────────────────────────────────────────────────

/** A concept the run proposed: new to GenEd, or matched to one it has. */
export interface ReportConcept { title: string; definition: string; resolution: string; lo: string | null }
/** A question with its answer, as far as the key can be read. */
export interface ReportQuestion { prompt: string; answer: string | null; note?: string }

export interface ParsedReport {
  /** Pages missing from the run (the reading failed). */
  unreadablePages: number[];
  /** Pages whose text was marked not fully legible: page number and the text read. */
  visualCheck: { page: number; text: string }[];
  concepts: ReportConcept[];
  questions: ReportQuestion[];
  variants: ReportQuestion[];
  removed: ReportQuestion[];
  skipped: { reason: string; prompt: string }[];
  held: string[];
  figures: { role: string; reason: string; target: string }[];
  warnings: number;
  passed: boolean;
}

/** The report's `## ` sections, by heading (lower-cased, without its parenthesised note), as their `- ` lines. */
function sections(report: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  let current = "_head";
  out.set(current, []);
  for (const raw of report.split("\n")) {
    const line = raw.trimEnd();
    const heading = line.match(/^##\s+(.*)$/);
    if (heading) {
      current = heading[1].replace(/\s*\(.*$/, "").trim().toLowerCase();
      out.set(current, []);
      continue;
    }
    if (current === "_head") {
      if (line && !line.startsWith("# ")) out.get(current)!.push(line);
    } else if (line.startsWith("- ")) {
      out.get(current)!.push(line.slice(2));
    }
  }
  return out;
}

/**
 * The answer in a key as the report prints it (`{'kind': 'numeric', 'value': '12', ...}`), as plain text: the
 * key's value, values or accepted answers. Null when it can't be read; the question still shows.
 */
export function answerFromKey(key: string): string | null {
  const list = key.match(/'(?:values|accept|accepted|answers|expected)':\s*\[([^\]]*)\]/);
  if (list) {
    const items = [...list[1].matchAll(/'([^']*)'|(-?\d+(?:\.\d+)?)/g)].map((m) => m[1] ?? m[2]).filter(Boolean);
    if (items.length) return items.join(", ");
  }
  const one = key.match(/'(?:value|expected|answer|text|key)':\s*(?:'([^']*)'|(-?\d+(?:\.\d+)?))/);
  if (one) return one[1] ?? one[2];
  return null;
}

const strip = (s: string) => s.replace(/^`[^`]*`\s*/, "").trim();

export function parseReport(report: string): ParsedReport {
  const s = sections(report);
  // By how the heading starts: the backend adds notes after some ("Held back: waiting for its picture").
  const get = (name: string) => [...s.entries()].find(([heading]) => heading.startsWith(name))?.[1] ?? [];
  const validation = get("validation");
  return {
    unreadablePages: get("pages that could not be read")
      .map((l) => Number(l.match(/page (\d+)/i)?.[1]))
      .filter((n) => Number.isFinite(n)),
    visualCheck: get("pages needing a visual check").flatMap((l) => {
      const m = l.match(/^page (\d+), section [^:]*:\s*(.*)$/);
      return m ? [{ page: Number(m[1]), text: m[2] }] : [];
    }),
    concepts: get("components").flatMap((l) => {
      const m = l.match(/^\[([^\]]+)\]\s+`[^`]*`\s+([^:]+):\s*(.*?)(?:\s*\(LO ([^,)]+)[^)]*\))?$/);
      return m ? [{ resolution: m[1], title: m[2].trim(), definition: m[3].trim(), lo: m[4] ?? null }] : [];
    }),
    questions: get("items").map((l) => {
      const [left, key = ""] = l.split(" -> key ");
      return { prompt: strip(left).replace(/^[a-z_]+:\s*/, ""), answer: answerFromKey(key) };
    }),
    variants: get("number-changed questions").map((l) => {
      const [left, rest = ""] = l.split(" -> key ");
      const [key, of = ""] = rest.split("; number-changed version of: ");
      return { prompt: strip(left), answer: answerFromKey(key), note: of ? `From: ${of}` : undefined };
    }),
    removed: get("keys the independent check did not reproduce").map((l) => {
      const m = l.match(/^override key `[^`]*`:\s*(.*?) -> key (.*?); independent answer (.*)$/);
      return m
        ? { prompt: m[1], answer: answerFromKey(m[2]), note: `The second check got ${m[3]}` }
        : { prompt: l, answer: null };
    }),
    skipped: get("skipped questions").map((l) => {
      const m = l.match(/^section \S+ \[[^\]]*\]\s*([^:]+):\s*(.*)$/);
      return m ? { reason: m[1].replace(/_/g, " "), prompt: m[2] } : { reason: "", prompt: l };
    }),
    held: get("held back").map(strip),
    figures: get("pictures and their visuals")
      .filter((l) => l.startsWith("["))
      .map((l) => {
        const m = l.match(/^\[[^\]]*\]\s*([^:]+):\s*([^;]*);\s*([^;]*(?:;\s*step [^;]*)?)/);
        return m ? { role: m[1].trim(), reason: m[2].trim(), target: m[3].trim() } : { role: "", reason: l, target: "" };
      }),
    warnings: validation.filter((l) => l.startsWith("warning ")).length,
    passed: validation.includes("passed"),
  };
}
