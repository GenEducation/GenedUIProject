"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadStudentSubjects } from "@/store/useAnalyticsStore";
import { studentService } from "@/features/student/services/studentService";
import type { ExactSubject } from "@/features/subjects/subjectCatalog";
import { parentService, type StudyTimePoint } from "../services/parentService";
import {
  chapterProgress,
  DEFAULT_PERIOD,
  fillDailySeries,
  minutesBySubject,
  periodOption,
  sessionTrendPct,
  totalMinutes,
  weeklySeries,
  type ActivityPoint,
  type PeriodKey,
} from "../utils/homeMetrics";

export type LoadState = "loading" | "ready" | "error";

export interface SubjectSummary {
  subject: ExactSubject;
  state: LoadState;
  /** 0–100, from the subject's skill summary. */
  mastery: number | null;
  sessions: number | null;
  /** Null while unknown; 0 is a real "no time logged". */
  minutes: number | null;
  chapters: { started: number; total: number } | null;
}

export interface ParentHomeData {
  subjects: { state: LoadState; items: SubjectSummary[] };
  sessions: { state: LoadState; total: number | null; trendPct: number | null };
  activity: { state: LoadState; series: ActivityPoint[]; totalMinutes: number | null };
  period: PeriodKey;
  setPeriod: (period: PeriodKey) => void;
}

/**
 * Everything the parent Home page shows for one child. Each section loads and
 * fails on its own so one slow or missing endpoint never blanks the page; a
 * child switch abandons the previous child's requests.
 */
export function useParentHomeData(studentId: string | null): ParentHomeData {
  const [subjectState, setSubjectState] = useState<LoadState>("loading");
  const [items, setItems] = useState<SubjectSummary[]>([]);
  const [chapterMinutes, setChapterMinutes] = useState<Record<string, number> | null | undefined>(undefined);
  const [sessionDates, setSessionDates] = useState<string[] | null | undefined>(undefined);
  const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD);
  const [timePoints, setTimePoints] = useState<{ key: string; points: StudyTimePoint[] | null } | null>(null);
  const timeCache = useRef(new Map<string, StudyTimePoint[] | null>());

  // ── Subjects, per-subject summaries, time by chapter, session dates ──────
  useEffect(() => {
    if (!studentId) return;
    const controller = new AbortController();
    let live = true;
    setSubjectState("loading");
    setItems([]);
    setChapterMinutes(undefined);
    setSessionDates(undefined);
    timeCache.current.clear();

    parentService.fetchTimeByChapter(studentId).then((rows) => {
      if (live) setChapterMinutes(rows ? minutesBySubject(rows) : null);
    });
    parentService.fetchSessionDates(studentId).then((dates) => {
      if (live) setSessionDates(dates);
    });

    loadStudentSubjects(studentId, controller.signal)
      .then((subjects) => {
        if (!live) return;
        setItems(subjects.map((subject) => ({
          subject, state: "loading", mastery: null, sessions: null, minutes: null, chapters: null,
        })));
        setSubjectState("ready");

        subjects.forEach((subject) => {
          Promise.allSettled([
            studentService.fetchSkillSummary(studentId, subject),
            studentService.fetchChapterMastery(studentId, subject, controller.signal),
          ]).then(([summary, chapters]) => {
            if (!live) return;
            const s = summary.status === "fulfilled" ? summary.value : null;
            const score = Number(s?.overall_score);
            const count = Number(s?.session_count);
            const rows = chapters.status === "fulfilled" && Array.isArray(chapters.value) ? chapters.value : null;
            setItems((prev) => prev.map((item) => item.subject !== subject ? item : {
              ...item,
              state: s || rows ? "ready" : "error",
              mastery: s && Number.isFinite(score) ? Math.round(score * 100) : null,
              sessions: s && Number.isFinite(count) ? count : s ? 0 : null,
              chapters: rows ? chapterProgress(rows) : null,
            }));
          });
        });
      })
      .catch(() => {
        if (live) setSubjectState("error");
      });

    return () => {
      live = false;
      controller.abort();
    };
  }, [studentId]);

  // ── Study time series for the chosen period ──────────────────────────────
  const { granularity } = periodOption(period);
  useEffect(() => {
    if (!studentId) return;
    const key = `${studentId}:${granularity}`;
    if (timeCache.current.has(key)) {
      setTimePoints({ key, points: timeCache.current.get(key) ?? null });
      return;
    }
    let live = true;
    setTimePoints(null);
    parentService.fetchTimeByPeriod(studentId, granularity).then((points) => {
      timeCache.current.set(key, points);
      if (live) setTimePoints({ key, points });
    });
    return () => { live = false; };
  }, [studentId, granularity]);

  // Time per subject comes from the chapter breakdown; fold it in.
  const subjectItems = useMemo(
    () => items.map((item) => ({
      ...item,
      minutes: chapterMinutes === undefined ? null : Math.round(chapterMinutes?.[item.subject] ?? 0),
    })),
    [items, chapterMinutes],
  );

  const sessions = useMemo<ParentHomeData["sessions"]>(() => {
    const settled = subjectItems.filter((i) => i.state !== "loading");
    const counted = settled.filter((i) => i.sessions !== null);
    const stillLoading = subjectState === "loading" || settled.length < subjectItems.length || sessionDates === undefined;
    if (stillLoading) return { state: "loading", total: null, trendPct: null };
    if (subjectState === "error" || (subjectItems.length > 0 && counted.length === 0)) {
      return { state: "error", total: null, trendPct: null };
    }
    return {
      state: "ready",
      total: counted.reduce((sum, i) => sum + (i.sessions ?? 0), 0),
      trendPct: sessionDates ? sessionTrendPct(sessionDates) : null,
    };
  }, [subjectItems, subjectState, sessionDates]);

  const activity = useMemo<ParentHomeData["activity"]>(() => {
    const expectedKey = `${studentId}:${granularity}`;
    if (!timePoints || timePoints.key !== expectedKey) return { state: "loading", series: [], totalMinutes: null };
    if (!timePoints.points) return { state: "error", series: [], totalMinutes: null };
    const { days } = periodOption(period);
    const series = days ? fillDailySeries(timePoints.points, days) : weeklySeries(timePoints.points);
    return { state: "ready", series, totalMinutes: totalMinutes(series) };
  }, [timePoints, studentId, granularity, period]);

  return {
    subjects: { state: subjectState, items: subjectItems },
    sessions,
    activity,
    period,
    setPeriod,
  };
}
