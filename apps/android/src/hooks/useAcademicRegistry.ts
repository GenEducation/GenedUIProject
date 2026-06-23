/**
 * Manages the Academic Registry — fetching, uploading, polling, deleting, cancelling.
 *
 * Holds subjects in local state (not useApi) so optimistic in-progress rows
 * can be merged with backend data and updated by polling without re-mounting.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePartnerId } from "./usePartnerId";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { partnerService } from "../services/partnerService";
import { normaliseIngestionStatus } from "../types/partner";
import type { SubjectRegistryItem, IngestionUploadForm, IngestionStatus } from "../types/partner";

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 180; // 15 minutes

export type RegistryFilter = "ALL" | "active" | "in-progress" | "failed";

export interface AcademicRegistryData {
  subjects: SubjectRegistryItem[];      // filtered list for display
  allSubjects: SubjectRegistryItem[];   // unfiltered, for counts
  search: string;
  statusFilter: RegistryFilter;
  setSearch: (q: string) => void;
  setStatusFilter: (f: RegistryFilter) => void;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  upload: (form: IngestionUploadForm, fileUri: string, fileName: string) => Promise<void>;
  deleteItem: (item: SubjectRegistryItem) => Promise<void>;
  cancelItem: (item: SubjectRegistryItem) => Promise<void>;
}

export function useAcademicRegistry(): AcademicRegistryData {
  const partnerId = usePartnerId();

  const [allSubjects, setAllSubjects] = useState<SubjectRegistryItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<Error | null>(null);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<RegistryFilter>("ALL");

  // Track active poll timers: batchId → intervalId
  const pollTimers  = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const pollCounts  = useRef<Map<string, number>>(new Map());

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchSubjects = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    setError(null);
    try {
      const fetched = await partnerService.fetchSubjects(partnerId);
      setAllSubjects((prev) => {
        // Keep optimistic in-progress rows that aren't yet confirmed by the backend
        const fetchedIds = new Set(fetched.map((s) => s.id));
        const optimisticOnly = prev.filter(
          (s) => s.id.startsWith("temp-") && !fetchedIds.has(s.id)
        );
        return [...fetched, ...optimisticOnly];
      });
      // Resume polling for any in-progress items returned by the backend
      fetched
        .filter((s) => s.status === "in-progress" && s.id && !s.id.startsWith("temp-"))
        .forEach((s) => startPolling(s.id, s.document_title));
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to load registry"));
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    fetchSubjects();
    return () => stopAllPolling();
  }, [fetchSubjects]);

  useRefreshOnFocus(fetchSubjects);

  // ── Polling ───────────────────────────────────────────────────────────────

  const stopPolling = useCallback((batchId: string) => {
    const timer = pollTimers.current.get(batchId);
    if (timer != null) clearInterval(timer);
    pollTimers.current.delete(batchId);
    pollCounts.current.delete(batchId);
  }, []);

  const stopAllPolling = useCallback(() => {
    pollTimers.current.forEach((t) => clearInterval(t));
    pollTimers.current.clear();
    pollCounts.current.clear();
  }, []);

  const startPolling = useCallback(
    (batchId: string, documentTitle: string) => {
      if (pollTimers.current.has(batchId)) return; // already polling
      pollCounts.current.set(batchId, 0);

      const timer = setInterval(async () => {
        const count = (pollCounts.current.get(batchId) ?? 0) + 1;
        pollCounts.current.set(batchId, count);

        if (count > MAX_POLL_ATTEMPTS) {
          stopPolling(batchId);
          setAllSubjects((prev) =>
            prev.map((s) => (s.id === batchId ? { ...s, status: "failed" } : s))
          );
          return;
        }

        try {
          const { rawStatus, chapters_detected, chapter_titles } =
            await partnerService.pollIngestionStatus(batchId);
          const status = normaliseIngestionStatus(rawStatus);

          setAllSubjects((prev) =>
            prev.map((s) =>
              s.id === batchId
                ? { ...s, status, chapters_detected, chapter_titles }
                : s
            )
          );

          if (status === "active" || status === "failed") {
            stopPolling(batchId);
          }
        } catch {
          // transient network error — keep polling
        }
      }, POLL_INTERVAL_MS);

      pollTimers.current.set(batchId, timer);
    },
    [stopPolling]
  );

  // ── Upload ────────────────────────────────────────────────────────────────

  const upload = useCallback(
    async (form: IngestionUploadForm, fileUri: string, fileName: string) => {
      if (!partnerId) throw new Error("Not authenticated");

      // Add optimistic in-progress row immediately
      const tempId = `temp-${Date.now()}`;
      const optimistic: SubjectRegistryItem = {
        id:             tempId,
        document_title: form.document_title,
        subject:        form.subject,
        grade:          form.grade,
        status:         "in-progress",
      };
      setAllSubjects((prev) => [optimistic, ...prev]);

      try {
        const result = await partnerService.uploadCurriculum(partnerId, form, fileUri, fileName);

        if (result.kind === "async") {
          // Replace temp row with real batchId and start polling
          const batchId = result.batchId;
          setAllSubjects((prev) =>
            prev.map((s) => (s.id === tempId ? { ...s, id: batchId } : s))
          );
          startPolling(batchId, form.document_title);
        } else {
          // Sync response — mark terminal state immediately
          const finalStatus: IngestionStatus =
            result.status === "completed" ? "active" : "failed";
          setAllSubjects((prev) =>
            prev.map((s) => (s.id === tempId ? { ...s, status: finalStatus } : s))
          );
        }
      } catch (e) {
        // Remove optimistic row on error so the user can retry
        setAllSubjects((prev) => prev.filter((s) => s.id !== tempId));
        throw e;
      }
    },
    [partnerId, startPolling]
  );

  // ── Delete ────────────────────────────────────────────────────────────────

  const deleteItem = useCallback(
    async (item: SubjectRegistryItem) => {
      if (!partnerId) return;
      setAllSubjects((prev) => prev.filter((s) => s.id !== item.id));
      await partnerService.deleteSubject(partnerId, item.document_title);
    },
    [partnerId]
  );

  // ── Cancel ────────────────────────────────────────────────────────────────

  const cancelItem = useCallback(
    async (item: SubjectRegistryItem) => {
      if (!partnerId) return;
      stopPolling(item.id);
      setAllSubjects((prev) => prev.filter((s) => s.id !== item.id));
      try {
        await partnerService.cancelIngestion(partnerId, item.document_title);
      } catch {
        // Best-effort — row is already removed from UI
      }
    },
    [partnerId, stopPolling]
  );

  // ── Filtered view ─────────────────────────────────────────────────────────

  const subjects = useMemo(() => {
    let list = allSubjects;
    if (statusFilter !== "ALL") list = list.filter((s) => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.document_title.toLowerCase().includes(q) ||
          s.subject.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allSubjects, statusFilter, search]);

  return {
    subjects,
    allSubjects,
    search,
    statusFilter,
    setSearch,
    setStatusFilter,
    loading,
    error,
    refetch: fetchSubjects,
    upload,
    deleteItem,
    cancelItem,
  };
}
