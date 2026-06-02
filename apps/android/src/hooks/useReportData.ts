/**
 * Fetches the AI-generated progress report for the Me / Report screen.
 */
import { useCallback } from "react";
import { useApi } from "./useApi";
import { useStudentId } from "./useStudentId";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { studentService } from "../services/studentService";
import type { ProgressReport } from "../types/api";

export interface ReportData {
  report: ProgressReport | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useReportData(): ReportData {
  const studentId = useStudentId();

  const fetchReport = useCallback(
    () =>
      studentId
        ? studentService.fetchProgressReport(studentId)
        : Promise.resolve<ProgressReport>({}),
    [studentId]
  );

  const { data, loading, error, refetch } = useApi(fetchReport, [studentId]);

  useRefreshOnFocus(refetch);

  return { report: data, loading, error, refetch };
}
