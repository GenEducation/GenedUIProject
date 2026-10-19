// Display values for the on-screen report card, derived from the fetched
// dataset. Pure functions, so every number the screen shows can be unit-tested
// without rendering. Percentages here are 0–100 integers.

import type {
  AnalysisFocusArea,
  ChapterMasteryItem,
  EvolutionAnalysisData,
  ReportCardDataset,
  SubjectEvolutionData,
} from "./types";
import { masteryBand, toneFor, type BandTone, type MasteryBand } from "./subjectVisuals";

const toPct = (score: number) => Math.round(Math.max(0, Math.min(1, score)) * 100);
const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() || 0 : 0);

// ─────────────────────────────────────────────────────────
// CHAPTERS
// ─────────────────────────────────────────────────────────

export type ChapterStatus = "Completed" | "In progress" | "Not started";

export interface ChapterRowModel {
  /** 1-based position in the curriculum order the API returned. */
  n: number;
  key: string;
  chapter: ChapterMasteryItem;
  title: string;
  status: ChapterStatus;
  mastery: number;
  coverage: number;
  started: boolean;
  band: MasteryBand;
  tone: BandTone;
  sessions: number;
  minutes: number | null;
  evo: EvolutionAnalysisData | undefined;
  /** Last analysis time, used for "Recent" sorting and latest activity. */
  updatedAt: string | null;
}

export type ChapterSort = "order" | "mastery" | "recent";

function chapterStatus(ch: ChapterMasteryItem): ChapterStatus {
  if (ch.status === "completed" || ch.completion_percentage >= 100) return "Completed";
  if (ch.completion_percentage > 0 || ch.study_count > 0) return "In progress";
  return "Not started";
}

function subjectChapters(data: ReportCardDataset, subject: string): ChapterMasteryItem[] {
  return data.chapters.filter((c) => c.subject === subject && !c.is_placeholder);
}

function chapterEvolution(data: ReportCardDataset, subject: string, title: string) {
  return data.chapterEvolutions.find((e) => e.subject === subject && e.document_title === title);
}

/** Every chapter in a subject, including ones not started yet. */
export function chapterRows(data: ReportCardDataset, subject: string, sort: ChapterSort = "order"): ChapterRowModel[] {
  const rows = subjectChapters(data, subject).map((ch, i): ChapterRowModel => {
    const status = chapterStatus(ch);
    const started = status !== "Not started";
    const mastery = toPct(ch.mastery_score);
    const evo = chapterEvolution(data, subject, ch.document_title);
    return {
      n: i + 1,
      key: `${subject}::${ch.document_title}`,
      chapter: ch,
      title: ch.document_title,
      status,
      mastery,
      coverage: Math.round(ch.completion_percentage),
      started,
      band: masteryBand(mastery, started),
      tone: toneFor(mastery, started),
      sessions: ch.time_sessions ?? ch.study_count,
      minutes: ch.time_minutes != null ? Math.round(ch.time_minutes) : null,
      evo,
      updatedAt: evo?.updated_at ?? null,
    };
  });

  if (sort === "mastery") {
    // Started chapters first, strongest first; unstarted keep curriculum order.
    return [...rows].sort((a, b) => Number(b.started) - Number(a.started) || b.mastery - a.mastery || a.n - b.n);
  }
  if (sort === "recent") {
    return [...rows].sort(
      (a, b) => time(b.updatedAt) - time(a.updatedAt) || b.coverage - a.coverage || a.n - b.n,
    );
  }
  return rows;
}

// ─────────────────────────────────────────────────────────
// SUBJECTS
// ─────────────────────────────────────────────────────────

export interface SubjectSummary {
  subject: string;
  mastery: number;
  coverage: number;
  started: boolean;
  band: MasteryBand;
  tone: BandTone;
  sessions: number;
  chaptersTotal: number;
  chaptersCompleted: number;
  chaptersStarted: number;
  latest: { chapter: string; at: string } | null;
  evolution: SubjectEvolutionData | undefined;
}

