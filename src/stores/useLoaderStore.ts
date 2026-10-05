import { create } from 'zustand';

/** Which full-screen loader to show. Students (and unknown roles) get the journey. */
export type LoaderVariant = 'default' | 'parent';

/** What the parent loader is waiting on; drives its status line. */
export type ParentLoaderStage = 'signup' | 'signin-handoff' | 'entry';

interface StartOptions {
  variant?: LoaderVariant;
  stage?: ParentLoaderStage;
  // Wait this long before appearing, so a load that finishes quickly never
  // flashes a full-screen loader. Parent loader only.
  appearDelayMs?: number;
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
  variant: LoaderVariant;
  parentStage: ParentLoaderStage;
  // Bumped on every startLoading(), so a late timer from an earlier load
  // (e.g. the hand-off watchdog) can tell it no longer owns the loader.
  loadId: number;
  appearDelayMs: number;
  startLoading: (options?: StartOptions) => void;
  completeLoading: () => void;
  // Marks the loader complete and hands off dismissal + navigation timing to
  // the loader: it will call `onCelebrated` once its completion moment has
  // held for its minimum duration, and will not self-dismiss until
  // stopLoading() is called explicitly (by the destination).
  beginHandoff: (onCelebrated: () => void) => void;
  // Switches the visible loader's look mid-flight — e.g. once a login reply
  // reveals the user is a parent.
  setVariant: (variant: LoaderVariant) => void;
  setParentStage: (stage: ParentLoaderStage) => void;
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
  variant: 'default',
  parentStage: 'entry',
  loadId: 0,
  appearDelayMs: 0,
  startLoading: (options) =>
    set(() => ({
      isVisible: true,
      isComplete: false,
      isHandoff: false,
      onCelebrated: null,
      variant: options?.variant ?? 'default',
      parentStage: options?.stage ?? 'entry',
      loadId: ++lastLoadId,
      appearDelayMs: options?.appearDelayMs ?? 0,
    })),
  completeLoading: () => set({ isComplete: true }),
  beginHandoff: (onCelebrated) => set({ isComplete: true, isHandoff: true, onCelebrated }),
  setVariant: (variant) => set({ variant }),
  setParentStage: (parentStage) => set({ parentStage }),
  finishLoading: () => set({ isComplete: true, isHandoff: false, onCelebrated: null }),
  stopLoading: () =>
    set({ isVisible: false, isComplete: false, isHandoff: false, onCelebrated: null, variant: 'default' }),
}));
