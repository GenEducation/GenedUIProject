import { useCallback, useEffect, useRef, useState } from "react";
import type { ReportWho } from "../v1Report";
import { INSIGHT_POLLING, loadInsights, refreshInsights, type InsightsResponse } from "./reportSections";
import type { SectionState } from "./useSection";

export interface InsightsHandle {
  state: SectionState<InsightsResponse>;
  /** Read it again after a failed read. */
  retry: () => void;
  /** The reload button: write a new note now (a student's own report; the backend throttles it). */
  reload: () => void;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The written note (`GET /v1/learner/insights`). A note is written in the background after a session ends or on reload, so a
 * read that says `refreshing` is read again every few seconds (the previous note stays on screen meanwhile) until it settles.
 * A null `who` reads nothing (the teacher's report).
 */
export function useInsights(who: ReportWho | null, key: string): InsightsHandle | null {
  const [result, setResult] = useState<{ key: string; ticket: number; state: SectionState<InsightsResponse> } | null>(null);
  const [ticket, setTicket] = useState(0);
  const whoRef = useRef(who);
  useEffect(() => {
    whoRef.current = who;
  });
  const reloadAsked = useRef(false);
  const offered = who != null;

  useEffect(() => {
    const target = whoRef.current;
    if (!offered || !target) return;
    let cancelled = false;
    const show = (state: SectionState<InsightsResponse>) => !cancelled && setResult({ key, ticket, state });
    void (async () => {
      try {
        const reload = reloadAsked.current;
        reloadAsked.current = false;
        let response = await (reload ? refreshInsights() : loadInsights(target));
        show({ status: "ready", data: response });
        for (let i = 0; i < INSIGHT_POLLING.max && response.refreshing && !cancelled; i++) {
          await sleep(INSIGHT_POLLING.ms);
          if (cancelled) return;
          response = await loadInsights(target);
          show({ status: "ready", data: response });
        }
      } catch {
        show({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, ticket, offered]);

  const retry = useCallback(() => setTicket((n) => n + 1), []);
  const reload = useCallback(() => {
    reloadAsked.current = true;
    setTicket((n) => n + 1);
  }, []);
  if (!offered) return null;
  const state = result && result.key === key && result.ticket === ticket ? result.state : ({ status: "loading" } as const);
  return { state, retry, reload };
}
