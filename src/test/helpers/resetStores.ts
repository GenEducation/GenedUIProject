import { afterEach } from "vitest";
import type { StoreApi, UseBoundStore } from "zustand";

/**
 * Zustand stores are module singletons, so state written in one test leaks into the
 * next. Call this once near the top of a test file for each store it touches: it
 * snapshots the store's state at registration and restores it after every test.
 */
export function autoResetStore<T>(store: UseBoundStore<StoreApi<T>>): void {
  const initialState = store.getState();
  afterEach(() => {
    store.setState(initialState, true);
  });
}
