/**
 * Fetches subjects and test submissions for the Practice screen.
 */
import { useCallback } from "react";
import { useApi } from "./useApi";
import { useStudentId } from "./useStudentId";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { studentService } from "../services/studentService";
import type { SubjectInfo, TestSubmission } from "../types/api";

export interface PracticeData {
  subjects: SubjectInfo[];
  submissions: TestSubmission[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePracticeData(selectedSubject?: string): PracticeData {
  const studentId = useStudentId();

  const fetchSubjects = useCallback(
    () =>
      studentId
        ? studentService.fetchAnalyticsSubjects(studentId).then((res) =>
            Array.isArray(res) ? res : (res as any)?.subjects ?? []
          )
        : Promise.resolve<SubjectInfo[]>([]),
    [studentId]
  );

  const fetchSubmissions = useCallback(
    () =>
      studentId
        ? studentService.fetchTestSubmissions(studentId, selectedSubject).then((res) =>
            Array.isArray(res) ? res : (res as any)?.submissions ?? []
          )
        : Promise.resolve<TestSubmission[]>([]),
    [studentId, selectedSubject]
  );

  const subjects    = useApi(fetchSubjects,    [studentId]);
  const submissions = useApi(fetchSubmissions, [studentId, selectedSubject]);

  const { refetch: refetchSubjects }    = subjects;
  const { refetch: refetchSubmissions } = submissions;

  const refetch = useCallback(() => {
    refetchSubjects();
    refetchSubmissions();
  }, [refetchSubjects, refetchSubmissions]);

  useRefreshOnFocus(refetch);

  return {
    subjects:    subjects.data ?? [],
    submissions: submissions.data ?? [],
    loading:     subjects.loading || submissions.loading,
    error:       subjects.error   || submissions.error   || null,
    refetch,
  };
}
