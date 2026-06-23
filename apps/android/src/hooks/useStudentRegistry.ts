/**
 * Provides a filtered, searchable student list for the Students tab.
 *
 * Filtering is done client-side to avoid extra API round-trips.
 */
import { useCallback, useState, useMemo } from "react";
import { useApi } from "./useApi";
import { usePartnerId } from "./usePartnerId";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { partnerService } from "../services/partnerService";
import type { PartnerStudent } from "../types/partner";

export interface StudentRegistryData {
  students: PartnerStudent[];
  query: string;
  setQuery: (q: string) => void;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useStudentRegistry(): StudentRegistryData {
  const partnerId = usePartnerId();
  const [query, setQuery] = useState("");

  const fetchStudents = useCallback(
    (_signal: AbortSignal) =>
      partnerId
        ? partnerService.fetchStudents(partnerId)
        : Promise.resolve<PartnerStudent[]>([]),
    [partnerId]
  );

  const { data, loading, error, refetch } = useApi(fetchStudents, [partnerId]);

  useRefreshOnFocus(refetch);

  const students = useMemo(() => {
    const all = data ?? [];
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.grade).toLowerCase().includes(q)
    );
  }, [data, query]);

  return { students, query, setQuery, loading, error, refetch };
}
