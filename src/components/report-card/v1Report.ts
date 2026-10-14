import { authFetch } from "@/utils/authFetch";
import { chapterPercent, subjectName } from "@/features/student/learner/recentChapters";
import type { LearnerChaptersOut, RecentChapter, RecentChaptersOut } from "@/features/student/learner/types";
import type { ChapterMasteryItem, ChapterSkill, ReportCardDataset, SkillLevel, SubjectData } from "./types";

/**
 * The report card's data from the new backend's learner routes (backend `contracts/openapi/api.json`):
 *
 *   student  GET /v1/learner/available-subjects, /v1/learner/chapters?subject=   every chapter they can open
 *            GET /v1/learner/recent-chapters                                      the ones they've worked on
 *            GET /v1/instances/{id}/report                                        each worked chapter's facts
 *            GET /v1/skills                                                       skill levels
 *   parent   GET /v1/parent/children/{id}/recent-chapters, /skills, /instances/{id}/report   (an APPROVED link only)
 *
 * The backend has no overall score, session count, tests, time spent or AI analyses any more; those stay empty and
 * the report card shows them as coming soon. Nothing here is invented: every number is one of the backend's facts.
 */

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/** `GET /v1/instances/{id}/report` (`ChapterReport`); only the fields the report card reads. */
interface ChapterReportOut {
  completed: boolean;
  nodes_done: number;
  nodes_total: number;
  answers: { answered: number; correct: number };
  outcomes: Array<{ code: string; title: string; mastered: boolean }>;
}

/** `GET /v1/skills` (`Skills`, `progress_levels_v2`). */
interface SkillsOut {
  skills: Array<{
    component_id: string;
    title: string;
    chapter_id: string;
    level: SkillLevel;
    status: string | null;
    due: boolean;
    needs_adult_support: boolean;
  }>;
}

export type ReportWho = { role: "student" } | { role: "parent"; childId: string };

/** The most chapters either recent-chapters route returns. */
const RECENT_LIMIT = 50;

/** Levels the backend counts as known (`got_it`: p_known ≥ 0.80 from 2+ answers alone; `strong`: ≥ 0.95 from 3+). */
const KNOWN: ReadonlySet<SkillLevel> = new Set(["got_it", "strong"]);

async function getJson<T>(path: string, who: ReportWho): Promise<T> {
  // A parent whose link isn't approved gets a 403 here: that's the parent's data, not a broken session.
  const response = await authFetch(`${API}${path}`, { headers: { accept: "application/json" }, allow403: who.role === "parent" });
  return response.json() as Promise<T>;
}

/** Null on any failure: one chapter's missing report shouldn't sink the whole card. */
async function maybe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

/**
 * A chapter's mastery, 0–1: the share of the skills it has evidence on that the backend rates Got it or Strong. The
 * backend never claims mastery from thin evidence (`progress_levels_v2`), so neither does this: no answered skills is 0.
 */
export function chapterMastery(skills: ChapterSkill[]): number {
  const measured = skills.filter((s) => s.level !== "not_started");
  if (measured.length === 0) return 0;
  return measured.filter((s) => KNOWN.has(s.level)).length / measured.length;
}

