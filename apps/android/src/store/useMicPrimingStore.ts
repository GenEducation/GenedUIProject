/**
 * MicPrimingStore — shows a one-time in-app explainer before the very first
 * microphone permission request, since Android has no on-screen equivalent of
 * iOS's NSMicrophoneUsageDescription (the system dialog alone gives the student
 * zero context). Play Store compliance review, issue M4.
 *
 * Mirrors the persisted "seen once" pattern in useTutorialStore.ts.
 */
import { useSyncExternalStore } from "react";
import * as SecureStore from "expo-secure-store";

export interface MicPrimingState {
  isVisible: boolean;
  hasSeen: boolean;
  hydrated: boolean;
}

const STORAGE_KEY = "gened_mic_priming_state";

const state: MicPrimingState = {
  isVisible: false,
  hasSeen: false,
  hydrated: false,
};

let pendingProceed: (() => void) | null = null;

const listeners = new Set<() => void>();
let snapshot: MicPrimingState = { ...state };

function emit() {
  snapshot = { ...state };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function persist() {
  SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({ hasSeen: state.hasSeen })).catch(() => {});
}

export const micPrimingStore = {
  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.hasSeen === "boolean") state.hasSeen = parsed.hasSeen;
      }
    } catch {
      // keep defaults
    } finally {
      state.hydrated = true;
      emit();
    }
  },

  /**
   * Call this instead of requesting the mic permission directly. Runs `onProceed`
   * immediately once the student has already seen the explainer; otherwise shows
   * the sheet and runs `onProceed` only if they tap Continue.
   */
  requestAccess: (onProceed: () => void) => {
    if (state.hasSeen) {
      onProceed();
      return;
    }
    pendingProceed = onProceed;
    state.isVisible = true;
    emit();
  },

  confirm: () => {
    state.isVisible = false;
    state.hasSeen = true;
    persist();
    emit();
    const proceed = pendingProceed;
    pendingProceed = null;
    proceed?.();
  },

  cancel: () => {
    state.isVisible = false;
    pendingProceed = null;
    emit();
  },

  get: () => snapshot,
};

export function useMicPriming(): MicPrimingState {
  return useSyncExternalStore(subscribe, () => snapshot);
}
