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
import type { UserProfile, StreakData, VoiceOption, GeneralOnboarding, AvailableAgentsResponse } from "../types/api";

export interface MeData {
  profile: UserProfile | null;
  streak: StreakData | null;
  voices: VoiceOption[];
  onboarding: GeneralOnboarding | null;
  enrolledPartners: AvailableAgentsResponse | null;
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

  const fetchOnboarding = useCallback(
    () =>
      studentId
        ? studentService.fetchDashboardProfile(studentId).then((d) => d?.general_onboarding ?? null)
        : Promise.resolve(null),
    [studentId]
  );

  const fetchEnrolled = useCallback(
    () =>
      studentId
        ? studentService.fetchAvailableAgents(studentId)
        : Promise.resolve<AvailableAgentsResponse>({ partners: [] }),
    [studentId]
  );

  const profile         = useApi(fetchProfile,    [studentId]);
  const streak          = useApi(fetchStreak,     [studentId]);
  const voices          = useApi(fetchVoices,     []);
  const onboardingApi   = useApi(fetchOnboarding, [studentId]);
  const enrolledApi     = useApi(fetchEnrolled,   [studentId]);

  const { refetch: refetchProfile }    = profile;
  const { refetch: refetchStreak }     = streak;
  const { refetch: refetchVoices }     = voices;
  const { refetch: refetchOnboarding } = onboardingApi;
  const { refetch: refetchEnrolled }   = enrolledApi;

  const refetch = useCallback(() => {
    refetchProfile();
    refetchStreak();
    refetchVoices();
    refetchOnboarding();
    refetchEnrolled();
  }, [refetchProfile, refetchStreak, refetchVoices, refetchOnboarding, refetchEnrolled]);

  useRefreshOnFocus(refetch);

  return {
    profile:         profile.data,
    streak:          streak.data,
    voices:          voices.data ?? [],
    onboarding:      onboardingApi.data ?? null,
    enrolledPartners: enrolledApi.data ?? null,
    loading: profile.loading || streak.loading,
    error:   profile.error || streak.error || null,
    refetch,
  };
}
