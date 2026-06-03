"use client";

import { useEffect, useRef } from "react";
import { studentService } from "@/features/student/services/studentService";

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds
const ACTIVITY_DEBOUNCE_MS = 5_000;   // fire at most once per 5 s on user activity

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (s: string) => UUID_RE.test(s);

/**
 * Fires a presence heartbeat to the backend while the student is in an active
 * chat session. Two triggers:
 *
 * 1. Periodic — every 30 s when the browser tab is visible.
 * 2. On activity — first keydown/mousemove after 5 s of silence, so the backend
 *    gets a signal even if the student is solving on paper and hasn't typed yet.
 *
 * Both triggers are silently no-ops when the tab is hidden.
 * All errors are swallowed — heartbeat failure must never affect the chat UX.
 */
export function useSessionHeartbeat(
  studentId: string | undefined,
  sessionId: string | undefined
) {
  const lastSentRef = useRef<number>(0);

  const send = (studentId: string, sessionId: string) => {
    if (document.visibilityState !== "visible") return;
    const now = Date.now();
    if (now - lastSentRef.current < ACTIVITY_DEBOUNCE_MS) return;
    lastSentRef.current = now;
    studentService.sendHeartbeat(studentId, sessionId);
  };

  useEffect(() => {
    if (!studentId || !sessionId || !isValidUUID(sessionId)) return;

    // Periodic heartbeat
    const interval = setInterval(() => {
      send(studentId, sessionId);
    }, HEARTBEAT_INTERVAL_MS);

    // Activity-based heartbeat (typing / mouse movement)
    const onActivity = () => send(studentId, sessionId);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("mousemove", onActivity);

    // Send one immediately when the session mounts
    send(studentId, sessionId);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("mousemove", onActivity);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, sessionId]);
}
