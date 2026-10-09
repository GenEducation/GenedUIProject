"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { asError } from "@/utils/errors";
import { learnerService } from "./learnerService";
import type { LearnerChaptersOut } from "./types";

/**
 * The chapters a student can open for one subject. `refresh` reloads the list,
 * e.g. for fresh card URLs once a signature has expired.
 */
export function useLearnerChapters(subject: string) {
  const [data, setData] = useState<LearnerChaptersOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Drops a response from a superseded request (subject changed mid-flight).
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const gen = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const next = await learnerService.chapters(subject);
      if (gen === generation.current) setData(next);
    } catch (e) {
      if (gen === generation.current) setError(asError(e).message || "Couldn't load your chapters.");
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }, [subject]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
