/**
 * useSchedule — local-state hook mirroring the web useScheduleStore behavior
 * (no zustand). Loads/books scheduled sessions for the current student.
 */
import { useCallback, useEffect, useState } from "react";
import { scheduleService } from "../services/scheduleService";
import { useStudentId } from "./useStudentId";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import type { ScheduleSessionRequest, ScheduleSessionResponse } from "../types/schedule";

export function useSchedule() {
  const studentId = useStudentId();
  const [sessions, setSessions] = useState<ScheduleSessionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const list = await scheduleService.getScheduledSessions(studentId);
      setSessions(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("[Schedule] load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);
  useRefreshOnFocus(load);

  const book = useCallback(
    async (request: Omit<ScheduleSessionRequest, "user_id">): Promise<boolean> => {
      if (!studentId) return false;
      setBooking(true);
      setBookError(null);
      try {
        await scheduleService.scheduleSession({ ...request, user_id: studentId });
        await load();
        return true;
      } catch (err) {
        setBookError(err instanceof Error ? err.message : "Failed to schedule session");
        return false;
      } finally {
        setBooking(false);
      }
    },
    [studentId, load]
  );

  return { sessions, loading, booking, bookError, load, book };
}
