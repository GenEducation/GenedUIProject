import { useEffect, useState } from "react";
import { activityService } from "./activityService";

/** How often the server's session is read again while the tab is visible and a session is open (about one beat). */
export const REFRESH_MS = 30_000;
/** While none is open, a first action or beat may open one at any moment, so it is read sooner. */
export const WAITING_MS = 10_000;

/**
 * The session clock, anchored to the server's study session (backend `GET /students/{id}/session/current`), so it
 * survives a refresh, another tab and another device, and restarts only when the session really ended (5 minutes with
 * no signal). Between reads it runs on this tab's monotonic clock from the server's `elapsed_seconds`.
 *
 * `null` until the server has answered once, or when it cannot be reached: the caller falls back to its own clock then.
 * No open session reads 0.
 */
export function useSessionClock(studentId: string | undefined): number | null {
  const [anchor, setAnchor] = useState<{ open: boolean; elapsed: number; at: number } | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    let timer: number | undefined;
    const read = () => {
      window.clearTimeout(timer);
      if (document.visibilityState !== "visible") return; // read again when the tab is shown
      activityService
        .currentSession(studentId)
        .then((s) => {
          if (cancelled) return;
          setAnchor({ open: s.open, elapsed: s.open ? s.elapsed_seconds : 0, at: performance.now() });
          timer = window.setTimeout(read, s.open ? REFRESH_MS : WAITING_MS);
        })
        .catch(() => {
          if (cancelled) return;
          setAnchor(null); // unreachable: the caller's own clock stands in
          timer = window.setTimeout(read, REFRESH_MS);
        });
    };
    read();
    const second = window.setInterval(() => tick((n) => n + 1), 1000);
    document.addEventListener("visibilitychange", read);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearInterval(second);
      document.removeEventListener("visibilitychange", read);
    };
  }, [studentId]);

  if (!anchor) return null;
  // A session that is not open stays at 0 until the next read says otherwise; an open one runs on.
  return anchor.open ? anchor.elapsed + Math.floor((performance.now() - anchor.at) / 1000) : 0;
}
