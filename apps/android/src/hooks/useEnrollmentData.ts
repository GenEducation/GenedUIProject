/**
 * Orchestrates enrollment data for the Partner Overview screen.
 *
 * Fetches the student registry and derives stats (total, approved, pending).
 */
import { useCallback } from "react";
import { useApi } from "./useApi";
import { usePartnerId } from "./usePartnerId";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { partnerService } from "../services/partnerService";
import type { PartnerStudent, EnrollmentStats } from "../types/partner";

export interface EnrollmentData {
  students: PartnerStudent[];
  stats: EnrollmentStats;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEnrollmentData(): EnrollmentData {
  const partnerId = usePartnerId();

  const fetchStudents = useCallback(
    (_signal: AbortSignal) =>
      partnerId
        ? partnerService.fetchStudents(partnerId)
        : Promise.resolve<PartnerStudent[]>([]),
    [partnerId]
  );

  const { data, loading, error, refetch } = useApi(fetchStudents, [partnerId]);

  useRefreshOnFocus(refetch);

  const students = data ?? [];
  const stats: EnrollmentStats = {
    total:    students.length,
    approved: students.filter((s) => s.status === "APPROVED").length,
    pending:  students.filter((s) => s.status === "PENDING").length,
  };

  return { students, stats, loading, error, refetch };
}
