import { create } from 'zustand';

/** Why the loader is up; sets the study deck's closing word. */
export type LoaderReason = 'signin' | 'logout';

interface StartOptions {
  reason?: LoaderReason;
}

interface LoaderState {
  isVisible: boolean;
  isComplete: boolean;
  // True while a post-auth navigation is in flight. While set, the loader
  // must not self-dismiss on its own timer — the destination route calls
  // stopLoading() once it has authorized/rendered.
  isHandoff: boolean;
  // Invoked by the loader once its completion moment has been shown for its
  // minimum hold. This is when the caller should actually navigate.
  onCelebrated: (() => void) | null;
  reason: LoaderReason;
  // Bumped on every startLoading(), so a late timer from an earlier load
  // (e.g. the hand-off watchdog) can tell it no longer owns the loader.
  loadId: number;
  startLoading: (options?: StartOptions) => void;
  completeLoading: () => void;
  // Marks the loader complete and hands off dismissal + navigation timing to
  // the loader: it will call `onCelebrated` once its completion moment has
  // held for its minimum duration, and will not self-dismiss until
  // stopLoading() is called explicitly (by the destination).
  beginHandoff: (onCelebrated: () => void) => void;
  // The destination is ready: the loader leaves once its minimum hold has
  // passed (rather than vanishing mid-animation, as stopLoading would).
  finishLoading: () => void;
  stopLoading: () => void;
}

// Load ids come from a module counter rather than store state, so they stay
// unique even if the store is reset (tests do this between cases).
let lastLoadId = 0;

export const useLoaderStore = create<LoaderState>((set) => ({
  isVisible: false,
  isComplete: false,
  isHandoff: false,
  onCelebrated: null,
  reason: 'signin',
  loadId: 0,
  startLoading: (options) =>
    set(() => ({
      isVisible: true,
      isComplete: false,
      isHandoff: false,
      onCelebrated: null,
      reason: options?.reason ?? 'signin',
      loadId: ++lastLoadId,
    })),
  completeLoading: () => set({ isComplete: true }),
  beginHandoff: (onCelebrated) => set({ isComplete: true, isHandoff: true, onCelebrated }),
  finishLoading: () => set({ isComplete: true, isHandoff: false, onCelebrated: null }),
  stopLoading: () =>
    set({ isVisible: false, isComplete: false, isHandoff: false, onCelebrated: null }),
}));
