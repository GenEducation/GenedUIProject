const API_BASE_URL = (process.env.NEXT_PUBLIC_CORE_API_URL || "http://192.168.1.15:8000").replace(/\/$/, "");

export const studentService = {
  fetchSessions: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/get-session`, {
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
    const response = await fetch(`${API_BASE_URL}/api/students/${userId}/available-agents`);
    if (!response.ok) throw new Error("Failed to fetch available agents");
    return response.json();
  },

  fetchAvailablePartners: async () => {
    const response = await fetch(`${API_BASE_URL}/partners`);
    if (!response.ok) throw new Error("Failed to fetch partners");
    return response.json();
  },

  fetchEnrolledPartners: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/students/${userId}/available-agents`);
    if (!response.ok) throw new Error("Failed to fetch enrolled partners");
    return response.json();
  },

  sendPartnerRequest: async (userId: string, partnerId: string) => {
    const url = `${API_BASE_URL}/student/partner?student_id=${userId}&partner_id=${partnerId}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error("Request failed");
    }

    return response.json();
  },

  fetchChatHistory: async (userId: string, sessionId: string) => {
    const response = await fetch(`${API_BASE_URL}/get-history`, {
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
    agent_id: string;
    subject: string;
    grade: number;
  }) => {
    const response = await fetch(`${API_BASE_URL}/text/april-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("API request failed");

    return response.json();
  },

  // Analytics Endpoints
  fetchAnalyticsSubjects: async (studentId: string) => {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/subjects`, {
      headers: { "accept": "application/json" }
    });
    if (!response.ok) throw new Error("Failed to fetch analytics subjects");
    return response.json();
  },

  fetchSkillSummary: async (studentId: string, subject: string) => {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/skill-summary?subject=${encodeURIComponent(subject)}`, {
      headers: { "accept": "application/json" }
    });
    if (!response.ok) throw new Error("Failed to fetch skill summary");
    return response.json();
  },

  fetchCGScores: async (studentId: string, subject: string) => {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/cg-scores?subject=${encodeURIComponent(subject)}`, {
      headers: { "accept": "application/json" }
    });
    if (!response.ok) throw new Error("Failed to fetch CG scores");
    return response.json();
  },

  fetchSkillTree: async (studentId: string, subject: string) => {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/skill-tree?subject=${encodeURIComponent(subject)}`, {
      headers: { "accept": "application/json" }
    });
    if (!response.ok) throw new Error("Failed to fetch skill tree");
    return response.json();
  },

  fetchChapterMastery: async (studentId: string, subject: string) => {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/chapter-mastery?subject=${encodeURIComponent(subject)}`, {
      headers: { "accept": "application/json" }
    });
    if (!response.ok) throw new Error("Failed to fetch chapter mastery");
    return response.json();
  }
};
