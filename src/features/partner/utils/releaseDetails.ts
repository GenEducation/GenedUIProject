import type { ReleaseProposal } from "../types/sources";

/**
 * Reading a release proposal's content for people. The backend binds each proposal's record to the release as
 * `{ artifact_hash, value }` (gened_curriculum.catalog.review); `value` is the record itself: a concept, a
 * question, a lesson step… (gened_curriculum.bundle). Records refer to each other by id, so a lookup built from
 * the whole release turns those ids back into names.
 */

export type Rec = Record<string, unknown>;

/** The proposal's record: `content.value` when bound to a release, else the content itself. */
export function valueOf(p: ReleaseProposal): Rec {
  const c = p.content ?? {};
  const v = (c as Rec).value;
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : (c as Rec);
}

export const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
export const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
export const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const ids = (v: unknown): string[] => list(v).filter((x): x is string => typeof x === "string");

/** Names for the ids a release's records point at. */
export interface ReleaseLookup {
  concept: Map<string, string>;
  question: Map<string, string>;
  step: Map<string, string>;
  /** By section version id (what other records point at). */
  section: Map<string, string>;
  mistake: Map<string, string>;
  tool: Map<string, string>;
  /** A figure group's images: what each shows. */
  figureImages: Map<string, string[]>;
}

export function buildLookup(proposals: ReleaseProposal[]): ReleaseLookup {
  const lookup: ReleaseLookup = {
    concept: new Map(), question: new Map(), step: new Map(), section: new Map(),
    mistake: new Map(), tool: new Map(), figureImages: new Map(),
  };
  for (const p of proposals) {
    const v = valueOf(p);
    const id = str(v.id);
    switch (p.kind.split(":")[0]) {
      case "component":
        if (id) lookup.concept.set(id, str(v.title) ?? "Concept");
        break;
      case "item":
        if (id) lookup.question.set(id, str(v.prompt) ?? "Question");
        break;
      case "lesson_node":
        if (id) lookup.step.set(id, str(v.title) ?? "Lesson step");
        break;
      case "source_section": {
        const vid = str(v.version_id);
        if (vid) lookup.section.set(vid, str(v.title) ?? "Section");
        break;
      }
      case "misconception":
        if (id) lookup.mistake.set(id, str(v.definition) ?? humanize(str(v.code) ?? "Mistake"));
        break;
      case "tool":
        if (id) lookup.tool.set(id, toolName(str(v.code)));
        break;
      case "asset": {
        const group = str(v.figure_group_id);
        const what = str(v.learner_alt_text) ?? str(v.printed_text);
        if (group && what) lookup.figureImages.set(group, [...(lookup.figureImages.get(group) ?? []), what]);
        break;
      }
    }
  }
  return lookup;
}

/** Names for ids, keeping a count for any the release doesn't include. */
export function namesFor(idList: string[], names: Map<string, string>): { named: string[]; unnamed: number } {
  const named: string[] = [];
  let unnamed = 0;
  for (const id of idList) {
    const n = names.get(id);
    if (n) named.push(n);
    else unnamed += 1;
  }
  return { named, unnamed };
}

/** `math_numbers` → "Math numbers", `number_line` → "Number line". */
export function humanize(code: string): string {
  const s = code.replace(/[_-]+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : code;
}

const TOOLS: Record<string, string> = {
  area_model: "Area model",
  fraction_comparison: "Fraction comparison",
  number_line: "Number line",
};
export const toolName = (code: string | null) => (code ? TOOLS[code] ?? humanize(code) : "Tool");

/** Bloom's level 1–6, as a thinking level a teacher recognises. */
const BLOOM = ["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"];
export function thinkingLevel(bloom: unknown): string | null {
  const b = num(bloom);
  return b !== null && b >= 1 && b <= 6 ? BLOOM[Math.round(b) - 1] : null;
}

/** A 0–1 difficulty in words. */
export function difficultyLabel(d: unknown): { label: string; value: number } | null {
  const v = num(d);
  if (v === null) return null;
  const clamped = Math.max(0, Math.min(1, v));
  return { label: clamped < 0.34 ? "Easy" : clamped < 0.67 ? "Medium" : "Hard", value: clamped };
}

export const STEP_TYPES: Record<string, string> = { teach: "Teach", practice: "Practice", assess: "Assess" };

export const FIGURE_ROLES: Record<string, string> = {
  question: "Part of a question",
  teaching: "Used while teaching",
  exercise: "In an exercise",
  reference: "For reference",
  decorative: "Decoration only",
};

export const RECOVERY_ROLES: Record<string, string> = {
  diagnostic: "Checks for the gap",
  remedial: "Reteaches it",
  retry: "A second try",
};

export const SECTION_RELATIONS: Record<string, string> = { teaches: "teaches", practises: "practises", assumes: "assumes" };

/**
 * A question's expected answer, in words. `options` maps option id → text for multiple choice. Null when the
 * rule is one a person marks (a rubric) or isn't recognised.
 */
export function answerOf(rule: unknown, options: Map<string, string>): { label: string; values: string[] } | null {
  if (!rule || typeof rule !== "object") return null;
  const r = rule as Rec;
  switch (str(r.kind)) {
    case "numeric": {
      const expected = str(r.expected);
      if (!expected) return null;
      const abs = str(r.abs_tolerance);
      const rel = str(r.rel_tolerance);
      const tol = abs && abs !== "0" ? ` (± ${abs})` : rel && rel !== "0" ? ` (± ${Number(rel) * 100}%)` : "";
      return { label: "Answer", values: [`${expected}${tol}`] };
    }
    case "numeric_set":
      return { label: "Answers (any order)", values: ids(r.expected) };
    case "symbolic": {
      const expected = str(r.expected);
      return expected ? { label: "Answer (any equivalent form)", values: [expected] } : null;
    }
    case "string_set":
      return { label: "Accepted answers", values: ids(r.accepted) };
    case "mcq": {
      const correct = [str(r.correct_option_id), ...ids(r.correct_option_ids)].filter((x): x is string => !!x);
      return { label: correct.length > 1 ? "Correct options" : "Correct option", values: correct.map((id) => options.get(id) ?? "—") };
    }
    case "sequence":
      return { label: "Correct order", values: list(r.expected_order).map(entryText) };
    case "matching":
      return {
        label: "Correct pairs",
        values: list(r.pairs).map((pair) => `${entryText((pair as Rec)?.left)} → ${entryText((pair as Rec)?.right)}`),
      };
    case "judge":
      return { label: "Marked by", values: ["The tutor, against a marking guide"] };
    default:
      return null;
  }
}

function entryText(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") return str((e as Rec).text) ?? str((e as Rec).label) ?? str((e as Rec).value) ?? "—";
  return "—";
}

/** The correct option ids of a multiple-choice rule. */
export function correctOptionIds(rule: unknown): Set<string> {
  if (!rule || typeof rule !== "object") return new Set();
  const r = rule as Rec;
  return new Set([str(r.correct_option_id), ...ids(r.correct_option_ids)].filter((x): x is string => !!x));
}
