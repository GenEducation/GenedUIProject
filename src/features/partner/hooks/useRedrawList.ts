"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RedrawItem } from "../types/visuals";
import { visualsService } from "../services/visualsService";
import { asError } from "@/utils/errors";

/** While a redraw of the chapter is queued or drawing, re-read the list this often (the detail pane's pace). */
export const REDRAW_LIST_POLL_MS = 12_000;

/**
 * Every redraw asked for in one chapter, newest first, with its state. Polls
 * while one is still queued or drawing, so a redraw turns "ready" without a
 * reload. A null `sourceId` loads nothing.
 */
export function useRedrawList(sourceId: string | null) {
  const [items, setItems] = useState<RedrawItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!sourceId) return;
    const gen = ++generation.current;
    setLoading(true);
    try {
      const found = await visualsService.redraws([sourceId]);
      if (gen !== generation.current) return;
      setItems(found);
      setError(null);
    } catch (e) {
      if (gen === generation.current)
        setError(asError(e).message || "Couldn't load the redraws.");
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }, [sourceId]);

  useEffect(() => {
    void refresh();
    // A response for a chapter no longer shown is dropped.
    const current = generation;
    return () => {
      current.current++;
    };
  }, [refresh]);

  const anyRunning = items.some(
    (r) => r.state === "queued" || r.state === "drawing",
  );
  useEffect(() => {
    if (!anyRunning) return;
    const timer = setTimeout(() => void refresh(), REDRAW_LIST_POLL_MS);
    return () => clearTimeout(timer);
  }, [anyRunning, items, refresh]);

  return { items, loading, error, refresh };
}
