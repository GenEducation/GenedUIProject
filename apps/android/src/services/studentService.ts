/**
 * Student service — mobile port of the web app's studentService.ts.
 *
 * All calls go through authFetch which automatically injects the Bearer token
 * and handles 401/403 session expiry. BASE URL comes from the Expo env var.
 */
import { authFetch, ApiRequestError } from "./authFetch";
import type {
  StreakData,
  SubjectInfo,
  ChapterMastery,
  DashboardProfile,
  ProgressReport,
  SessionsResponse,
  ChatHistoryResponse,
  VoiceOption,
  CreateTestResponse,
  TestResult,
  TestSubmission,
  SendChatPayload,
  UserProfile,
  AvailableAgentsResponse,
  PartnerItem,
} from "../types/api";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export const studentService = {
  // ── Dashboard / Home ────────────────────────────────────────────────────────

  fetchDashboardProfile: async (studentId: string): Promise<DashboardProfile> => {
    const res = await authFetch(`${BASE}/students/${studentId}/profile`, {
      headers: { accept: "application/json" },
    });
    return res.json();
  },

  fetchStudentStreak: async (studentId: string): Promise<StreakData> => {
    const res = await authFetch(`${BASE}/students/${studentId}/streak`);
    return res.json();
  },

  // ── Available Agents ────────────────────────────────────────────────────────

  fetchAvailableAgents: async (studentId: string): Promise<AvailableAgentsResponse> => {
    const res = await authFetch(
      `${BASE}/api/students/${studentId}/available-agents`,
      { headers: { accept: "application/json" } }
    );
    return res.json();
  },

  // ── Subjects / Chapters ─────────────────────────────────────────────────────

  fetchAnalyticsSubjects: async (studentId: string): Promise<SubjectInfo[]> => {
    const res = await authFetch(`${BASE}/students/${studentId}/subjects`, {
      headers: { accept: "application/json" },
    });
    return res.json();
  },

  fetchChapterMastery: async (
    studentId: string,
    subject: string,
    signal?: AbortSignal
  ): Promise<ChapterMastery[]> => {
    const res = await authFetch(
      `${BASE}/students/${studentId}/chapter-mastery?subject=${encodeURIComponent(subject)}`,
      { headers: { accept: "application/json" }, signal }
    );
    return res.json();
  },

  // ── Progress Report ─────────────────────────────────────────────────────────

  fetchProgressReport: async (studentId: string): Promise<ProgressReport> => {
    const res = await authFetch(
      `${BASE}/students/${studentId}/progress-report`,
      { headers: { accept: "application/json" } }
    );
    return res.json();
  },

  // ── Chat / Sessions ─────────────────────────────────────────────────────────

  fetchSessions: async (userId: string): Promise<SessionsResponse> => {
    try {
      const res = await authFetch(`${BASE}/get-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      return res.json();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        return { sessions: [] };
      }
      throw err;
    }
  },

  fetchChatHistory: async (
    userId: string,
    sessionId: string
  ): Promise<ChatHistoryResponse> => {
    const res = await authFetch(`${BASE}/get-history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, session_id: sessionId }),
    });
    return res.json();
  },

  /** Returns the raw Response so the caller can read the SSE stream */
  sendChatMessage: async (
    payload: SendChatPayload,
    signal?: AbortSignal
  ): Promise<Response> => {
    return authFetch(`${BASE}/text/april-query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "text/event-stream",
      },
      body: JSON.stringify({ ...payload, stream: true }),
      signal,
    });
  },

  // ── Practice / Tests ────────────────────────────────────────────────────────

  fetchTestSubmissions: async (
    studentId: string,
    subject?: string
  ): Promise<TestSubmission[]> => {
    const url = subject
      ? `${BASE}/students/${studentId}/test-submissions?subject=${encodeURIComponent(subject)}`
      : `${BASE}/students/${studentId}/test-submissions`;
    const res = await authFetch(url, { headers: { accept: "application/json" } });
    return res.json();
  },

  createChapterTest: async (payload: {
    student_id: string;
    chapter_query: string;
    subject: string;
    grade: number;
    questions_per_section?: number;
  }): Promise<CreateTestResponse> => {
    const res = await authFetch(`${BASE}/create-chapter-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  submitTest: async (
    testId: string,
    answers: { question_id: string; student_answer: string }[]
  ): Promise<TestResult> => {
    const res = await authFetch(`${BASE}/tests/${testId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    return res.json();
  },

  // ── Voices ──────────────────────────────────────────────────────────────────

  /** Public endpoint — no auth needed, but authFetch handles it gracefully */
  fetchVoices: async (): Promise<VoiceOption[]> => {
    const res = await authFetch(`${BASE}/voices`);
    return res.json();
  },

  // ── Profile ─────────────────────────────────────────────────────────────────

  fetchUserProfile: async (userId: string): Promise<UserProfile> => {
    const res = await authFetch(`${BASE}/auth/profile/${userId}`);
    return res.json();
  },

  fetchPartners: async (): Promise<PartnerItem[]> => {
    const res = await authFetch(`${BASE}/partners`);
    return res.json();
  },

  sendPartnerRequest: async (partnerId: string): Promise<void> => {
    await authFetch(`${BASE}/student/partner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner_id: partnerId }),
    });
  },

  linkParent: async (contact: string): Promise<void> => {
    await authFetch(`${BASE}/parent/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact }),
    });
  },

  updateProfile: async (data: {
    user_id: string;
    name?: string;
    age?: number;
    school_board?: string;
    ai_name?: string;
    preferred_voice?: string;
  }): Promise<UserProfile> => {
    const res = await authFetch(`${BASE}/auth/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
