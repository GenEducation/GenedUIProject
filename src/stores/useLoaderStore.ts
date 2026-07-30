import { create } from 'zustand';

interface LoaderState {
  isVisible: boolean;
  isComplete: boolean;
  // True while a post-auth navigation is in flight. While set, LoaderJourney
  // must not self-dismiss on its own timer — the destination route calls
  // stopLoading() once it has authorized/rendered.
  isHandoff: boolean;
  // Invoked by LoaderJourney once the trophy celebration has been shown for
  // its minimum hold. This is when the caller should actually navigate.
  onCelebrated: (() => void) | null;
  startLoading: () => void;
  completeLoading: () => void;
  // Marks the loader complete and hands off dismissal + navigation timing to
  // LoaderJourney: it will call `onCelebrated` once the trophy has held for
  // its minimum duration, and will not self-dismiss until stopLoading() is
  // called explicitly (by the destination's AuthGuard).
  beginHandoff: (onCelebrated: () => void) => void;
  stopLoading: () => void;
}

export const useLoaderStore = create<LoaderState>((set) => ({
  isVisible: false,
  isComplete: false,
  isHandoff: false,
  onCelebrated: null,
  startLoading: () => set({ isVisible: true, isComplete: false, isHandoff: false, onCelebrated: null }),
  completeLoading: () => set({ isComplete: true }),
  beginHandoff: (onCelebrated) => set({ isComplete: true, isHandoff: true, onCelebrated }),
  stopLoading: () => set({ isVisible: false, isComplete: false, isHandoff: false, onCelebrated: null }),
}));
