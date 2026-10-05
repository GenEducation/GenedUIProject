import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { completeAndRedirect } from "../usePostAuthRedirect";
import { useLoaderStore } from "@/stores/useLoaderStore";
import { autoResetStore } from "@/test/helpers/resetStores";

autoResetStore(useLoaderStore);

const router = { replace: vi.fn() } as unknown as Parameters<typeof completeAndRedirect>[0];

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("completeAndRedirect watchdog", () => {
  it("clears a hand-off that never finishes, even after navigating", () => {
    useLoaderStore.getState().startLoading();
    completeAndRedirect(router, "/parent");
    useLoaderStore.getState().onCelebrated?.(); // navigation happened; nobody stops the loader

    vi.advanceTimersByTime(12_000);
    expect(useLoaderStore.getState().isVisible).toBe(false);
  });

  it("leaves a newer load alone", () => {
    useLoaderStore.getState().startLoading();
    completeAndRedirect(router, "/parent");
    useLoaderStore.getState().stopLoading();
    useLoaderStore.getState().startLoading({ variant: "parent" }); // e.g. a fresh login

    vi.advanceTimersByTime(12_000);
    expect(useLoaderStore.getState().isVisible).toBe(true);
  });
});
