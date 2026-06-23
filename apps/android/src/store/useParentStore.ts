/**
 * Parent store — holds the currently selected child ID so all parent tabs
 * stay in sync. Uses useSyncExternalStore (no extra deps), same pattern as
 * usePrefsStore.ts.
 */
import { useSyncExternalStore } from "react";

interface ParentState {
  selectedChildId: string | null;
}

const state: ParentState = {
  selectedChildId: null,
};

const listeners = new Set<() => void>();
let snapshot: ParentState = { ...state };

function emit() {
  snapshot = { ...state };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const parentStore = {
  setSelectedChildId: (id: string | null) => {
    state.selectedChildId = id;
    emit();
  },
  get: () => snapshot,
};

export function useParentStore(): ParentState {
  return useSyncExternalStore(subscribe, () => snapshot);
}
