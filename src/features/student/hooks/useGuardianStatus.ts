import { useCallback, useEffect, useState } from "react";
import { studentService, type GuardianStatus } from "../services/studentService";

/**
 * The student's guardian connection, read from the server on mount and again
 * whenever the tab regains focus, so nothing shows a stale invitation once the
 * parent has connected (or a stale "connected" after they removed it). A failed
 * read leaves `status` null: callers show nothing rather than a guess.
 */
export function useGuardianStatus(studentId: string | undefined) {
  const [status, setStatus] = useState<GuardianStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!studentId) return null;
    setLoading(true);
    try {
      const next = await studentService.fetchGuardianStatus(studentId);
      setStatus(next);
      return next;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { status, setStatus, loading, refresh };
}
