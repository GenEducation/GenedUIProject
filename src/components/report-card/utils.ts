import type {
  SkillCGItem,
  ReportCardDataset,
  EvolutionAnalysisData,
  ChapterMasteryItem,
  SubjectEvolutionData,
  SubjectData,
} from "./types";

// ─────────────────────────────────────────────────────────
// COLOR / BAND SCALES
// ─────────────────────────────────────────────────────────

export const SUBJECT_ACCENTS = [
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
];

/** Mastery color for a 0–1 level. */
export function masteryColor(level: number): string {
  if (level >= 0.8) return "#059F6D";
  if (level >= 0.6) return "#10B981";
  if (level >= 0.4) return "#F59E0B";
  if (level >= 0.2) return "#F97316";
  return "#EF4444";
}

/** Band label for a 0–100 score (matches the CSS chip classes below). */
export function bandFor(score: number): string {
  if (score >= 80) return "Advanced";
  if (score >= 60) return "Proficient";
  if (score >= 40) return "Approaching";
  return "Developing";
}

/** Lowercased band, used directly as an `.rc-chip {band}` class. */
export function bandClass(score: number): string {
  return bandFor(score).toLowerCase();
}

export function pct(val: number | null | undefined): string {
  if (val == null) return "—";
  return `${Math.round(val * 100)}%`;
}

