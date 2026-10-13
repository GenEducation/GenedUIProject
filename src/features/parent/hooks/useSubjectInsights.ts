"use client";

import { useEffect, useState } from "react";
import {
  loadStudentSubjects,
  type OverallHistoryPoint,
  type SkillProgressionEntry,
  type SkillTreeConceptGroup,
} from "@/store/useAnalyticsStore";
import { studentService, type ChapterMastery } from "@/features/student/services/studentService";
import type { LoadState } from "./useParentHomeData";
import {
  buildSkillAreas,
  chapterRows,
  movers,
  overallTrend,
  toPct,
  type ChapterInsight,
  type Mover,
  type SkillArea,
  type TrendPoint,
} from "../components/subject/insights";

export interface Section<T> {
  state: LoadState;
  data: T;
}

export interface SubjectInsights {
  /** "invalid" once the subject turns out not to be this child's. */
  subjectState: "checking" | "valid" | "invalid";
  summary: Section<{ mastery: number | null; sessions: number | null }>;
  skills: Section<SkillArea[]>;
  trend: Section<TrendPoint[]>;
  movers: Section<Mover[]>;
  chapters: Section<ChapterInsight[]>;
}

const loading = <T,>(data: T): Section<T> => ({ state: "loading", data });

const INITIAL: SubjectInsights = {
  subjectState: "checking",
  summary: loading({ mastery: null, sessions: null }),
  skills: loading([]),
  trend: loading([]),
  movers: loading([]),
  chapters: loading([]),
};

const asArray = <T,>(value: unknown): T[] | null => (Array.isArray(value) ? (value as T[]) : null);

/**
 * Everything the parent's subject page shows, fetched for this child and
 * subject only (never through the shared analytics store, so it can't show
 * another child's figures). Each section settles on its own; a failing
 * endpoint empties just its section.
 */
export function useSubjectInsights(studentId: string, subject: string): SubjectInsights {
  // Tagged with the child and subject they belong to, so a switch shows the
  // loading state straight away instead of the previous subject's figures.
  const key = `${studentId}\u0000${subject}`;
  const [store, setStore] = useState<{ key: string; value: SubjectInsights }>({ key, value: INITIAL });

  useEffect(() => {
    let live = true;
    const setInsights = (update: (prev: SubjectInsights) => SubjectInsights) =>
      setStore((prev) => ({ key, value: update(prev.key === key ? prev.value : INITIAL) }));

    loadStudentSubjects(studentId)
      .then((subjects) => {
        if (!live) return;
        if (!subjects.some((s) => s === subject)) {
          setInsights((prev) => ({ ...prev, subjectState: "invalid" }));
          return;
        }
        setInsights((prev) => ({ ...prev, subjectState: "valid" }));

        Promise.allSettled([
          studentService.fetchSkillSummary(studentId, subject),
          studentService.fetchCGScores(studentId, subject),
          studentService.fetchSkillTree(studentId, subject),
        ]).then(([summary, scores, tree]) => {
          if (!live) return;
          const s = summary.status === "fulfilled" ? summary.value : null;
          const count = Number(s?.session_count);
          const cg = scores.status === "fulfilled" ? asArray<{ cg_id: string; cg_name?: string; avg_mastery?: number }>(scores.value) : null;
          const groups = tree.status === "fulfilled" ? asArray<SkillTreeConceptGroup>(tree.value) : null;
          setInsights((prev) => ({
            ...prev,
            summary: {
              state: s && typeof s === "object" ? "ready" : "error",
              data: {
                mastery: toPct(s?.overall_score),
                sessions: Number.isFinite(count) ? count : null,
              },
            },
            skills: cg || groups
              ? { state: "ready", data: buildSkillAreas(cg ?? [], groups ?? []) }
              : { state: "error", data: [] },
          }));
        });

        Promise.allSettled([
          studentService.fetchSkillProfileHistory(studentId, subject),
          studentService.fetchSkillProgression(studentId, subject),
        ]).then(([history, progression]) => {
          if (!live) return;
          const points = history.status === "fulfilled" ? asArray<OverallHistoryPoint>(history.value?.history) : null;
          const skills = progression.status === "fulfilled" ? asArray<SkillProgressionEntry>(progression.value) : null;
          setInsights((prev) => ({
            ...prev,
            trend: points ? { state: "ready", data: overallTrend(points) } : { state: "error", data: [] },
            movers: skills ? { state: "ready", data: movers(skills) } : { state: "error", data: [] },
          }));
        });

        studentService
          .fetchChapterMastery(studentId, subject)
          .then((rows) => {
            if (!live) return;
            const list = asArray<ChapterMastery>(rows);
            setInsights((prev) => ({
              ...prev,
              chapters: list ? { state: "ready", data: chapterRows(list) } : { state: "error", data: [] },
            }));
          })
          .catch(() => {
            if (live) setInsights((prev) => ({ ...prev, chapters: { state: "error", data: [] } }));
          });
      })
      .catch(() => {
        if (live) setInsights((prev) => ({ ...prev, subjectState: "invalid" }));
      });

    return () => {
      live = false;
    };
  }, [key, studentId, subject]);

  return store.key === key ? store.value : INITIAL;
}
