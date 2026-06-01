import { authFetch, ApiRequestError } from "@/utils/authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is required. Set it in your .env.local file.");
}

export const studentService = {
  fetchSessions: async (userId: string) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/get-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      return response.json();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return { sessions: [] };
      }
      throw error;
    }
  },

  fetchAvailableAgents: async (userId: string, signal?: AbortSignal) => {
    const response = await authFetch(`${API_BASE_URL}/api/students/${userId}/available-agents`, { signal });
    return response.json();
  },

  fetchStudentStreak: async (studentId: string) => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/streak`);
    return response.json();
  },

  fetchAvailablePartners: async () => {
    const response = await authFetch(`${API_BASE_URL}/partners`);
    return response.json();
  },

  fetchEnrolledPartners: async (userId: string) => {
    const response = await authFetch(`${API_BASE_URL}/api/students/${userId}/available-agents`);
    return response.json();
  },

  fetchOnboardingStatus: async (studentId: string) => {
    const response = await authFetch(`${API_BASE_URL}/api/onboarding/subject/status/${studentId}`);
    return response.json();
  },

  sendPartnerRequest: async (userId: string, partnerId: string) => {
    const url = `${API_BASE_URL}/student/partner?student_id=${userId}&partner_id=${partnerId}`;
    const response = await authFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "accept": "application/json" }
    });
    return response.json();
  },

  fetchChatHistory: async (userId: string, sessionId: string) => {
    const response = await authFetch(`${API_BASE_URL}/get-history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId,
      }),
    });
    return response.json();
  },

  sendChatMessage: async (payload: {
    text: string;
    user_id: string;
    session_id?: string;
    agent_id?: string;
    subject: string;
    grade: number;
    document_title?: string;
    intent?: string;
    activity_input?: {
      activity_id: string;
      activity_type: string;
      transcript: string;
    };
  }, signal?: AbortSignal): Promise<Response> => {
    const response = await authFetch(`${API_BASE_URL}/text/april-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "accept": "text/event-stream" },
      body: JSON.stringify({ ...payload, stream: true }),
      signal,
    });
    return response;
  },

  // Analytics Endpoints
  fetchAnalyticsSubjects: async (studentId: string) => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/subjects`, {
      headers: { "accept": "application/json" }
    });
    return response.json();
  },

  fetchSkillSummary: async (studentId: string, subject: string) => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/skill-summary?subject=${encodeURIComponent(subject)}`, {
      headers: { "accept": "application/json" }
    });
    return response.json();
  },

  fetchCGScores: async (studentId: string, subject: string) => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/cg-scores?subject=${encodeURIComponent(subject)}`, {
      headers: { "accept": "application/json" }
    });
    return response.json();
  },

  fetchSkillTree: async (studentId: string, subject: string) => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/skill-tree?subject=${encodeURIComponent(subject)}`, {
      headers: { "accept": "application/json" }
    });
    return response.json();
  },

  fetchChapterMastery: async (studentId: string, subject: string, signal?: AbortSignal) => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/chapter-mastery?subject=${encodeURIComponent(subject)}`, {
      headers: { "accept": "application/json" },
      signal,
    });
    return response.json();
  },

  fetchEnglishSkillsSummary: async (studentId: string) => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/english-skills-summary`, {
      headers: { "accept": "application/json" }
    });
    return response.json();
  },

  fetchTestSubmissions: async (studentId: string, subject?: string) => {
    const url = subject
      ? `${API_BASE_URL}/students/${studentId}/test-submissions?subject=${encodeURIComponent(subject)}`
      : `${API_BASE_URL}/students/${studentId}/test-submissions`;
    const response = await authFetch(url, {
      headers: { "accept": "application/json" }
    });
    return response.json();
  },

  fetchDashboardProfile: async (studentId: string) => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/profile`, {
      headers: { "accept": "application/json" }
    });
    return response.json();
  },

  linkParent: async (studentId: string, parentEmailOrPhone: string) => {
    const response = await authFetch(`${API_BASE_URL}/parent/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        student_id: studentId,
        parent_email_or_phone: parentEmailOrPhone,
      }),
    });
    return response.json();
  },

  fetchSkillProgression: async (studentId: string, subject: string) => {
    const response = await authFetch(
      `${API_BASE_URL}/students/${studentId}/skill-progression?subject=${encodeURIComponent(subject)}`,
      { headers: { accept: "application/json" } }
    );
    return response.json();
  },

  fetchSkillProfileHistory: async (studentId: string, subject: string) => {
    const response = await authFetch(
      `${API_BASE_URL}/students/${studentId}/skill-profile-history?subject=${encodeURIComponent(subject)}`,
      { headers: { accept: "application/json" } }
    );
    return response.json();
  },

  // ── English Skill Mode Endpoints (Wave 1–4) ─────────────────────────────────

  reportConversationAction: async (
    sessionId: string,
    type: "playback_complete" | "silence_detected" | "repeat_requested" | "slower_requested" | "interaction_skipped",
    directiveId: string
  ) => {
    try {
      await authFetch(
        `${API_BASE_URL}/english/session/${sessionId}/conversation-action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, directive_id: directiveId, timestamp: new Date().toISOString() }),
        }
      );
    } catch (error: any) {
      // Fire-and-forget — don't throw on failure, just log
      console.warn("[studentService] conversation-action failed:", error.status, error.message);
    }
  },

  submitOralResult: async (sessionId: string, directiveId: string, gcsUri: string) => {
    const response = await authFetch(
      `${API_BASE_URL}/english/session/${sessionId}/oral-result`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directive_id: directiveId, gcs_uri: gcsUri }),
      }
    );
    return response.json();
  },

  submitComprehensionAnswer: async (
    sessionId: string,
    directiveId: string,
    interactionType: "mcq" | "fill_blank" | "retell" | "free_response",
    answer: string
  ) => {
    const response = await authFetch(
      `${API_BASE_URL}/english/session/${sessionId}/comprehension-answer`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directive_id: directiveId, interaction_type: interactionType, answer }),
      }
    );
    return response.json();
  },

  fetchSkillSessions: async (sessionId: string) => {
    const response = await authFetch(`${API_BASE_URL}/english/session/${sessionId}/skill-sessions`);
    return response.json();
  },

  fetchFigureSignedUrl: async (sessionId: string, directiveId: string) => {
    const response = await authFetch(
      `${API_BASE_URL}/english/session/${sessionId}/figure/${directiveId}/signed-url`
    );
    return response.json();
  },

  fetchChapterPdfUrl: async (
    grade: number,
    subject: string,
    chapterName: string
  ): Promise<{ pdf_url: string; chapter_name: string; grade: number; subject: string; ttl_seconds: number }> => {
    const params = new URLSearchParams({
      grade: String(grade),
      subject: subject.toLowerCase(),
      chapter_name: chapterName,
    });
    const response = await authFetch(`${API_BASE_URL}/rag/api/ncert/pdf-url?${params}`);
    return response.json();
  },

  // ── AI Analysis Reports ─────────────────────────────────────────────────────

  fetchProgressReport: async (studentId: string) => {
    const response = await authFetch(
      `${API_BASE_URL}/students/${studentId}/progress-report`,
      { headers: { accept: "application/json" } }
    );
    return response.json();
  },

  fetchSubjectEvolution: async (studentId: string, subject: string) => {
    const response = await authFetch(
      `${API_BASE_URL}/students/${studentId}/subject-evolution-analysis?subject=${encodeURIComponent(subject)}`,
      { headers: { accept: "application/json" } }
    );
    return response.json();
  },

  fetchChapterEvolution: async (studentId: string, subject: string, documentTitle: string) => {
    const response = await authFetch(
      `${API_BASE_URL}/students/${studentId}/evolution-analysis?subject=${encodeURIComponent(subject)}&document_title=${encodeURIComponent(documentTitle)}`,
      { headers: { accept: "application/json" } }
    );
    return response.json();
  },
};
