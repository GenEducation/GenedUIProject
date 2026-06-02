/**
 * Orchestrates all data needed for the Me (profile) screen.
 * Fetches user profile, streak stats, and available tutor voices in parallel.
 */
import { useCallback } from "react";
import { useApi } from "./useApi";
import { useStudentId } from "./useStudentId";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { useAuth } from "../store/useAuthStore";
import { studentService } from "../services/studentService";
import type { UserProfile, StreakData, VoiceOption } from "../types/api";

export interface MeData {
  profile: UserProfile | null;
  streak: StreakData | null;
  voices: VoiceOption[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMeData(): MeData {
  const { state } = useAuth();
  const studentId = useStudentId();

  const fetchProfile = useCallback(
    () =>
      studentId
        ? studentService.fetchUserProfile(studentId)
        : Promise.resolve<UserProfile>(
            state.status === "authenticated" ? state.profile : ({} as UserProfile)
          ),
    [studentId]
  );

  const fetchStreak = useCallback(
    () =>
      studentId
        ? studentService.fetchStudentStreak(studentId)
        : Promise.resolve<StreakData>({ current_streak: 0, longest_streak: 0, total_sessions: 0 }),
    [studentId]
  );

  const fetchVoices = useCallback(
    () => studentService.fetchVoices(),
    []
  );

  const profile = useApi(fetchProfile, [studentId]);
  const streak  = useApi(fetchStreak,  [studentId]);
  const voices  = useApi(fetchVoices,  []);

  const { refetch: refetchProfile } = profile;
  const { refetch: refetchStreak }  = streak;
  const { refetch: refetchVoices }  = voices;

  const refetch = useCallback(() => {
    refetchProfile();
    refetchStreak();
    refetchVoices();
  }, [refetchProfile, refetchStreak, refetchVoices]);

  useRefreshOnFocus(refetch);

  return {
    profile: profile.data,
    streak:  streak.data,
    voices:  voices.data ?? [],
    loading: profile.loading || streak.loading,
    error:   profile.error || streak.error || null,
    refetch,
  };
}
