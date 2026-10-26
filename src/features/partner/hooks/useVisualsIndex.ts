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

/** Visuals per page: the most the backend serves at once. */
export const INDEX_LIMIT = 200;
/**
 * Pages read per state before stopping (5,000 visuals). Only past this does a badge say "+", and only on the chapters
 * whose visuals reach the last page read: theirs may go on beyond it.
 */
export const INDEX_MAX_PAGES = 25;
/** While an ingestion is running, and for a while after, look for new visuals this often. */
export const INDEX_POLL_MS = 30_000;
/** Polls after the last ingestion finishes (visuals are submitted at the end of the run). */
export const INDEX_POLL_MAX = 20;

const STATES: CandidateState[] = ["pending", "accepted", "rejected"];

/** Every visual in `state`, page by page (newest first), and whether it stopped at `INDEX_MAX_PAGES` with more left. */
async function listAll(state: CandidateState): Promise<{ visuals: VisualSummary[]; lastPage: VisualSummary[]; cut: boolean }> {
  const visuals: VisualSummary[] = [];
  let page: VisualSummary[] = [];
  for (let n = 0; n < INDEX_MAX_PAGES; n++) {
    const last = page.at(-1);
    page = await visualsService.listCandidates({
      state,
      limit: INDEX_LIMIT,
      ...(last ? { before: last.created_at, before_id: last.id } : {}),
    });
    visuals.push(...page);
    if (page.length < INDEX_LIMIT) return { visuals, lastPage: page, cut: false };
  }
  return { visuals, lastPage: page, cut: true };
}

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
  // Chapters whose pending count may be short: only when the pages ran out before the visuals did.
  const [pendingCut, setPendingCut] = useState<Set<string>>(new Set());
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const lists = await Promise.all(STATES.map(listAll));
      if (!mounted.current) return;
      setCounts(tally(lists.map((l) => l.visuals)));
      const pending = lists[0];
      setPendingCut(new Set(pending.cut ? pending.lastPage.map((v) => v.source_id) : []));
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
  /** Whether this chapter's pending count may be short of the real one (badge shows "+"). */
  const pendingMayBeMore = useCallback((subject: Subject) => pendingCut.has(subject.source_id), [pendingCut]);

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

  return { countsFor, pendingMayBeMore, refresh };
}
