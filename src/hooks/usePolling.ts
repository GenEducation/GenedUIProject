"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PollingResult<T> {
  data: T | null;
  error: string;
  /** True only for the first load, so refreshes don't blank the screen. */
  isLoading: boolean;
  /** True for background refreshes once data is on screen. */
  isRefreshing: boolean;
  lastUpdatedAt: Date | null;
  refresh: () => void;
}

/**
 * Fetch on mount, then on an interval, keeping the previous data visible while
 * refreshing.
 *
 * Polling is suspended while the tab is hidden and fires immediately when the
 * user comes back — a background tab shouldn't hammer the fleet endpoints, and
 * an admin returning to the tab should never read stale numbers.
 *
 * `fetcher` is captured in a ref, so callers don't have to memoise it to avoid
 * restarting the interval on every render.
 */
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs = 30_000): PollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const hasDataRef = useRef(false);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const run = useCallback(async () => {
    // Never stack requests: a slow fleet fetch shouldn't queue up behind itself.
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (hasDataRef.current) setIsRefreshing(true);
    try {
      const next = await fetcherRef.current();
      if (!mountedRef.current) return;
      setData(next);
      setError("");
      hasDataRef.current = true;
      setLastUpdatedAt(new Date());
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void run();

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void run();
    };
    const interval = setInterval(tick, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [run, intervalMs]);

  return { data, error, isLoading, isRefreshing, lastUpdatedAt, refresh: run };
}
