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

/**
 * The lesson header's clock: this chapter's credited time (`useChapterTime`) in seconds, counting on between the
 * server's reads while the tab is visible, so it runs like a clock rather than jumping a minute at a time. Each read
 * puts it back on the server's figure, which stays the truth (credited presence across every sitting, never the wall
 * clock). `null` until the server has answered once.
 */
export function useChapterClock(studentId: string | undefined, chapterId: string | undefined): number | null {
  const minutes = useChapterTime(studentId, chapterId);
  const [extra, setExtra] = useState<{ base: number | null; seconds: number }>({ base: null, seconds: 0 });

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setExtra((e) => ({ ...e, seconds: e.seconds + 1 }));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (minutes === null) return null;
  const base = Math.round(minutes * 60);
  // A new read restarts the count from the server's figure.
  if (extra.base !== base) {
    setExtra({ base, seconds: 0 });
    return base;
  }
  return base + extra.seconds;
}
