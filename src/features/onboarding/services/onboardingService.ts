import { authFetch } from "@/utils/authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export const onboardingService = {
  checkDNAStatus: async (studentId: string) => {
    const response = await authFetch(`${API_BASE_URL}/api/onboarding/dna/${studentId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch DNA status");
    return response.json();
  },

  startGeneralOnboarding: async (studentId: string) => {
    const response = await authFetch(`${API_BASE_URL}/api/onboarding/general/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId }),
    });
    if (!response.ok) throw new Error("Failed to start general onboarding");
    return response.json();
  },

  sendGeneralChatMessage: async (payload: { 
    student_id: string; 
    message: string;
    audio_data?: string;
    audio_mime_type?: string;
  }, signal?: AbortSignal) => {
    const response = await authFetch(`${API_BASE_URL}/api/onboarding/general/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw data;
    }
    return response.json();
  },

  startSubjectOnboarding: async (studentId: string, subject: string, grade: number) => {
    const response = await authFetch(`${API_BASE_URL}/api/onboarding/subject/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, subject, grade }),
    });
    if (!response.ok) throw new Error("Failed to start subject onboarding");
    return response.json();
  },

  sendSubjectChatMessage: async (payload: { 
    student_id: string; 
    subject: string; 
    message: string;
    audio_data?: string;
    audio_mime_type?: string;
  }, signal?: AbortSignal) => {
    const response = await authFetch(`${API_BASE_URL}/api/onboarding/subject/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw data;
    }
    return response.json();
  },
};