export function subjectSummaries(data: ReportCardDataset): SubjectSummary[] {
  return data.subjects.map((s) => {
    const chapters = subjectChapters(data, s.subject);
    const mastery = toPct(s.overall_score);
    const coverage =
      chapters.length > 0
        ? Math.round(chapters.reduce((sum, c) => sum + c.completion_percentage, 0) / chapters.length)
        : 0;
    const chaptersStarted = chapters.filter((c) => chapterStatus(c) !== "Not started").length;
    const started = s.session_count > 0 || chaptersStarted > 0 || mastery > 0;

    const latestEvo = data.chapterEvolutions
      .filter((e) => e.subject === s.subject && e.updated_at)
      .sort((a, b) => time(b.updated_at) - time(a.updated_at))[0];

    return {
      subject: s.subject,
      mastery,
      coverage,
      started,
      band: masteryBand(mastery, started),
      tone: toneFor(mastery, started),
      sessions: s.session_count,
      chaptersTotal: chapters.length,
      chaptersCompleted: chapters.filter((c) => chapterStatus(c) === "Completed").length,
      chaptersStarted,
      latest: latestEvo ? { chapter: latestEvo.document_title, at: latestEvo.updated_at! } : null,
      evolution: data.subjectEvolutions.find((e) => e.subject === s.subject),
    };
  });
}

// ─────────────────────────────────────────────────────────
// OVERALL
// ─────────────────────────────────────────────────────────

export interface OverallSummary {
  /** Mean chapter coverage across subjects. */
  progress: number;
  avgMastery: number;
  chaptersCompleted: number;
  chaptersTotal: number;
  tests: number;
  sessions: number;
  strongest: SubjectSummary | null;
  weakest: SubjectSummary | null;
}

export function overallSummary(data: ReportCardDataset, summaries = subjectSummaries(data)): OverallSummary {
  const started = summaries.filter((s) => s.started);
  const avg = (xs: number[]) => (xs.length > 0 ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const ranked = [...started].sort((a, b) => b.mastery - a.mastery);
  // Strongest vs. weakest only means something with two distinct subjects.
  const comparable = ranked.length >= 2 && ranked[0].mastery !== ranked[ranked.length - 1].mastery;

  return {
    progress: avg(summaries.map((s) => s.coverage)),
    avgMastery: avg(summaries.map((s) => s.mastery)),
    chaptersCompleted: summaries.reduce((sum, s) => sum + s.chaptersCompleted, 0),
    chaptersTotal: summaries.reduce((sum, s) => sum + s.chaptersTotal, 0),
    tests: data.testSubmissions.length,
    sessions: data.totalSessions,
    strongest: comparable ? ranked[0] : null,
    weakest: comparable ? ranked[ranked.length - 1] : null,
  };
}

// ─────────────────────────────────────────────────────────
// TRENDS
// ─────────────────────────────────────────────────────────

export interface SubjectTrend {
  /** 0–100 session scores, oldest first. */
  points: number[];
  /** Last minus first, in percentage points. */
  delta: number;
}

/** Session-by-session mastery for a subject: each analysed chapter's
 *  per-conversation scores, chapters ordered by when they were analysed.
 *  Null until there are two scored sessions to draw a line between. */
export function subjectTrend(data: ReportCardDataset, subject: string): SubjectTrend | null {
  const points = data.chapterEvolutions
    .filter((e) => e.subject === subject)
    .sort((a, b) => time(a.updated_at) - time(b.updated_at))
    .flatMap((e) => e.analysis_json?.per_conversation ?? [])
    .map((s) => s.overall_score)
    .filter((s): s is number => typeof s === "number" && Number.isFinite(s))
    .map(toPct);
  if (points.length < 2) return null;
  return { points, delta: points[points.length - 1] - points[0] };
}

// ─────────────────────────────────────────────────────────
// KEY INSIGHTS
// ─────────────────────────────────────────────────────────

export interface KeyInsights {
  working: string[];
  attention: string[];
  focusAreas: AnalysisFocusArea[];
  headline: string | null;
  assessment: string | null;
}

export function keyInsights(data: ReportCardDataset): KeyInsights | null {
  const report = data.progressReport;
  if (!report) return null;
  const json = report.report_json ?? {};
  return {
    working: json.universal_strengths ?? [],
    attention: json.universal_weaknesses ?? [],
    focusAreas: json.focus_areas ?? [],
    headline: report.headline,
    assessment: report.overall_assessment,
  };
}

/** "2 days ago" style label for an ISO time. */
export function relativeDay(iso: string, now = Date.now()): string {
  const days = Math.floor((now - time(iso)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
