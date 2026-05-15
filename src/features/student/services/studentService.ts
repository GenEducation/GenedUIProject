import { authFetch } from "@/utils/authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is required. Set it in your .env.local file.");
}

export const studentService = {
  fetchSessions: async (userId: string) => {
    const response = await authFetch(`${API_BASE_URL}/get-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { sessions: [] };
      }
      const errorBody = await response.text();
      console.error("Detailed Session Fetch Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`Failed to fetch sessions: ${response.status}`);
    }

    return response.json();
  },

  fetchAvailableAgents: async (userId: string) => {
    const response = await authFetch(`${API_BASE_URL}/api/students/${userId}/available-agents`);
    if (!response.ok) throw new Error("Failed to fetch available agents");
    return response.json();
  },

  fetchAvailablePartners: async () => {
    const response = await authFetch(`${API_BASE_URL}/partners`);
    if (!response.ok) throw new Error("Failed to fetch partners");
    return response.json();
  },

  fetchEnrolledPartners: async (userId: string) => {
    const response = await authFetch(`${API_BASE_URL}/api/students/${userId}/available-agents`);
    if (!response.ok) throw new Error("Failed to fetch enrolled partners");
    return response.json();
  },

  fetchOnboardingStatus: async (studentId: string) => {
    const response = await authFetch(`${API_BASE_URL}/api/onboarding/subject/status/${studentId}`);
    if (!response.ok) throw new Error("Failed to fetch onboarding status");
    return response.json();
  },

  sendPartnerRequest: async (userId: string, partnerId: string) => {
    const url = `${API_BASE_URL}/student/partner?student_id=${userId}&partner_id=${partnerId}`;
    const response = await authFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "accept": "application/json" }
    });

    if (!response.ok) {
      let errorMessage = "Request failed";
      try {
        const data = await response.json();
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (data.detail && typeof data.detail.message === 'string') {
          errorMessage = data.detail.message;
        } else if (typeof data.message === 'string') {
          errorMessage = data.message;
        } else if (data.message && typeof data.message.message === 'string') {
          errorMessage = data.message.message;
        }
      } catch {
        // Fallback to generic message if JSON parsing fails
      }
      throw { status: response.status, message: errorMessage };
    }

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

    if (!response.ok) throw new Error("Failed to fetch history");

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

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw { status: response.status, ...data };
    }

    return response;
  },

  // Analytics Endpoints
  fetchAnalyticsSubjects: async (studentId: string) => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/subjects`, {
      headers: { "accept": "application/json" }
    });
    if (!response.ok) throw new Error("Failed to fetch analytics subjects");
    return response.json();
  },

  fetchSkillSummary: async (studentId: string, subject: string) => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/skill-summary?subject=${encodeURIComponent(subject)}`, {
      headers: { "accept": "application/json" }
    });
    if (!response.ok) throw new Error("Failed to fetch skill summary");
    return response.json();
  },

  fetchCGScores: async (studentId: string, subject: string) => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/cg-scores?subject=${encodeURIComponent(subject)}`, {
      headers: { "accept": "application/json" }
    });
    if (!response.ok) throw new Error("Failed to fetch CG scores");
    return response.json();
  },

  fetchSkillTree: async (studentId: string, subject: string) => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/skill-tree?subject=${encodeURIComponent(subject)}`, {
      headers: { "accept": "application/json" }
    });
    if (!response.ok) throw new Error("Failed to fetch skill tree");
    return response.json();
  },

  fetchChapterMastery: async (studentId: string, subject: string) => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/chapter-mastery?subject=${encodeURIComponent(subject)}`, {
      headers: { "accept": "application/json" }
    });
    if (!response.ok) throw new Error("Failed to fetch chapter mastery");
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

    if (!response.ok) {
      let errorMessage = `Failed to link parent: ${response.status}`;
      try {
        const data = await response.json();
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (data.detail && typeof data.detail.message === 'string') {
          errorMessage = data.detail.message;
        } else if (typeof data.message === 'string') {
          errorMessage = data.message;
        } else if (data.message && typeof data.message.message === 'string') {
          errorMessage = data.message.message;
        }
      } catch {
        // Fallback to generic message
      }
      throw { status: response.status, message: errorMessage };
    }

    return response.json();
  },

  fetchSkillProgression: async (studentId: string, subject: string) => {
    const response = await authFetch(
      `${API_BASE_URL}/students/${studentId}/skill-progression?subject=${encodeURIComponent(subject)}`,
      { headers: { accept: "application/json" } }
    );
    if (!response.ok) throw new Error("Failed to fetch skill progression");
    return response.json(); // SkillProgressionEntry[]
  },

  fetchSkillProfileHistory: async (studentId: string, subject: string) => {
    const response = await authFetch(
      `${API_BASE_URL}/students/${studentId}/skill-profile-history?subject=${encodeURIComponent(subject)}`,
      { headers: { accept: "application/json" } }
    );
    if (!response.ok) throw new Error("Failed to fetch skill profile history");
    return response.json(); // { subject, history: OverallHistoryPoint[] }
  },

  // ── English Skill Mode Endpoints (Wave 1–4) ─────────────────────────────────

  /** Report a frontend conversational event (playback_complete, silence_detected, etc.) */
  reportConversationAction: async (
    sessionId: string,
    type: "playback_complete" | "silence_detected" | "repeat_requested" | "slower_requested" | "interaction_skipped",
    directiveId: string
  ) => {
    const response = await authFetch(
      `${API_BASE_URL}/english/session/${sessionId}/conversation-action`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, directive_id: directiveId, timestamp: new Date().toISOString() }),
      }
    );
    // Fire-and-forget — don't throw on failure, just log
    if (!response.ok) {
      console.warn("[studentService] conversation-action failed:", response.status);
    }
  },

  /** Submit oral reading result after GCS upload */
  submitOralResult: async (sessionId: string, directiveId: string, gcsUri: string) => {
    const response = await authFetch(
      `${API_BASE_URL}/english/session/${sessionId}/oral-result`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directive_id: directiveId, gcs_uri: gcsUri }),
      }
    );
    if (!response.ok) throw new Error(`oral-result failed: ${response.status}`);
    return response.json();
  },

  /** Submit an inline comprehension answer (MCQ, fill-blank, etc.) */
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
    if (!response.ok) throw new Error(`comprehension-answer failed: ${response.status}`);
    return response.json();
  },

  /** Fetch high-level skill history for a session */
  fetchSkillSessions: async (sessionId: string) => {
    const response = await authFetch(`${API_BASE_URL}/english/session/${sessionId}/skill-sessions`);
    if (!response.ok) throw new Error("Failed to fetch skill sessions");
    return response.json();
  },

  /** Get a signed URL for a specific figure in a directive */
  fetchFigureSignedUrl: async (sessionId: string, directiveId: string) => {
    const response = await authFetch(
      `${API_BASE_URL}/english/session/${sessionId}/figure/${directiveId}/signed-url`
    );
    if (!response.ok) throw new Error("Failed to fetch figure signed URL");
    return response.json(); // { signed_url: string, ... }
  },
};
