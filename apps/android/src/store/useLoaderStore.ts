/**
 * useLoaderStore — global "journey" loader shown after sign-in/sign-up submit,
 * mirroring the web app's useLoaderStore (src/stores/useLoaderStore.ts).
 */
import { create } from "zustand";

interface LoaderState {
  isVisible: boolean;
  isComplete: boolean;
  startLoading: () => void;
  completeLoading: () => void;
  stopLoading: () => void;
}

export const useLoaderStore = create<LoaderState>((set) => ({
  isVisible: false,
  isComplete: false,
  startLoading: () => set({ isVisible: true, isComplete: false }),
  completeLoading: () => set({ isComplete: true }),
  stopLoading: () => set({ isVisible: false, isComplete: false }),
}));