export function formatDate(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

// Sparkline level mapping (session-by-session learning arc).
export const SPARK_LEVELS = { beginning: 1, developing: 2, approaching: 3, proficient: 4, advanced: 5 } as const;
export const SPARK_COLORS = {
  beginning: "#94a3b8",
  developing: "#be123c",
  approaching: "#b45309",
  proficient: "#1d4ed8",
  advanced: "#047857",
} as const;
export type SparkLevel = keyof typeof SPARK_LEVELS;

function levelFromScore(score: number): SparkLevel {
  if (score > 0.8) return "advanced";
  if (score > 0.6) return "proficient";
  if (score > 0.4) return "approaching";
  if (score > 0.2) return "developing";
  return "beginning";
}

export interface ChapterArc {
  mappedLog: { n: number; level: SparkLevel; obs: string[]; stage: string }[];
  points: { x: number; y: number; level: SparkLevel }[];
  path: string;
  areaPath: string;
  dimensions: any[];
  sessionLog: any[];
  gridLines: { y: number; label: string }[];
}

const SPARK_W = 480;
const SPARK_H = 100;
const SPARK_PAD = 20;

/** Builds the session-by-session learning-arc geometry for a chapter's
 *  evolution analysis. Replaces the old inline `_xs`/`_ys`-stashed-on-array hack. */
export function buildChapterArc(evo: EvolutionAnalysisData | undefined): ChapterArc {
  const empty: ChapterArc = {
    mappedLog: [], points: [], path: "", areaPath: "",
    dimensions: [], sessionLog: [], gridLines: [],
  };
  if (!evo) return empty;

  const analysis = evo.analysis_json ?? ({} as any);
  const dimensions: any[] = analysis.dimension_analyses ?? analysis.dimensions ?? [];
  const sessionLog: any[] = analysis.per_conversation ?? [];

  const mappedLog = sessionLog.map((s: any, idx: number) => {
    const rawScore = s.overall_score ?? idx / Math.max(sessionLog.length - 1, 1);
    return {
      n: idx + 1,
      level: levelFromScore(rawScore),
      obs: s.tutor_observations ?? s.observations ?? [],
      stage: s.stage_label ?? `Session ${idx + 1}`,
    };
  });

  const n = mappedLog.length;
  const xOf = (i: number) => SPARK_PAD + i * ((SPARK_W - SPARK_PAD * 2) / (n > 1 ? n - 1 : 1));
  const yOf = (lvl: SparkLevel) =>
    SPARK_H - SPARK_PAD - (SPARK_LEVELS[lvl] - 1) * ((SPARK_H - SPARK_PAD * 2) / 4);

  const points = mappedLog.map((s, i) => ({ x: xOf(i), y: yOf(s.level), level: s.level }));
  const path =
    n > 1 ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") : "";
  const areaPath =
    n > 1
      ? `${path} L ${points[n - 1].x.toFixed(1)} ${(SPARK_H - SPARK_PAD).toFixed(1)} L ${points[0].x.toFixed(1)} ${(
          SPARK_H - SPARK_PAD
        ).toFixed(1)} Z`
      : "";

  const gridLines = (["advanced", "proficient", "approaching", "developing", "beginning"] as SparkLevel[]).map(
    (lvl) => ({ y: yOf(lvl), label: lvl.charAt(0).toUpperCase() + lvl.slice(1) })
  );

  return { mappedLog, points, path, areaPath, dimensions, sessionLog, gridLines };
}

// ─────────────────────────────────────────────────────────
// TOPIC MASTERY (skill tree → strong/weak concepts)
// ─────────────────────────────────────────────────────────

export interface TopicInsights {
  cgs: SkillCGItem[];
  strong: { name: string; level: number }[];
  weak: { name: string; level: number }[];
  loCount: number;
}

/** Distils the fetched skill tree for one subject into concept groups plus
 *  the standout strong (≥0.7) and needs-work (<0.5, actually assessed) LOs. */
export function deriveTopicInsights(skillTree: SkillCGItem[], subject: string): TopicInsights {
  const cgs = skillTree.filter((cg) => cg.subject === subject);
  const los: { name: string; level: number; assessed: number }[] = [];
  for (const cg of cgs) {
    for (const concept of cg.concepts ?? []) {
      for (const lo of concept.los ?? []) {
        los.push({ name: lo.skill_name, level: lo.mastery_level, assessed: lo.assessment_count });
      }
    }
  }
  const strong = los
    .filter((lo) => lo.level >= 0.7)
    .sort((a, b) => b.level - a.level)
    .slice(0, 3)
    .map(({ name, level }) => ({ name, level }));
  const weak = los
    .filter((lo) => lo.level < 0.5 && lo.assessed >= 1)
    .sort((a, b) => a.level - b.level)
    .slice(0, 3)
    .map(({ name, level }) => ({ name, level }));
  return { cgs, strong, weak, loCount: los.length };
}

// ─────────────────────────────────────────────────────────
// "WHAT UNLOCKS NEXT"
// ─────────────────────────────────────────────────────────

export interface Unlock {
  label: string;
  detail: string;
}

/** The nearest 1–3 locked milestones, with progress where we can compute it.
 *  Drives the footer "What unlocks next" card (screen only). */
export function deriveUnlocks(data: ReportCardDataset): Unlock[] {
  const unlocks: Unlock[] = [];
  const {
    subjects, chapters, testSubmissions,
    progressReport, subjectEvolutions, chapterEvolutions,
  } = data;

  // 1. Chapters one session away from a learning-arc analysis.
  for (const ch of chapters) {
    const hasArc = chapterEvolutions.some(
      (e) => e.subject === ch.subject && e.document_title === ch.document_title
    );
    if (!hasArc && ch.study_count === 1) {
      unlocks.push({
        label: `Learning arc for “${ch.document_title}”`,
        detail: "1 of 2 sessions done",
      });
    }
    if (unlocks.length >= 3) return unlocks.slice(0, 3);
  }

  // 2. Subjects approaching a trend analysis (need 2+ chapters).
  for (const s of subjects) {
    const hasTrend = subjectEvolutions.some((e) => e.subject === s.subject);
    const chapterCount = chapters.filter((c) => c.subject === s.subject).length;
    if (!hasTrend && chapterCount >= 1 && chapterCount < 2) {
      unlocks.push({
        label: `Subject trends for ${s.subject}`,
        detail: `${chapterCount} of 2 chapters studied`,
      });
    }
    if (unlocks.length >= 3) return unlocks.slice(0, 3);
  }

  // 3. Cross-subject AI insights (need ≥1 fully analysed subject).
  if (!progressReport) {
    unlocks.push({
      label: "Cross-subject AI insights",
      detail:
        subjectEvolutions.length >= 1
          ? "synthesising from your analysed subjects"
          : "complete one subject's chapters to unlock",
    });
  }

  // 4. Chapter test scores.
  if (testSubmissions.length === 0 && chapters.length > 0) {
    unlocks.push({ label: "Chapter test scores", detail: "take a test from any chapter" });
  }

  return unlocks.slice(0, 3);
}

// ─────────────────────────────────────────────────────────
// DEV STATE SIMULATION (?simulate=…) — tree-shaken out of prod
// ─────────────────────────────────────────────────────────

export type SimMode = "new" | "sessions-only" | "no-tests" | "no-insights" | "partial";

export function applySimulation(mode: string | null, s: ReportCardDataset): ReportCardDataset {
  switch (mode) {
    case "new":
      return {
        totalSessions: 0, subjects: [], chapters: [], skillTree: [],
        testSubmissions: [], progressReport: null, subjectEvolutions: [], chapterEvolutions: [],
      };
    case "sessions-only":
      return {
        ...s,
        totalSessions: s.totalSessions || 6,
        chapters: [], skillTree: [], testSubmissions: [],
        progressReport: null, subjectEvolutions: [], chapterEvolutions: [],
      };
    case "no-tests":
      return { ...s, testSubmissions: [] };
    case "no-insights":
      return { ...s, progressReport: null, subjectEvolutions: [], chapterEvolutions: [] };
    case "partial":
      return {
        ...s,
        testSubmissions: s.testSubmissions.slice(0, 1),
        subjectEvolutions: s.subjectEvolutions.slice(0, 1),
        chapterEvolutions: s.chapterEvolutions.slice(0, 1),
      };
    default:
      return s;
  }
}

// Small shared helpers reused by section renders.
export function testAggregate(tests: { overall_score: number; overall_verdict: string }[]) {
  if (tests.length === 0) return null;
  const avg = tests.reduce((sum, t) => sum + t.overall_score, 0) / tests.length;
  const passed = tests.filter((t) => t.overall_verdict === "PASS" || t.overall_verdict === "pass").length;
  return { avg, passed, total: tests.length };
}

export function subjectAdapted(
  subjectEvolutions: SubjectEvolutionData[],
  subject: string
): boolean {
  return subjectEvolutions.some((e) => e.subject === subject && e.overall_adapted);
}

export function subjectHasChapters(chapters: ChapterMasteryItem[], subject: string): boolean {
  return chapters.some((c) => c.subject === subject);
}

export function pendingTrendSubjects(
  subjects: SubjectData[],
  subjectEvolutions: SubjectEvolutionData[]
): SubjectData[] {
  return subjects.filter((s) => !subjectEvolutions.some((e) => e.subject === s.subject));
}
