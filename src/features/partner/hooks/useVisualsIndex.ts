"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Subject } from "../store/usePartnerStore";
import type { CandidateState, VisualSummary } from "../types/visuals";
import { ACTIVE_STATES } from "../types/sources";
import { visualsService } from "../services/visualsService";

export interface VisualCounts {
  pending: number;
  accepted: number;
  rejected: number;
}

/** One page per state; a full page shows as "200+" on the badge. */
export const INDEX_LIMIT = 200;
/** While an ingestion is running, and for a while after, look for new visuals this often. */
export const INDEX_POLL_MS = 30_000;
/** Polls after the last ingestion finishes (visuals are submitted at the end of the run). */
export const INDEX_POLL_MAX = 20;

const STATES: CandidateState[] = ["pending", "accepted", "rejected"];

/** Counts per `source_id`. */
function tally(lists: VisualSummary[][]): Map<string, VisualCounts> {
  const counts = new Map<string, VisualCounts>();
  lists.forEach((list, i) => {
    const state = STATES[i];
    for (const visual of list) {
      const entry = counts.get(visual.source_id) ?? { pending: 0, accepted: 0, rejected: 0 };
      entry[state] += 1;
      counts.set(visual.source_id, entry);
    }
  });
  return counts;
}

/**
 * Per-row visual counts for the Subject Registry, from three list calls in
 * total (one per state) instead of one call per row.
 *
 * Failures are swallowed: the icon simply does not appear. A 403 still signs
 * the user out inside `authFetch`, which is correct on a partner-only page.
 */
export function useVisualsIndex(subjects: Subject[]) {
  const [counts, setCounts] = useState<Map<string, VisualCounts>>(new Map());
  const [pendingFull, setPendingFull] = useState(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const lists = await Promise.all(
        STATES.map((state) => visualsService.listCandidates({ state, limit: INDEX_LIMIT })),
      );
      if (!mounted.current) return;
      setCounts(tally(lists));
      setPendingFull(lists[0].length >= INDEX_LIMIT);
    } catch {
      // Leave the last known counts in place.
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Reload when a row is added, removed or changes state (e.g. finishes ingesting).
  const signature = subjects.map((s) => `${s.id}:${s.state}`).join(",");
  useEffect(() => {
    void refresh();
  }, [signature, refresh]);

  const countsFor = useCallback((subject: Subject): VisualCounts | null => counts.get(subject.source_id) ?? null, [counts]);

  // No push channel for visuals: poll while an ingestion is running, then for
  // INDEX_POLL_MAX more tries once it finishes. Nothing polls on a registry
  // where no ingestion has run since the page opened.
  const anyInProgress = subjects.some((s) => ACTIVE_STATES.has(s.state));
  const sawInProgress = useRef(false);
  useEffect(() => {
    if (anyInProgress) sawInProgress.current = true;
    if (!sawInProgress.current) return;
    let triesAfter = 0;
    const timer = setInterval(() => {
      if (!anyInProgress && ++triesAfter > INDEX_POLL_MAX) {
        clearInterval(timer);
        return;
      }
      void refresh();
    }, INDEX_POLL_MS);
    return () => clearInterval(timer);
  }, [anyInProgress, refresh]);

  return { countsFor, pendingFull, refresh };
}
