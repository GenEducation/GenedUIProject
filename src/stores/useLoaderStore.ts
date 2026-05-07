import { create } from 'zustand';

interface LoaderState {
  isVisible: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

export const useLoaderStore = create<LoaderState>((set) => ({
  isVisible: false,
  startLoading: () => set({ isVisible: true }),
  stopLoading: () => set({ isVisible: false }),
}));
