import { useEffect, useState } from "react";

/**
 * Seconds the learner has spent on this lesson screen. Client-side only: the
 * backend has no session clock. It counts while the tab is visible, so a lesson
 * left open in a background tab doesn't inflate the time.
 */
export function useSessionTimer(): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
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
