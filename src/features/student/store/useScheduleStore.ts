import { create } from "zustand";
import { scheduleService } from "../services/scheduleService";
import { ScheduleSessionRequest, ScheduleSessionResponse } from "../types/schedule";

interface ScheduleState {
  sessions: ScheduleSessionResponse[];
  isLoading: boolean;
  isBooking: boolean;
  bookError: string | null;

  loadScheduledSessions: (userId: string) => Promise<void>;
  bookSession: (request: ScheduleSessionRequest) => Promise<ScheduleSessionResponse | null>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  sessions: [],
  isLoading: false,
  isBooking: false,
  bookError: null,

  loadScheduledSessions: async (userId) => {
    set({ isLoading: true });
    try {
      const sessions = await scheduleService.getScheduledSessions(userId);
      set({ sessions });
    } catch (error) {
      console.error("Failed to load scheduled sessions:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  bookSession: async (request) => {
    set({ isBooking: true, bookError: null });
    try {
      const session = await scheduleService.scheduleSession(request);
      await get().loadScheduledSessions(request.user_id);
      return session;
    } catch (error) {
      console.error("Failed to book session:", error);
      set({ bookError: error instanceof Error ? error.message : "Failed to book session" });
      return null;
    } finally {
      set({ isBooking: false });
    }
  },
}));
