/**
 * Pure helpers behind the parent's subject page: turn the analytics API rows
 * into the plain-language pieces a parent reads (skill areas grouped by how
 * they're going, an overall trend, the skills that moved most, chapter rows,
 * a few ways to help). Scores are 0–100 throughout; the API sends 0–1.
 */
import type { ChapterMastery } from "@/features/student/services/studentService";
import type {
  OverallHistoryPoint,
  SkillProgressionEntry,
  SkillTreeConceptGroup,
} from "@/store/useAnalyticsStore";
import { bandFor } from "@/components/report-card/utils";
import type { MasteryBand } from "@/components/report-card/subjectVisuals";

export type Band = Exclude<MasteryBand, "Not started">;

/** The report-card scale, low to high, as [band, from, to). */
export const BAND_SCALE: { band: Band; from: number; to: number }[] = [
  { band: "Developing", from: 0, to: 40 },
  { band: "Approaching", from: 40, to: 60 },
  { band: "Proficient", from: 60, to: 80 },
  { band: "Advanced", from: 80, to: 100 },
];

export const bandOf = (score: number): Band => bandFor(score) as Band;

/** "your child" → "Your child" at the start of a sentence. */
export const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** 0–1 API mastery → 0–100, clamped; null when missing or not a number. */
export function toPct(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n * 100)));
}

// ── Skill areas ────────────────────────────────────────────────────────────

export interface ObjectiveInsight {
  name: string;
  score: number | null;
  assessments: number;
  why: string | null;
}

export interface ConceptInsight {
  id: string;
  name: string;
  /** Average of its assessed objectives. */
  score: number | null;
  objectives: ObjectiveInsight[];
}

export interface SkillArea {
  id: string;
  name: string;
  score: number;
  assessments: number;
  /** False when nothing in the area has been checked yet. */
  assessed: boolean;
  concepts: ConceptInsight[];
}

const average = (values: number[]) =>
  values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;

/**
 * One row per concept group, strongest first. Scores come from `cg-scores`
 * where present (the server's own average), else the skill tree's; the tree
 * supplies the concepts and objectives underneath.
 */
