import { useEffect, useState } from "react";

const KEY = (instanceId: string) => `gened_lesson_seconds_${instanceId}`;

function readSeconds(instanceId: string | null): number {
  if (!instanceId) return 0;
  try {
    const stored = Number(window.sessionStorage.getItem(KEY(instanceId)));
    return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0;
  } catch {
    return 0; // storage blocked: the count starts again
  }
}

/**
 * Seconds the learner has spent on this lesson in this browser tab. Client-side only: the backend has no session clock.
 * It counts while the tab is visible, so a lesson left open in a background tab doesn't inflate the time, and it is
 * kept per lesson, so a reload or a remount of the screen continues the count and does not start from zero.
 */
export function useSessionTimer(instanceId: string | null = null): number {
  // The count belongs to one lesson: a different one (or one that was not known at first render) reads its own.
  const [counted, setCounted] = useState<{ id: string | null; seconds: number }>(() => ({
    id: instanceId,
    seconds: readSeconds(instanceId),
  }));
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setCounted((c) => ({ id: instanceId, seconds: (c.id === instanceId ? c.seconds : readSeconds(instanceId)) + 1 }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [instanceId]);
  const seconds = counted.id === instanceId ? counted.seconds : readSeconds(instanceId);
  // Kept as it counts, so a reload or a remount of the screen continues from here.
  useEffect(() => {
    if (!instanceId || seconds === 0) return;
    try {
      window.sessionStorage.setItem(KEY(instanceId), String(seconds));
    } catch {
      /* blocked storage: the count just isn't kept */
    }
  }, [instanceId, seconds]);
  return seconds;
}

/** 75 → "01:15"; 3725 → "1:02:05". */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
