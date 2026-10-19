"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VisualDetail } from "../types/visuals";
import { visualsService } from "../services/visualsService";
import { asError } from "@/utils/errors";

/** Regeneration runs on a 30 s worker poll; checking every 12 s keeps the wait short without hammering. */
export const REGEN_POLL_MS = 12_000;

const isRegenerating = (detail: VisualDetail | null) =>
  detail?.regeneration?.state === "queued" || detail?.regeneration?.state === "claimed";

/**
 * One visual's detail. While its regeneration is `queued` or `claimed` the
 * detail is re-read every `REGEN_POLL_MS`; polling stops on `done`/`failed`,
 * when the id changes, and on unmount.
 */
export function useVisualDetail(id: string | null) {
  const [detail, setDetail] = useState<VisualDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The id a response must still match to be applied (the user may have moved on).
  const currentId = useRef(id);
  useEffect(() => {
    currentId.current = id;
  }, [id]);

  const load = useCallback(
    async (quiet = false) => {
      if (!id) return;
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const next = await visualsService.getCandidate(id);
        if (currentId.current === id) setDetail(next);
      } catch (e) {
        if (currentId.current === id) setError(asError(e).message || "Couldn't load this visual.");
      } finally {
        if (currentId.current === id && !quiet) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    setDetail(null);
    void load();
  }, [load]);

  const polling = isRegenerating(detail);
  useEffect(() => {
    if (!polling) return;
    const timer = setTimeout(() => void load(true), REGEN_POLL_MS);
    return () => clearTimeout(timer);
    // `detail` in deps re-arms the timer after each poll lands.
  }, [polling, detail, load]);

  /** Re-read without blanking the panel (after a 409, a decision, or an expired image). */
  const reload = useCallback(() => load(true), [load]);

  return { detail, loading, error, reload, polling };
}
