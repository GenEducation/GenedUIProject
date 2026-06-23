import { useSyncExternalStore } from "react";
import * as SecureStore from "expo-secure-store";

export interface TutorialState {
  isActive: boolean;
  hasSeen: boolean;
  hydrated: boolean;
}

const STORAGE_KEY = "gened_tutorial_state";

const state: TutorialState = {
  isActive: false,
  hasSeen: false,
  hydrated: false,
};

const listeners = new Set<() => void>();
let snapshot: TutorialState = { ...state };

function emit() {
  snapshot = { ...state };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function persist() {
  SecureStore.setItemAsync(
    STORAGE_KEY,
    JSON.stringify({ hasSeen: state.hasSeen })
  ).catch(() => {});
}

export const tutorialStore = {
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

  startTutorial: () => {
    if (state.hasSeen) return;
    state.isActive = true;
    emit();
  },

  endTutorial: () => {
    state.isActive = false;
    state.hasSeen = true;
    persist();
    emit();
  },

  get: () => snapshot,
};

export function useTutorial(): TutorialState {
  return useSyncExternalStore(subscribe, () => snapshot);
}
