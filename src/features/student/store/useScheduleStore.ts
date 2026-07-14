import { create } from "zustand";
import { scheduleService } from "../services/scheduleService";
import { ScheduleSessionRequest, ScheduleSessionRescheduleRequest, ScheduleSessionResponse } from "../types/schedule";

interface ScheduleState {
  sessions: ScheduleSessionResponse[];
  isLoading: boolean;
  isBooking: boolean;
  bookError: string | null;
  isRescheduling: boolean;
  rescheduleError: string | null;

  loadScheduledSessions: (userId: string, parentId?: string) => Promise<void>;
  bookSession: (request: ScheduleSessionRequest, parentId?: string) => Promise<ScheduleSessionResponse | null>;
  rescheduleSession: (
    scheduledSessionId: string,
    request: ScheduleSessionRescheduleRequest,
    parentId?: string
  ) => Promise<ScheduleSessionResponse | null>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  sessions: [],
  isLoading: false,
  isBooking: false,
  bookError: null,
  isRescheduling: false,
  rescheduleError: null,

  loadScheduledSessions: async (userId, parentId) => {
    set({ isLoading: true });
    try {
      const sessions = await scheduleService.getScheduledSessions(userId, { parentId });
      set({ sessions });
    } catch (error) {
      console.error("Failed to load scheduled sessions:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  bookSession: async (request, parentId) => {
    set({ isBooking: true, bookError: null });
    try {
      const session = await scheduleService.scheduleSession(request, { parentId });
      await get().loadScheduledSessions(request.user_id, parentId);
      return session;
    } catch (error) {
      console.error("Failed to book session:", error);
      set({ bookError: error instanceof Error ? error.message : "Failed to book session" });
      return null;
    } finally {
      set({ isBooking: false });
    }
  },

  rescheduleSession: async (scheduledSessionId, request, parentId) => {
    set({ isRescheduling: true, rescheduleError: null });
    try {
      const session = await scheduleService.rescheduleSession(scheduledSessionId, request, { parentId });
      await get().loadScheduledSessions(session.student_id, parentId);
      return session;
    } catch (error) {
      console.error("Failed to reschedule session:", error);
      set({ rescheduleError: error instanceof Error ? error.message : "Failed to reschedule session" });
      return null;
    } finally {
      set({ isRescheduling: false });
    }
  },
}));
