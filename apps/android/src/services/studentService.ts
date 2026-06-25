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
  TestSubmission,
  SendChatPayload,
  UserProfile,
  AvailableAgentsResponse,
  PartnerItem,
  LanguagePreferences,
  SkillSummary,
  CGScore,
  SkillProgressionEntry,
  OverallHistoryPoint,
} from "../types/api";
import type { CreateChapterTestResponse, SubmitTestResponse } from "../types/test";

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

  // ── PDF Viewer ──────────────────────────────────────────────────────────────

  fetchChapterPdfUrl: async (
    grade: number,
    subject: string,
    chapterName: string
  ): Promise<{ pdf_url: string; chapter_name: string; grade: number; subject: string; ttl_seconds: number }> => {
    const params = new URLSearchParams({
      grade: String(grade),
      subject,
      chapter_name: chapterName,
    });
    const res = await authFetch(`${BASE}/rag/api/ncert/pdf-url?${params}`, {
      headers: { accept: "application/json" },
    });
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

  fetchProgressReport: async (studentId: string): Promise<ProgressReport | null> => {
    try {
      const res = await authFetch(
        `${BASE}/students/${studentId}/progress-report`,
        { headers: { accept: "application/json" } }
      );
      return res.json();
    } catch (err) {
      // 404 = no report generated yet → show empty state, not an error
      if (err instanceof ApiRequestError && err.status === 404) return null;
      throw err;
    }
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
  }): Promise<CreateChapterTestResponse> => {
    const res = await authFetch(`${BASE}/create-chapter-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  /** Fetch a previously-created test (used by the scheduler "Start Test" path). */
  getTest: async (testId: string): Promise<CreateChapterTestResponse> => {
    const res = await authFetch(`${BASE}/tests/${testId}`);
    return res.json();
  },

  submitTest: async (
    testId: string,
    answers: { question_id: string; student_answer: string }[]
  ): Promise<SubmitTestResponse> => {
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

  // ── English Skill Mode ───────────────────────────────────────────────────────

  submitComprehensionAnswer: async (
    sessionId: string,
    directiveId: string,
    interactionType: "mcq" | "fill_blank" | "retell" | "free_response",
    answer: string
  ): Promise<any> => {
    const res = await authFetch(`${BASE}/english/session/${sessionId}/comprehension-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ directive_id: directiveId, interaction_type: interactionType, answer }),
    });
    return res.json();
  },

  /** Fire-and-forget telemetry: playback_complete, silence_detected, etc. */
  reportConversationAction: async (
    sessionId: string,
    type:
      | "playback_complete"
      | "silence_detected"
      | "repeat_requested"
      | "slower_requested"
      | "interaction_skipped",
    directiveId: string
  ): Promise<void> => {
    await authFetch(`${BASE}/english/session/${sessionId}/conversation-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, directive_id: directiveId, timestamp: new Date().toISOString() }),
    });
  },

  /**
   * Step A of the record→assess flow: ask the backend for a signed GCS upload URL.
   * Returns `{ upload_url | signed_url, gcs_uri, headers? }`.
   */
  requestAudioUpload: async (
    sessionId: string,
    payload: { directive_id: string; mime_type: string; file_size: number; codec: string }
  ): Promise<any> => {
    const res = await authFetch(`${BASE}/english/session/${sessionId}/audio-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directive_id: payload.directive_id,
        mime_type: payload.mime_type,
        file_size: payload.file_size,
        file_size_bytes: payload.file_size,
        codec: payload.codec,
      }),
    });
    return res.json();
  },

  /** Step C: submit the uploaded GCS URI for oral assessment. Returns {wer, pace_wpm, fluency, feedback}. */
  submitOralResult: async (
    sessionId: string,
    directiveId: string,
    gcsUri: string
  ): Promise<any> => {
    const res = await authFetch(`${BASE}/english/session/${sessionId}/oral-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ directive_id: directiveId, gcs_uri: gcsUri }),
    });
    return res.json();
  },

  // ── Interactive Math ─────────────────────────────────────────────────────────

  /** POST /math/session/{session_id}/interactive-answer — grades an interactive math block. */
  submitInteractiveAnswer: async (
    sessionId: string,
    directiveId: string,
    interactionType: string,
    answer: string
  ): Promise<any> => {
    const res = await authFetch(`${BASE}/math/session/${sessionId}/interactive-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ directive_id: directiveId, interaction_type: interactionType, answer }),
    });
    return res.json();
  },

  // ── Onboarding ──────────────────────────────────────────────────────────────
  // Plain request/response (NOT SSE). Both calls return { response, is_complete }.

  startOnboarding: async (
    studentId: string,
    subject: string,
    grade: number
  ): Promise<{ response: string; is_complete: boolean }> => {
    const res = await authFetch(`${BASE}/api/onboarding/subject/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, subject, grade }),
    });
    return res.json();
  },

  sendOnboardingMessage: async (
    studentId: string,
    subject: string,
    message: string
  ): Promise<{ response: string; is_complete: boolean }> => {
    const res = await authFetch(`${BASE}/api/onboarding/subject/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, subject, message }),
    });
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

  // ── Analytics ───────────────────────────────────────────────────────────────

  fetchSkillSummary: async (studentId: string, subject: string): Promise<SkillSummary> => {
    const res = await authFetch(
      `${BASE}/students/${studentId}/skill-summary?subject=${encodeURIComponent(subject)}`,
      { headers: { accept: "application/json" } }
    );
    return res.json();
  },

  fetchCGScores: async (studentId: string, subject: string): Promise<CGScore[]> => {
    const res = await authFetch(
      `${BASE}/students/${studentId}/cg-scores?subject=${encodeURIComponent(subject)}`,
      { headers: { accept: "application/json" } }
    );
    return res.json();
  },

  fetchSkillProgression: async (studentId: string, subject: string): Promise<SkillProgressionEntry[]> => {
    const res = await authFetch(
      `${BASE}/students/${studentId}/skill-progression?subject=${encodeURIComponent(subject)}`,
      { headers: { accept: "application/json" } }
    );
    return res.json();
  },

  fetchSkillProfileHistory: async (studentId: string, subject: string): Promise<{ history: OverallHistoryPoint[] }> => {
    const res = await authFetch(
      `${BASE}/students/${studentId}/skill-profile-history?subject=${encodeURIComponent(subject)}`,
      { headers: { accept: "application/json" } }
    );
    return res.json();
  },

  // ── Report-card aggregation (mirrors the web report card's per-subject fetches) ──

  fetchSkillTree: async (studentId: string, subject: string): Promise<any[]> => {
    const res = await authFetch(
      `${BASE}/students/${studentId}/skill-tree?subject=${encodeURIComponent(subject)}`,
      { headers: { accept: "application/json" } }
    );
    return res.json();
  },

  fetchEnglishSkillsSummary: async (studentId: string): Promise<any | null> => {
    const res = await authFetch(
      `${BASE}/students/${studentId}/english-skills-summary`,
      { headers: { accept: "application/json" } }
    );
    return res.json();
  },

  fetchSubjectEvolution: async (studentId: string, subject: string): Promise<any | null> => {
    const res = await authFetch(
      `${BASE}/students/${studentId}/subject-evolution-analysis?subject=${encodeURIComponent(subject)}`,
      { headers: { accept: "application/json" } }
    );
    return res.json();
  },

  fetchChapterEvolution: async (
    studentId: string,
    subject: string,
    documentTitle: string
  ): Promise<any | null> => {
    const res = await authFetch(
      `${BASE}/students/${studentId}/evolution-analysis?subject=${encodeURIComponent(subject)}&document_title=${encodeURIComponent(documentTitle)}`,
      { headers: { accept: "application/json" } }
    );
    return res.json();
  },

  // ── Language Preferences ────────────────────────────────────────────────────

  fetchLanguagePreferences: async (studentId: string): Promise<LanguagePreferences> => {
    const res = await authFetch(`${BASE}/students/${studentId}/language-preferences`, {
      headers: { accept: "application/json" },
    });
    return res.json();
  },

  updateLanguagePreferences: async (
    studentId: string,
    payload: { preferred_language?: string | null; secondary_languages?: string[] | null }
  ): Promise<LanguagePreferences> => {
    const res = await authFetch(`${BASE}/students/${studentId}/language-preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};