export function buildSkillAreas(
  cgScores: { cg_id: string; cg_name?: string; avg_mastery?: number }[],
  tree: SkillTreeConceptGroup[],
): SkillArea[] {
  const byId = new Map<string, SkillArea>();

  for (const group of tree) {
    const concepts: ConceptInsight[] = (group.concepts ?? []).map((c) => {
      const objectives: ObjectiveInsight[] = (c.los ?? []).map((lo, i) => ({
        name: lo.skill_name?.trim() || `Objective ${i + 1}`,
        score: toPct(lo.mastery_level),
        assessments: Number(lo.assessment_count) || 0,
        why: lo.justification?.trim() || null,
      }));
      const scored = objectives.filter((o) => o.assessments > 0 || (o.score ?? 0) > 0);
      return {
        id: c.c_id,
        name: c.c_name?.trim() || "Concept",
        score: average(scored.map((o) => o.score ?? 0)),
        objectives,
      };
    });
    const assessments = concepts.reduce(
      (sum, c) => sum + c.objectives.reduce((s, o) => s + o.assessments, 0),
      0,
    );
    const score = toPct(group.avg_mastery) ?? 0;
    byId.set(group.cg_id, {
      id: group.cg_id,
      name: group.cg_name?.trim() || "Skill area",
      score,
      assessments,
      assessed: assessments > 0 || score > 0,
      concepts,
    });
  }

  for (const cg of cgScores) {
    const score = toPct(cg.avg_mastery);
    const existing = byId.get(cg.cg_id);
    if (existing) {
      if (score !== null) {
        existing.score = score;
        existing.assessed = existing.assessed || score > 0;
      }
      if (cg.cg_name?.trim()) existing.name = cg.cg_name.trim();
    } else {
      byId.set(cg.cg_id, {
        id: cg.cg_id,
        name: cg.cg_name?.trim() || "Skill area",
        score: score ?? 0,
        assessments: 0,
        assessed: (score ?? 0) > 0,
        concepts: [],
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export type Bucket = "strengths" | "building" | "attention";

export function bucketFor(score: number): Bucket {
  if (score >= 60) return "strengths";
  if (score >= 40) return "building";
  return "attention";
}

/** Assessed areas split by how they're going; unassessed ones on their own. */
export function groupAreas(areas: SkillArea[]): Record<Bucket, SkillArea[]> & { notYet: SkillArea[] } {
  const groups = { strengths: [], building: [], attention: [], notYet: [] } as Record<Bucket, SkillArea[]> & {
    notYet: SkillArea[];
  };
  for (const area of areas) {
    if (!area.assessed) groups.notYet.push(area);
    else groups[bucketFor(area.score)].push(area);
  }
  return groups;
}

// ── Plain-language summary ─────────────────────────────────────────────────

/** A sentence as runs of text; `em` runs are the names worth highlighting. */
export type Phrase = { text: string; em?: boolean }[];

const BAND_PHRASE: Record<Band, string> = {
  Advanced: "doing excellently",
  Proficient: "doing well",
  Approaching: "getting there",
  Developing: "still building the basics",
};

export function summarySentence(
  childName: string,
  subject: string,
  mastery: number | null,
  areas: SkillArea[],
): Phrase {
  const assessed = areas.filter((a) => a.assessed);
  if (mastery === null && assessed.length === 0) {
    return [
      { text: `${cap(childName)} hasn't been assessed in ` },
      { text: subject, em: true },
      { text: " yet. Scores appear here after the first few lessons." },
    ];
  }
  const parts: Phrase = [];
  if (mastery !== null) {
    parts.push({ text: `${cap(childName)} is ${BAND_PHRASE[bandOf(mastery)]} in ` }, { text: subject, em: true }, { text: "." });
  } else {
    parts.push({ text: `Here's how ${childName} is doing in ` }, { text: subject, em: true }, { text: "." });
  }
  const best = assessed[0];
  const worst = assessed[assessed.length - 1];
  if (best && best.score >= 60) {
    parts.push({ text: " Strongest in " }, { text: best.name, em: true });
    if (worst && worst !== best && worst.score < 60) {
      parts.push({ text: ", while " }, { text: worst.name, em: true }, { text: " needs more practice." });
    } else {
      parts.push({ text: "." });
    }
  } else if (worst && worst.score < 60) {
    parts.push({ text: " Most room to grow in " }, { text: worst.name, em: true }, { text: "." });
  }
  return parts;
}

// ── Progress over time ─────────────────────────────────────────────────────

export interface TrendPoint {
  t: number;
  score: number;
}

/** Overall score per check-in, oldest first; unparseable rows dropped. */
export function overallTrend(history: OverallHistoryPoint[]): TrendPoint[] {
  return history
    .map((h) => ({ t: Date.parse(h.recorded_at), score: toPct(h.overall_score) }))
    .filter((p): p is TrendPoint => Number.isFinite(p.t) && p.score !== null)
    .sort((a, b) => a.t - b.t);
}

/** Change from the first check-in to the latest; null with fewer than two. */
export function trendDelta(points: TrendPoint[]): { delta: number; since: number } | null {
  if (points.length < 2) return null;
  return { delta: points[points.length - 1].score - points[0].score, since: points[0].t };
}

export interface Mover {
  id: string;
  name: string;
  first: number;
  latest: number;
  delta: number;
  points: TrendPoint[];
}

/**
 * Each skill's journey, biggest change first. A skill checked only once has
 * no change yet; those follow, highest score first.
 */
export function movers(progression: SkillProgressionEntry[]): Mover[] {
  const rows: Mover[] = [];
  for (const entry of progression) {
    const points = (entry.history ?? [])
      .map((h) => ({ t: Date.parse(h.recorded_at), score: toPct(h.mastery_level) }))
      .filter((p): p is TrendPoint => Number.isFinite(p.t) && p.score !== null)
      .sort((a, b) => a.t - b.t);
    if (points.length === 0) continue;
    const first = points[0].score;
    const latest = points[points.length - 1].score;
    rows.push({
      id: entry.skill_id,
      name: entry.skill_name?.trim() || "Skill",
      first,
      latest,
      delta: latest - first,
      points,
    });
  }
  return rows.sort((a, b) => {
    const aMulti = a.points.length > 1;
    const bMulti = b.points.length > 1;
    if (aMulti !== bMulti) return aMulti ? -1 : 1;
    if (aMulti) return Math.abs(b.delta) - Math.abs(a.delta) || b.delta - a.delta;
    return b.latest - a.latest;
  });
}

// ── Chapters ───────────────────────────────────────────────────────────────

export interface ChapterInsight {
  title: string;
  coverage: number;
  mastery: number | null;
  started: boolean;
  sessions: number;
  minutes: number;
}

/** Real chapters in the order the API gives them (the syllabus order). */
export function chapterRows(rows: ChapterMastery[]): ChapterInsight[] {
  return rows
    .filter((r) => !r.is_placeholder)
    .map((r) => {
      const coverage = Math.max(0, Math.min(100, Math.round(Number(r.completion_percentage) || 0)));
      const sessions = Number(r.time_sessions ?? r.study_count) || 0;
      const minutes = Math.round(Number(r.time_minutes) || 0);
      const started = coverage > 0 || sessions > 0 || minutes > 0;
      return {
        title: r.document_title?.trim() || "Chapter",
        coverage,
        mastery: started ? toPct(r.mastery_score) : null,
        started,
        sessions,
        minutes,
      };
    });
}

// ── How to help ────────────────────────────────────────────────────────────

export interface HelpTip {
  kind: "practice" | "praise";
  area: string;
  text: string;
}

const PRACTICE_TEMPLATES = [
  (area: string) => `Ask them to teach you ${area} in their own words. Explaining is the fastest way to find the gaps.`,
  (area: string) => `Spend ten minutes on ${area} together this week. Short, regular practice beats one long session.`,
];

/** Up to two practice tips for the weakest areas, and one thing to praise. */
export function helpTips(areas: SkillArea[]): HelpTip[] {
  const assessed = areas.filter((a) => a.assessed);
  const weak = assessed.filter((a) => a.score < 60).slice(-2).reverse();
  const tips: HelpTip[] = weak.map((a, i) => ({ kind: "practice", area: a.name, text: PRACTICE_TEMPLATES[i](a.name) }));
  const best = assessed[0];
  if (best && best.score >= 60) {
    tips.push({
      kind: "praise",
      area: best.name,
      text: `Celebrate ${best.name}. Noticing what's going well keeps motivation up.`,
    });
  }
  return tips;
}

/** "Sep 3" style date for trend captions. */
export function shortDate(t: number): string {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
