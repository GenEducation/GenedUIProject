import { authFetch } from "@/utils/authFetch";
import { activityService } from "@/features/learning/activity/activityService";
import type { AnswerHelp, ChapterMasteryItem, ChapterSkill, ReportCardDataset, SkillLevel, SubjectData } from "./types";

/**
 * The report card's data from the new backend: one read of the whole report (backend `contracts/openapi/api.json`):
 *
 *   student  GET /v1/learner/report
 *   parent   GET /v1/parent/children/{id}/report      (an APPROVED link only)
 *
 * Every figure the card shows is a fact the backend worked out (the share of measured skills at Got it or Strong, a
 * subject's mean over its measured chapters, `null` when nothing is measured), so this is only a mapper onto the card's
 * shapes. What the backend does not report (tests, the old analyses) stays empty. The one extra read is each chapter's
 * estimated study time, which the card shows beside it and which may be unavailable without sinking the card.
 */

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export type ReportWho = { role: "student"; studentId?: string } | { role: "parent"; childId: string };

/** `GET /v1/learner/report` (`LearnerReport`). */
export interface ReportBody {
  grade: number | null;
  board: string | null;
  summary: ReportSummaryFacts;
  subjects: Array<{ code: string; name: string; mastery: number | null; chapters_opened: number }>;
  chapters: Array<{
    chapter_id: string;
    subject_code: string;
    subject: string;
    book_title: string;
    number: number;
    title: string;
    instance_id: string | null;
    status: "not_started" | "in_progress" | "completed";
    nodes_done: number;
    nodes_total: number;
    completion: number;
    mastery: number | null;
    skills: Array<{
      component_id: string;
      title: string;
      level: SkillLevel;
      status: string | null;
      due: boolean;
      needs_adult_support: boolean;
    }>;
    answered: number | null;
    correct: number | null;
    help: AnswerHelp | null;
    outcomes: Array<{ code: string; title: string; mastered: boolean }> | null;
    last_active_at: string | null;
    /** Completed once and open again (reviewing sections or started over); `status` stays `completed`. */
    revisiting?: boolean;
  }>;
}

export interface ReportSummaryFacts {
  answered: number;
  correct: number;
  help: AnswerHelp;
  chapters_available: number;
  chapters_opened: number;
  chapters_completed: number;
  completion: number;
  mastery: number | null;
}

/** The card's dataset plus who it is about and the summary facts the header shows. */
export interface V1Dataset extends ReportCardDataset {
  profile: { grade: number | null; board: string | null };
  summary: ReportSummaryFacts;
}

async function getJson<T>(path: string, who: ReportWho): Promise<T> {
  // A parent whose link isn't approved gets a 403 here: that's the parent's data, not a broken session.
  const response = await authFetch(`${API}${path}`, { headers: { accept: "application/json" }, allow403: who.role === "parent" });
  return response.json() as Promise<T>;
}

/** Null on any failure: study time is a nicety, never a reason to lose the report. */
async function maybe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

export async function loadV1Report(who: ReportWho): Promise<V1Dataset> {
  const path = who.role === "parent" ? `/v1/parent/children/${encodeURIComponent(who.childId)}/report` : "/v1/learner/report";
  const timeOwner = who.role === "parent" ? who.childId : who.studentId;
  const [body, times] = await Promise.all([
    getJson<ReportBody>(path, who),
    timeOwner ? maybe(activityService.chapterTimes(timeOwner)) : Promise.resolve(null),
  ]);
  const minutes = new Map((times ?? []).map((t) => [t.chapter_id, t.total_minutes]));

  const chapters = body.chapters.map((c): ChapterMasteryItem => {
    const opened = c.instance_id != null;
    const skills: ChapterSkill[] = c.skills.map((k) => ({
      component_id: k.component_id, title: k.title, level: k.level, status: k.status, due: k.due, needs_adult_support: k.needs_adult_support,
    }));
    return {
      subject: c.subject,
      subject_code: c.subject_code,
      document_title: c.title,
      completion_percentage: Math.round(c.completion * 100),
      // Nothing measured is null on the backend; the card reads "measured" from the skills, so 0 is only a placeholder.
      mastery_score: c.mastery ?? 0,
      study_count: opened ? 1 : 0,
      grade: body.grade ?? 0,
      status: c.status === "completed" ? "completed" : c.status === "in_progress" ? "in_progress" : null,
      chapter_id: c.chapter_id,
      chapter_number: c.number,
      book_title: c.book_title,
      instance_id: c.instance_id ?? undefined,
      nodes_done: opened ? c.nodes_done : undefined,
      nodes_total: opened ? c.nodes_total : undefined,
      answered: opened ? c.answered : undefined,
      correct: opened ? c.correct : undefined,
      outcomes: opened ? c.outcomes : undefined,
      help: opened ? c.help : undefined,
      skills,
      last_active_at: c.last_active_at ?? undefined,
      revisiting: c.revisiting === true,
      time_minutes: minutes.get(c.chapter_id),
    };
  });

  const subjects: SubjectData[] = body.subjects.map((s) => ({
    subject: s.name,
    overall_score: s.mastery ?? 0,
    skill_index: 0,
    adaptive_mode: "",
    session_count: s.chapters_opened,
  }));

  return {
    totalSessions: body.summary.chapters_opened,
    subjects,
    chapters,
    skillTree: [],
    testSubmissions: [],
    progressReport: null,
    subjectEvolutions: [],
    chapterEvolutions: [],
    profile: { grade: body.grade, board: body.board },
    summary: body.summary,
  };
}
