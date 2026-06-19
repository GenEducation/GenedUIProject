import { useState, useEffect, useCallback } from "react";
import { useStudentId } from "./useStudentId";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { studentService } from "../services/studentService";
import type { ChapterMastery, SubjectInfo, TestSubmission, AvailableAgentsResponse } from "../types/api";

export interface PracticeData {
  subjects: SubjectInfo[];
  chapters: ChapterMastery[];
  submissions: TestSubmission[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePracticeData(selectedSubject?: string): PracticeData {
  const studentId = useStudentId();

  const [subjects, setSubjects]     = useState<SubjectInfo[]>([]);
  const [chapters, setChapters]     = useState<ChapterMastery[]>([]);
  const [submissions, setSubmissions] = useState<TestSubmission[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Subjects from available agents (same source as Home)
      const agentsRes = await studentService.fetchAvailableAgents(studentId);
      const normSubjects = normaliseAgentsToSubjects(agentsRes);
      setSubjects(normSubjects);

      // 2. Chapters — fetch mastery for each subject in parallel
      const chapterArrays = await Promise.all(
        normSubjects.map((s) =>
          studentService
            .fetchChapterMastery(studentId, s.subject)
            .then((res) => {
              const arr: ChapterMastery[] = Array.isArray(res) ? res : (res as any)?.chapters ?? [];
              // Inject subject + grade from the parent subject in case the API omits them
              return arr.map((c) => ({
                ...c,
                subject: c.subject || s.subject,
                grade: c.grade || s.grade,
              }));
            })
            .catch(() => [] as ChapterMastery[])
        )
      );
      setChapters(chapterArrays.flat());

      // 3. Past submissions
      const subRes = await studentService.fetchTestSubmissions(studentId, selectedSubject);
      setSubmissions(Array.isArray(subRes) ? subRes : (subRes as any)?.submissions ?? []);
    } catch (e) {
      setError("Couldn't load practice data.");
    } finally {
      setLoading(false);
    }
  }, [studentId, selectedSubject]);

  useEffect(() => { load(); }, [load]);
  useRefreshOnFocus(load);

  return { subjects, chapters, submissions, loading, error, refetch: load };
}

function normaliseAgentsToSubjects(res: AvailableAgentsResponse): SubjectInfo[] {
  const subjects: SubjectInfo[] = [];
  const seen = new Set<string>();
  for (const partner of res?.partners ?? []) {
    for (const ps of partner?.subjects ?? []) {
      const key = ps.subject?.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const firstAgent = ps.agents?.[0];
      subjects.push({
        subject: ps.subject,
        grade: firstAgent?.grade ?? 0,
        mastery: ps.subject_coverage_percentage ?? 0,
        agent_id: firstAgent?.agent_id,
        document_titles: firstAgent?.document_titles,
      });
    }
  }
  return subjects;
}
