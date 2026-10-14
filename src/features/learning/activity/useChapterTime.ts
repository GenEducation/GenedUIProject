import { useEffect, useState } from "react";
import { activityService } from "./activityService";

/** The chapter's total is read again this often while the tab is visible (credit arrives beat by beat). */
export const CHAPTER_REFRESH_MS = 60_000;

/**
 * Estimated minutes the learner has spent on this chapter across every sitting and every lesson attempt of it
 * (backend `GET /students/{id}/time/by-chapter`: credited presence, never the wall clock). `null` until known or when it
 * cannot be read; a chapter with no credit yet is 0.
 */
export function useChapterTime(studentId: string | undefined, chapterId: string | undefined): number | null {
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!studentId || !chapterId) return;
    let cancelled = false;
    const read = () => {
      if (document.visibilityState !== "visible") return;
      activityService
        .chapterTimes(studentId)
        .then((rows) => {
          if (!cancelled) setMinutes(rows.find((r) => r.chapter_id === chapterId)?.total_minutes ?? 0);
        })
        .catch(() => undefined); // keep what was last read
    };
    read();
    const poll = window.setInterval(read, CHAPTER_REFRESH_MS);
    document.addEventListener("visibilitychange", read);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", read);
    };
  }, [studentId, chapterId]);

  return studentId && chapterId ? minutes : null;
}

/** 0 → "<1 min"; 12.4 → "12 min"; 135 → "2h 15m". An estimate, so shown rounded. */
export function formatEstimate(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 1) return "<1 min";
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
