"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 5_000;

/**
 * A single shared clock for every relative timestamp on the page.
 *
 * Returns `0` on the server and on the first client paint, so markup matches
 * across hydration; callers treat `0` as "not mounted yet" and render an
 * absolute value instead. After mount it returns the current epoch ms and
 * re-renders subscribers on each tick, driven by one interval no matter how
 * many components are listening.
 */
const subscribers = new Set<() => void>();
let handle: ReturnType<typeof setInterval> | null = null;
let snapshot = 0;

function subscribe(onStoreChange: () => void): () => void {
  subscribers.add(onStoreChange);
  if (handle === null) {
    snapshot = Date.now();
    handle = setInterval(() => {
      snapshot = Date.now();
      subscribers.forEach((fn) => fn());
    }, TICK_MS);
  }
  return () => {
    subscribers.delete(onStoreChange);
    if (subscribers.size === 0 && handle !== null) {
      clearInterval(handle);
      handle = null;
    }
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => 0;

/** Current epoch ms, or `0` before the component has mounted on the client. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
