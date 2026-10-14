"use client";

import { useEffect, type RefObject } from "react";
import { useLessonStore } from "../useLessonStore";

/** How much of the card must be in view to count as shown. */
const SHOWN_RATIO = 0.25;

/**
 * Tells the lesson store while a check card is actually on screen: laid out (not in a hidden tab), intersecting the viewport
 * and the browser tab visible. The store confirms the delivery to the backend the first time this turns true in a session
 * and round (backend ADR 0035 decision 5). Without `IntersectionObserver`, a mounted card counts as shown.
 */
export function useCheckShown(ref: RefObject<Element | null>, itemId: string): void {
  const setCheckVisible = useLessonStore((s) => s.setCheckVisible);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let intersecting = typeof IntersectionObserver === "undefined";
    const apply = () => setCheckVisible(itemId, intersecting && document.visibilityState !== "hidden");
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              intersecting = entries.at(-1)?.isIntersecting ?? false;
              apply();
            },
            { threshold: SHOWN_RATIO },
          );
    observer?.observe(element);
    document.addEventListener("visibilitychange", apply);
    apply();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", apply);
      setCheckVisible(itemId, false);
    };
  }, [ref, itemId, setCheckVisible]);
}
