"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Subject } from "../store/usePartnerStore";
import type { VisualReviewSummary } from "../types/visuals";
import { visualsService } from "../services/visualsService";

/** While any chapter has a redraw queued or drawing, re-read the tallies this often. */
export const REDRAW_POLL_MS = 30_000;
/** Chapters per summary call: the backend's limit. */
export const SUMMARY_CHUNK = 100;

const running = (s: VisualReviewSummary | undefined) => !!s && s.redraws.queued + s.redraws.drawing > 0;

/**
 * Each chapter's visual review tally (pictures reviewed, accepted, rejected,
 * and its redraws by state) for the registry, in one call per 100 chapters.
 *
 * Polls only while some chapter has a redraw queued or drawing, skipping
 * ticks while the tab is hidden. When a chapter's last running redraw lands
 * while the page is open, its id goes into `justReady`: the registry says
 * "all redraws are ready to review" until the partner dismisses it or opens
 * the chapter's visuals. Failures are swallowed: the last tallies stay.
 */
export function useRedrawSummary(subjects: Subject[]) {
  const [summaries, setSummaries] = useState<Map<string, VisualReviewSummary>>(new Map());
  const [justReady, setJustReady] = useState<string[]>([]);
  const previous = useRef<Map<string, VisualReviewSummary>>(new Map());
  const mounted = useRef(true);
  const ids = [...new Set(subjects.map((s) => s.source_id).filter(Boolean))].sort();
  const signature = ids.join(",");

  const refresh = useCallback(async () => {
    const sourceIds = signature ? signature.split(",") : [];
    if (!sourceIds.length) return;
    try {
      const chunks: string[][] = [];
      for (let i = 0; i < sourceIds.length; i += SUMMARY_CHUNK) chunks.push(sourceIds.slice(i, i + SUMMARY_CHUNK));
      const found = (await Promise.all(chunks.map((c) => visualsService.summary(c)))).flat();
      if (!mounted.current) return;
      const next = new Map(found.map((s) => [s.source_id, s]));
      const landed = found
        .filter((s) => running(previous.current.get(s.source_id)) && !running(s) && s.redraws.ready > 0)
        .map((s) => s.source_id);
      previous.current = next;
      setSummaries(next);
      if (landed.length) setJustReady((ready) => [...new Set([...ready, ...landed])]);
    } catch {
      // Keep the last known tallies.
    }
  }, [signature]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const anyRunning = [...summaries.values()].some(running);
  useEffect(() => {
    if (!anyRunning) return;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void refresh();
    }, REDRAW_POLL_MS);
    return () => clearInterval(timer);
  }, [anyRunning, refresh]);

  const summaryFor = useCallback(
    (subject: Pick<Subject, "source_id">): VisualReviewSummary | null => summaries.get(subject.source_id) ?? null,
    [summaries],
  );
  const dismissReady = useCallback((sourceId: string) => setJustReady((ready) => ready.filter((id) => id !== sourceId)), []);

  return { summaryFor, refresh, justReady, dismissReady };
}
