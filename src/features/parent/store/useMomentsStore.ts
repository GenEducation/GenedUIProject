import { create } from "zustand";
import { momentsService } from "../services/momentsService";
import { Moment, CreateMomentRequest, UpdateMomentRequest } from "../types/moments";

interface MomentsState {
  moments: Moment[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadMoments: (userId: string) => Promise<void>;
  createMoment: (request: CreateMomentRequest) => Promise<Moment | null>;
  updateMoment: (momentId: string, request: UpdateMomentRequest) => Promise<void>;
  deleteMoment: (momentId: string) => Promise<void>;
  clearError: () => void;
}

export const useMomentsStore = create<MomentsState>((set, get) => ({
  moments: [],
  isLoading: false,
  isSaving: false,
  error: null,

  loadMoments: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const moments = await momentsService.getMoments(userId);
      set({ moments });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load alarms" });
    } finally {
      set({ isLoading: false });
    }
  },

  createMoment: async (request) => {
    set({ isSaving: true, error: null });
    try {
      const moment = await momentsService.createMoment(request);
      set((s) => ({ moments: [...s.moments, moment] }));
      return moment;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to create alarm" });
      return null;
    } finally {
      set({ isSaving: false });
    }
  },

  updateMoment: async (momentId, request) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await momentsService.updateMoment(momentId, request);
      set((s) => ({ moments: s.moments.map((m) => (m.id === momentId ? updated : m)) }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to update alarm" });
    } finally {
      set({ isSaving: false });
    }
  },

  deleteMoment: async (momentId) => {
    set({ isSaving: true, error: null });
    try {
      await momentsService.deleteMoment(momentId);
      set((s) => ({ moments: s.moments.filter((m) => m.id !== momentId) }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to delete alarm" });
    } finally {
      set({ isSaving: false });
    }
  },

  clearError: () => set({ error: null }),
}));
