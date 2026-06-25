/**
 * Assembles the full student report card by fetching the same set of dashboard
 * endpoints the web report card uses (StudentReportCard.fetchAll) and combining
 * them into the parent-report shape consumed by `fromParentReport`.
 *
 * The bare /progress-report endpoint alone only carries the AI narrative — the
 * numeric subject KPIs, chapter mastery, skill tree, tests, English profile and
 * evolution analyses each live behind their own per-subject/per-chapter endpoints.
 */
import { useCallback } from "react";
import { useApi } from "./useApi";
import { useStudentId } from "./useStudentId";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { studentService } from "../services/studentService";

/** Assembled report in the shape `fromParentReport` expects. */
export interface FullReportData {
  profile: any | null;
  total_sessions: number;
  subjects: any[];
  chapters: any[];
  skill_tree: any[];
  english_skills: any | null;
  test_submissions: any[];
  progress_report: any | null;
  subject_evolutions: any[];
  chapter_evolutions: any[];
}

export interface ReportData {
  report: FullReportData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** A backend "not found" response carries a `detail` string instead of real data. */
const hasDetail = (r: any) => r && typeof r === "object" && "detail" in r;

async function assembleReport(studentId: string): Promise<FullReportData> {
  // 1. Profile + subject list (with session count) in parallel.
  const [profile, subjectResp] = await Promise.all([
    studentService.fetchDashboardProfile(studentId).catch(() => null),
    studentService.fetchAnalyticsSubjects(studentId).catch(() => null),
  ]);

  const sr: any = subjectResp;
  const subjectNames: string[] = Array.isArray(sr)
    ? sr.map((s: any) => s.subject ?? s)
    : sr?.subjects ?? [];
  const totalSessions: number = (Array.isArray(sr) ? 0 : sr?.session_count) ?? 0;

  // 2. Per subject: skill summary + chapter mastery + skill tree + subject evolution.
  const perSubject = await Promise.all(
    subjectNames.map(async (subject) => {
      const [summary, mastery, tree, subjectEvo] = await Promise.all([
        studentService.fetchSkillSummary(studentId, subject).catch(() => null),
        studentService.fetchChapterMastery(studentId, subject).catch(() => []),
        studentService.fetchSkillTree(studentId, subject).catch(() => []),
        studentService.fetchSubjectEvolution(studentId, subject).catch(() => null),
      ]);

      const subjectEntry =
        summary && !hasDetail(summary)
          ? { subject, overall_score: (summary as any).overall_score ?? 0 }
          : null;
      const chapters = Array.isArray(mastery)
        ? mastery.map((ch: any) => ({ ...ch, subject }))
        : [];
      const cgs = Array.isArray(tree) ? tree.map((cg: any) => ({ ...cg, subject })) : [];

      return { subjectEntry, chapters, cgs, subjectEvo };
    })
  );

  const subjects: any[] = [];
  const chapters: any[] = [];
  const skill_tree: any[] = [];
  const subject_evolutions: any[] = [];
  for (const { subjectEntry, chapters: chs, cgs, subjectEvo } of perSubject) {
    if (subjectEntry) subjects.push(subjectEntry);
    chapters.push(...chs);
    skill_tree.push(...cgs);
    if (subjectEvo && !hasDetail(subjectEvo)) subject_evolutions.push(subjectEvo);
  }

  // 3. English skills + test submissions + progress report in parallel.
  const [english, tests, progress] = await Promise.all([
    studentService.fetchEnglishSkillsSummary(studentId).catch(() => null),
    studentService.fetchTestSubmissions(studentId).catch(() => []),
    studentService.fetchProgressReport(studentId).catch(() => null),
  ]);

  // 4. Per chapter: evolution analysis.
  const chapterEvoResults = await Promise.all(
    chapters.map((ch: any) =>
      studentService
        .fetchChapterEvolution(studentId, ch.subject, ch.document_title)
        .catch(() => null)
    )
  );
  const chapter_evolutions = chapterEvoResults.filter((r) => r && !hasDetail(r));

  return {
    profile,
    total_sessions: totalSessions,
    subjects,
    chapters,
    skill_tree,
    english_skills: english && !hasDetail(english) ? english : null,
    test_submissions: Array.isArray(tests) ? tests : [],
    progress_report: progress && !hasDetail(progress) ? progress : null,
    subject_evolutions,
    chapter_evolutions,
  };
}

export function useReportData(): ReportData {
  const studentId = useStudentId();

  const fetchReport = useCallback(
    (_signal: AbortSignal) =>
      studentId
        ? assembleReport(studentId)
        : Promise.resolve<FullReportData | null>(null),
    [studentId]
  );

  const { data, loading, error, refetch } = useApi(fetchReport, [studentId]);

  useRefreshOnFocus(refetch);

  return { report: data, loading, error, refetch };
}
