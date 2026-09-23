"use client";

import { useEffect, useRef, useState } from "react";

/** Activity that counts as the person still being here. */
const ACTIVITY_EVENTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
] as const;

/**
 * `true` once there has been no pointer, key, scroll or touch activity for
 * `delayMs`, and back to `false` on the next sign of life.
 *
 * The desk buddy uses this to doze off because *you* went quiet, which reads as
 * far more alive than dozing off because of the wall clock.
 *
 * **The listeners fire constantly, so state may only change when the boundary
 * is crossed.** `pointermove` alone can run at 60Hz; calling `setIdle(false)`
 * on every one of them would re-render the pet — and therefore re-render a
 * live SVG — sixty times a second while the mouse is moving. The timer lives
 * in a ref and `setIdle` is called only on a genuine transition, so an active
 * session costs zero renders.
 *
 * Starts `false` on the server and on the first client render, so it cannot
 * cause a hydration mismatch.
 */
export function useIdle(delayMs: number): boolean {
  const [idle, setIdle] = useState(false);
  // Mirrors `idle` for the event handlers, which must not re-subscribe when it
  // changes — resetting the listeners on every transition would be needless
  // churn, and reading state in a long-lived handler would go stale.
  const idleRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const goIdle = () => {
      if (idleRef.current) return;
      idleRef.current = true;
      setIdle(true);
    };

    const onActivity = () => {
      if (idleRef.current) {
        idleRef.current = false;
        setIdle(false);
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(goIdle, delayMs);
    };

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    timer = setTimeout(goIdle, delayMs);

    return () => {
      if (timer) clearTimeout(timer);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity);
      }
    };
  }, [delayMs]);

  return idle;
}
