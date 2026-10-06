"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CandidateState, VisualSummary } from "../types/visuals";
import { visualsService } from "../services/visualsService";
import { asError } from "@/utils/errors";

export const LIST_PAGE_SIZE = 24;

/**
 * One tab of the review popup: the visuals of one chapter source with
 * `state`, newest first, paged by `before` = the last item's `created_at`.
 * A null `sourceId` loads nothing.
 */
export function useVisualsList(sourceId: string | null, state: CandidateState) {
  const [items, setItems] = useState<VisualSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const cursor = useRef<string | undefined>(undefined);
  // Drops responses from a superseded request (tab switched mid-flight).
  const generation = useRef(0);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (!sourceId) return;
      const gen = reset ? ++generation.current : generation.current;
      setLoading(true);
      setError(null);
      try {
        const page = await visualsService.listCandidates({
          source_id: sourceId,
          state,
          limit: LIST_PAGE_SIZE,
          before: reset ? undefined : cursor.current,
        });
        if (gen !== generation.current) return;
        cursor.current = page.length ? page[page.length - 1].created_at : cursor.current;
        setHasMore(page.length >= LIST_PAGE_SIZE);
        setItems((prev) => (reset ? page : [...prev, ...page.filter((v) => !prev.some((p) => p.id === v.id))]));
      } catch (e) {
        if (gen !== generation.current) return;
        setError(asError(e).message || "Couldn't load visuals.");
      } finally {
        if (gen === generation.current) setLoading(false);
      }
    },
    [sourceId, state],
  );

  const refresh = useCallback(() => {
    cursor.current = undefined;
    return fetchPage(true);
  }, [fetchPage]);

  const loadMore = useCallback(() => fetchPage(false), [fetchPage]);

  useEffect(() => {
    setItems([]);
    void refresh();
  }, [refresh]);

  return { items, loading, error, hasMore, refresh, loadMore };
}
