import { useCallback, useEffect, useRef, useState } from "react";

export type SectionState<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

export interface Section<T> {
  state: SectionState<T>;
  retry: () => void;
}

const LOADING = { status: "loading" } as const;

/**
 * One section's read: loading, then ready or error. `load` is read again by `retry` and whenever `key` changes (a
 * different learner), never because a new closure was passed. A null `load` reads nothing (the section isn't offered).
 * What a read produced is kept with the key and attempt that asked for it, so a different learner or a retry shows
 * "loading" until its own answer arrives, and an answer to an earlier ask is never shown.
 */
export function useSection<T>(load: (() => Promise<T>) | null, key: string): Section<T> | null {
  const [result, setResult] = useState<{ key: string; attempt: number; state: SectionState<T> } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const offered = load != null;

  useEffect(() => {
    const read = loadRef.current;
    if (!offered || !read) return;
    let cancelled = false;
    read().then(
      (data) => !cancelled && setResult({ key, attempt, state: { status: "ready", data } }),
      () => !cancelled && setResult({ key, attempt, state: { status: "error" } }),
    );
    return () => {
      cancelled = true;
    };
  }, [key, attempt, offered]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  if (!offered) return null;
  const state = result && result.key === key && result.attempt === attempt ? result.state : LOADING;
  return { state, retry };
}
