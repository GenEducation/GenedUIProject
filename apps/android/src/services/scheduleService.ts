/**
 * Scheduler service — mobile port of the web scheduleService (student-only,
 * no parent_id branch). Uses authFetch for Bearer-token injection.
 */
import { authFetch } from "./authFetch";
import type {
  ScheduleSessionRequest,
  ScheduleSessionRescheduleRequest,
  ScheduleSessionResponse,
} from "../types/schedule";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export const scheduleService = {
  scheduleSession: async (request: ScheduleSessionRequest): Promise<ScheduleSessionResponse> => {
    const res = await authFetch(`${BASE}/schedule-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    return res.json();
  },

  getScheduledSessions: async (
    userId: string,
    signal?: AbortSignal
  ): Promise<ScheduleSessionResponse[]> => {
    const res = await authFetch(
      `${BASE}/scheduled-sessions?user_id=${encodeURIComponent(userId)}`,
      { signal }
    );
    return res.json();
  },

  rescheduleSession: async (
    scheduledSessionId: string,
    request: ScheduleSessionRescheduleRequest
  ): Promise<ScheduleSessionResponse> => {
    const res = await authFetch(
      `${BASE}/scheduled-sessions/${encodeURIComponent(scheduledSessionId)}/reschedule`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }
    );
    return res.json();
  },
};
