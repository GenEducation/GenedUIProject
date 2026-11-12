"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadStudentSubjects } from "@/store/useAnalyticsStore";
import type { ExactSubject } from "@/features/subjects/subjectCatalog";
import { parentService, type ReportSubjectFacts, type StudyTimePoint } from "../services/parentService";
import {
  DEFAULT_PERIOD,
  fillDailySeries,
  subjectKey,
  periodOption,
  timeBySubject,
  totalMinutes,
  weeklySeries,
  type ActivityPoint,
  type PeriodKey,
} from "../utils/homeMetrics";

export type LoadState = "loading" | "ready" | "error";

/**
 * One subject card. For each figure, `undefined` is still loading and `null` is unavailable (the read failed, or the
 * report has nothing for the subject); 0 is a real zero.
 */
export interface SubjectSummary {
  subject: ExactSubject;
  /** The report (mastery, chapters) is still loading. */
  state: LoadState;
  /** 0–100, from the child's report; null when nothing is measured yet. */
  mastery: number | null | undefined;
  sessions: number | null | undefined;
  minutes: number | null | undefined;
  chapters: { started: number; total: number } | null | undefined;
}

type SubjectTime = Record<string, { minutes: number; sessions: number }>;

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
  const [subjects, setSubjects] = useState<ExactSubject[]>([]);
  // `undefined` while loading, `null` when the read failed.
  const [report, setReport] = useState<Map<string, ReportSubjectFacts> | null | undefined>(undefined);
  const [time, setTime] = useState<SubjectTime | null | undefined>(undefined);
  const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD);
  const [timePoints, setTimePoints] = useState<{ key: string; points: StudyTimePoint[] | null } | null>(null);
  const timeCache = useRef(new Map<string, StudyTimePoint[] | null>());

  // ── Subjects, the child's report (mastery, chapters), time and sessions by chapter ──────
  useEffect(() => {
    if (!studentId) return;
    const controller = new AbortController();
    let live = true;
    setSubjectState("loading");
    setSubjects([]);
    setReport(undefined);
    setTime(undefined);
    timeCache.current.clear();

    parentService.fetchTimeByChapter(studentId).then((rows) => {
      if (live) setTime(rows ? timeBySubject(rows) : null);
    });
    parentService.fetchReportSubjects(studentId).then((rows) => {
      if (!live) return;
      // Matched to the page's subject names by code or name: the backend names a subject by its code.
      const bySubject = new Map<string, ReportSubjectFacts>();
      for (const r of rows ?? []) {
        if (r.code) bySubject.set(subjectKey(r.code), r);
        if (r.name) bySubject.set(subjectKey(r.name), r);
      }
      setReport(rows ? bySubject : null);
    });

    loadStudentSubjects(studentId, controller.signal, true)
      .then((list) => {
        if (!live) return;
        setSubjects(list);
        setSubjectState("ready");
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

  const subjectItems = useMemo<SubjectSummary[]>(
    () =>
      subjects.map((subject) => {
        const key = subjectKey(subject);
        const facts = report?.get(key);
        const spent = time === undefined ? undefined : time === null ? null : (time[key] ?? { minutes: 0, sessions: 0 });
        return {
          subject,
          state: report === undefined ? "loading" : report === null ? "error" : "ready",
          mastery: report === undefined ? undefined : facts && facts.mastery !== null ? Math.round(facts.mastery * 100) : null,
          chapters:
            report === undefined ? undefined : facts ? { started: facts.chapters_opened, total: facts.chapters_total } : null,
          sessions: spent === undefined ? undefined : spent === null ? null : spent.sessions,
          minutes: spent === undefined ? undefined : spent === null ? null : Math.round(spent.minutes),
        };
      }),
    [subjects, report, time],
  );

  // Sessions per chapter come with the time breakdown. No current read dates them, so there is no month-on-month trend.
  const sessions = useMemo<ParentHomeData["sessions"]>(() => {
    if (time === undefined) return { state: "loading", total: null, trendPct: null };
    if (time === null) return { state: "error", total: null, trendPct: null };
    return { state: "ready", total: Object.values(time).reduce((sum, t) => sum + t.sessions, 0), trendPct: null };
  }, [time]);

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
