"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { asError } from "@/utils/errors";
import { learnerService } from "./learnerService";
import type { RecentChapter } from "./types";

/**
 * The chapters the student last worked on, newest first, for the home page's Continue learning card and recent
 * list. Waits until `enabled` (a signed-in student). `refresh` reloads, e.g. for fresh card URLs once a
 * signature has expired.
 */
export function useRecentChapters(enabled: boolean, limit = 20) {
  const [chapters, setChapters] = useState<RecentChapter[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const gen = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const out = await learnerService.recentChapters(limit);
      if (gen === generation.current) setChapters(Array.isArray(out?.chapters) ? out.chapters : []);
    } catch (e) {
      if (gen === generation.current) setError(asError(e).message || "Couldn't load your recent chapters.");
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  return { chapters, loading, error, refresh };
}
