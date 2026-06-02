/**
 * Orchestrates all data needed for the Home screen.
 *
 * Fires three parallel API calls:
 *  1. streak   → stats strip (streak + total sessions)
 *  2. subjects → subject cards + continue-learning card
 *  3. sessions → recent sessions list
 */
import { useCallback } from "react";
import { useApi } from "./useApi";
import { useStudentId } from "./useStudentId";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { studentService } from "../services/studentService";
import type { StreakData, SubjectInfo, ChatSession, AvailableAgentsResponse } from "../types/api";

export interface HomeStats {
  streak: number;
  sessions: number;
  bestStreak: number;
}

export interface HomeData {
  stats: HomeStats | null;
  subjects: SubjectInfo[];
  recentSessions: ChatSession[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useHomeData(): HomeData {
  const studentId = useStudentId();

  const fetchStreak = useCallback(
    (signal: AbortSignal) =>
      studentId
        ? studentService.fetchStudentStreak(studentId)
        : Promise.resolve<StreakData>({ current_streak: 0, longest_streak: 0, total_sessions: 0 }),
    [studentId]
  );

  const fetchSubjects = useCallback(
    (_signal: AbortSignal) =>
      studentId
        ? studentService
            .fetchAvailableAgents(studentId)
            .then((res) => normaliseAgentsToSubjects(res))
            .catch(() =>
              // Fallback to analytics subjects if available-agents fails
              studentService.fetchAnalyticsSubjects(studentId).then((res) =>
                Array.isArray(res) ? res : (res as any)?.subjects ?? []
              )
            )
        : Promise.resolve<SubjectInfo[]>([]),
    [studentId]
  );

  const fetchSessions = useCallback(
    (_signal: AbortSignal) =>
      studentId
        ? studentService.fetchSessions(studentId).then((r) => {
            const list = r.sessions ?? (r as any) ?? [];
            return Array.isArray(list) ? list : [];
          })
        : Promise.resolve<ChatSession[]>([]),
    [studentId]
  );

  const streak   = useApi(fetchStreak,   [studentId]);
  const subjects = useApi(fetchSubjects, [studentId]);
  const sessions = useApi(fetchSessions, [studentId]);

  // Destructure stable refetch refs — avoids passing whole objects as deps
  const { refetch: refetchStreak }   = streak;
  const { refetch: refetchSubjects } = subjects;
  const { refetch: refetchSessions } = sessions;

  const refetch = useCallback(() => {
    refetchStreak();
    refetchSubjects();
    refetchSessions();
  }, [refetchStreak, refetchSubjects, refetchSessions]);

  useRefreshOnFocus(refetch);

  const stats: HomeStats | null = streak.data
    ? {
        streak:     streak.data.current_streak,
        sessions:   streak.data.total_sessions,
        bestStreak: streak.data.longest_streak,
      }
    : null;

  const loading = streak.loading || subjects.loading || sessions.loading;
  const error   = streak.error   || subjects.error   || sessions.error   || null;

  return {
    stats,
    subjects: subjects.data ?? [],
    recentSessions: (sessions.data ?? []).slice(0, 5),
    loading,
    error,
    refetch,
  };
}

/**
 * Flatten the available-agents response into a simple SubjectInfo list.
 * Each unique subject gets one entry using the first agent's grade.
 *
 * Response shape:
 *   { partners: [{ subjects: [{ subject, subject_coverage_percentage, agents: [{ agent_id, grade, ... }] }] }] }
 */
function normaliseAgentsToSubjects(res: AvailableAgentsResponse): SubjectInfo[] {
  const subjects: SubjectInfo[] = [];
  const seen = new Set<string>();

  for (const partner of res?.partners ?? []) {
    for (const ps of partner?.subjects ?? []) {
      const key = ps.subject?.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);

      const firstAgent = ps.agents?.[0];
      subjects.push({
        subject: ps.subject,
        grade: firstAgent?.grade ?? 0,
        mastery: ps.subject_coverage_percentage ?? 0,
        is_onboarding_complete: ps.is_onboarding_complete,
        subject_coverage_percentage: ps.subject_coverage_percentage,
        agent_id: firstAgent?.agent_id,
        document_titles: firstAgent?.document_titles,
      });
    }
  }

  return subjects;
}
