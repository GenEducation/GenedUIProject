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
  }, signal?: AbortSignal): Promise<Response> => {
    const response = await authFetch(`${API_BASE_URL}/text/april-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "accept": "text/event-stream" },
      body: JSON.stringify({ ...payload, stream: true }),
      signal,
    });

    if (!response.ok) throw new Error("API request failed");

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
  }
};
