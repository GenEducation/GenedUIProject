import { authFetch } from "@/utils/authFetch";
import { ScheduleSessionRequest, ScheduleSessionResponse } from "../types/schedule";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export const scheduleService = {
  scheduleSession: async (request: ScheduleSessionRequest): Promise<ScheduleSessionResponse> => {
    const response = await authFetch(`${API_BASE_URL}/schedule-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Schedule Session Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`Failed to schedule session: ${response.status}`);
    }

    return response.json();
  },

  getScheduledSessions: async (userId: string, signal?: AbortSignal): Promise<ScheduleSessionResponse[]> => {
    const response = await authFetch(`${API_BASE_URL}/scheduled-sessions?user_id=${encodeURIComponent(userId)}`, { signal });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Get Scheduled Sessions Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`Failed to get scheduled sessions: ${response.status}`);
    }

    return response.json();
  }
};