export async function loadV1Report(who: ReportWho): Promise<ReportCardDataset> {
  const base = who.role === "parent" ? `/v1/parent/children/${encodeURIComponent(who.childId)}` : "";
  const recentPath = who.role === "parent" ? `${base}/recent-chapters` : "/v1/learner/recent-chapters";
  const skillsPath = who.role === "parent" ? `${base}/skills` : "/v1/skills";
  const reportPath = (instanceId: string) =>
    who.role === "parent" ? `${base}/instances/${encodeURIComponent(instanceId)}/report` : `/v1/instances/${encodeURIComponent(instanceId)}/report`;

  const [recentOut, skillsOut, subjectsOut] = await Promise.all([
    getJson<RecentChaptersOut>(`${recentPath}?limit=${RECENT_LIMIT}`, who),
    maybe(getJson<SkillsOut>(skillsPath, who)),
    // Only the student can list every chapter they could open; a parent sees the chapters the child has opened.
    who.role === "student"
      ? maybe(getJson<{ subjects: Array<{ subject: string }> }>("/v1/learner/available-subjects", who))
      : Promise.resolve(null),
  ]);

  const recent = (recentOut.chapters ?? []).filter((c) => c.state !== "abandoned");
  const subjectNames = (subjectsOut?.subjects ?? []).map((s) => s.subject);
  const nameOf = (code: string) => subjectName(code, subjectNames);

  const [reports, catalogues] = await Promise.all([
    Promise.all(recent.map((c) => maybe(getJson<ChapterReportOut>(reportPath(c.instance_id), who)))),
    Promise.all(subjectNames.map((s) => maybe(getJson<LearnerChaptersOut>(`/v1/learner/chapters?subject=${encodeURIComponent(s)}`, who)))),
  ]);

  const skillsByChapter = new Map<string, ChapterSkill[]>();
  for (const s of skillsOut?.skills ?? []) {
    const list = skillsByChapter.get(s.chapter_id) ?? [];
    list.push({ component_id: s.component_id, title: s.title, level: s.level, status: s.status, due: s.due, needs_adult_support: s.needs_adult_support });
    skillsByChapter.set(s.chapter_id, list);
  }

  const worked = new Map<string, { chapter: RecentChapter; report: ChapterReportOut | null }>();
  recent.forEach((chapter, i) => worked.set(chapter.chapter_id, { chapter, report: reports[i] }));

  const opened = (chapter: RecentChapter, report: ChapterReportOut | null, subject: string): ChapterMasteryItem => {
    const skills = skillsByChapter.get(chapter.chapter_id) ?? [];
    const completed = chapter.state === "completed" || report?.completed === true;
    return {
      subject,
      document_title: chapter.chapter_title,
      completion_percentage: completed ? 100 : chapterPercent(chapter),
      mastery_score: chapterMastery(skills),
      study_count: 1,
      grade: 0,
      status: completed ? "completed" : "in_progress",
      chapter_id: chapter.chapter_id,
      chapter_number: chapter.chapter_number,
      book_title: chapter.book_title,
      instance_id: chapter.instance_id,
      nodes_done: report?.nodes_done ?? chapter.nodes_done,
      nodes_total: report?.nodes_total ?? chapter.nodes_total,
      answered: report?.answers.answered ?? null,
      correct: report?.answers.correct ?? null,
      outcomes: report?.outcomes.map((o) => ({ code: o.code, title: o.title, mastered: o.mastered })) ?? null,
      skills,
      last_active_at: chapter.last_active_at,
    };
  };

  const chapters: ChapterMasteryItem[] = [];
  // Student: every chapter they can open, in book order, the worked ones carrying their facts.
  catalogues.forEach((cat, i) => {
    const subject = subjectNames[i];
    for (const ch of cat?.chapters ?? []) {
      const w = worked.get(ch.chapter_id);
      if (w) {
        chapters.push(opened(w.chapter, w.report, subject));
        worked.delete(ch.chapter_id);
      } else {
        chapters.push({
          subject,
          document_title: ch.title,
          completion_percentage: 0,
          mastery_score: 0,
          study_count: 0,
          grade: 0,
          status: null,
          chapter_id: ch.chapter_id,
          chapter_number: ch.number,
          book_title: ch.book_title,
          skills: [],
        });
      }
    }
  });
  // Parent, or a worked chapter no longer listed: the worked chapters in book order.
  [...worked.values()]
    .sort((a, b) => a.chapter.book_title.localeCompare(b.chapter.book_title) || a.chapter.chapter_number - b.chapter.chapter_number)
    .forEach(({ chapter, report }) => chapters.push(opened(chapter, report, nameOf(chapter.subject))));

  // A subject appears once it has a chapter (student: one it can open; parent: one the child opened).
  const order = [...new Set([...subjectNames, ...chapters.map((c) => c.subject)])];
  const subjects: SubjectData[] = order
    .filter((s) => chapters.some((c) => c.subject === s))
    .map((subject) => {
      const own = chapters.filter((c) => c.subject === subject);
      const measured = own.filter((c) => (c.skills ?? []).some((k) => k.level !== "not_started"));
      return {
        subject,
        overall_score: measured.length ? measured.reduce((sum, c) => sum + c.mastery_score, 0) / measured.length : 0,
        skill_index: 0,
        adaptive_mode: "",
        session_count: own.filter((c) => c.instance_id).length,
      };
    });

  return {
    totalSessions: recent.length,
    subjects,
    chapters,
    skillTree: [],
    testSubmissions: [],
    progressReport: null,
    subjectEvolutions: [],
    chapterEvolutions: [],
  };
}
