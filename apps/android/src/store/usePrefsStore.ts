/**
 * usePrefsStore — local-only user preferences (sound effects, voice activation
 * mode). A subscribable singleton (useSyncExternalStore, no extra deps),
 * persisted with expo-secure-store so it survives app restarts.
 *
 * These are device/UX preferences only — not synced to the backend (mirrors the
 * web app, which keeps voice prefs in localStorage).
 */
import { useSyncExternalStore } from "react";
import * as SecureStore from "expo-secure-store";

export type ListenMode = "continuous" | "ptt";
export type AvatarId = "graduate-boy" | "graduate-girl";

export interface Prefs {
  soundEnabled: boolean;
  listenMode: ListenMode;
  avatarId: AvatarId;
  hydrated: boolean;
}

const STORAGE_KEY = "gened_prefs";

const state: Prefs = {
  soundEnabled: true,
  listenMode: "continuous",
  avatarId: "graduate-boy",
  hydrated: false,
};

const listeners = new Set<() => void>();
let snapshot: Prefs = { ...state };

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
    JSON.stringify({
      soundEnabled: state.soundEnabled,
      listenMode: state.listenMode,
      avatarId: state.avatarId,
    })
  ).catch(() => {});
}

export const prefsStore = {
  /** Load persisted prefs once at app start. */
  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.soundEnabled === "boolean") state.soundEnabled = parsed.soundEnabled;
        if (parsed.listenMode === "continuous" || parsed.listenMode === "ptt") {
          state.listenMode = parsed.listenMode;
        }
        if (parsed.avatarId === "graduate-boy" || parsed.avatarId === "graduate-girl") {
          state.avatarId = parsed.avatarId;
        }
      }
    } catch {
      // keep defaults
    } finally {
      state.hydrated = true;
      emit();
    }
  },
  setSoundEnabled: (value: boolean) => {
    state.soundEnabled = value;
    persist();
    emit();
  },
  setListenMode: (mode: ListenMode) => {
    state.listenMode = mode;
    persist();
    emit();
  },
  setAvatarId: (id: AvatarId) => {
    state.avatarId = id;
    persist();
    emit();
  },
  get: () => snapshot,
};

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, () => snapshot);
}
