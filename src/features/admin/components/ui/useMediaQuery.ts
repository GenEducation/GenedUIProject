"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a media query matches, kept live across resizes.
 *
 * Used where CSS alone would mean rendering a component twice (a table AND a
 * card list) and hiding one — which doubles every row in the DOM and in a
 * screen reader. `fallback` answers on the server and wherever `matchMedia`
 * does not exist (jsdom), so tests see the desktop layout.
 */
export function useMediaQuery(query: string, fallback: boolean): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : fallback),
    () => fallback,
  );
}
