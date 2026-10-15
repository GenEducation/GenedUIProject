"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/authFetch";
import type { ReportBody } from "@/components/report-card/v1Report";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export interface ChaptersCompleted {
  completed: number;
  total: number;
}

/**
 * The learner's chapters completed out of all their chapters, from the report card's own read
 * (`GET /v1/learner/report`) and counted by the report card's rule (completed, or fully covered), so the home
 * card and the report card's header always agree.
 *
 * `undefined` while loading, `null` if it could not be loaded.
 */
export function useChaptersCompleted(studentId: string | undefined): ChaptersCompleted | null | undefined {
  const [state, setState] = useState<{ id: string; value: ChaptersCompleted | null } | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    authFetch(`${API}/v1/learner/report`, { headers: { accept: "application/json" } })
      .then((r) => r.json() as Promise<ReportBody>)
      .then((body) => {
        if (cancelled) return;
        const chapters = body.chapters ?? [];
        const completed = chapters.filter((c) => c.status === "completed" || c.completion >= 1).length;
        setState({ id: studentId, value: { completed, total: chapters.length } });
      })
      .catch((err) => {
        console.warn("[Home] Could not load chapters completed:", err);
        if (!cancelled) setState({ id: studentId, value: null });
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return state && state.id === studentId ? state.value : undefined;
}
