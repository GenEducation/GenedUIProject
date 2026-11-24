import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useLoaderStore } from "@/stores/useLoaderStore";
import { installLocationStub } from "@/test/helpers/location";
import { LOADER_RESUME_KEY, leaveWithLoader, resumeLoaderAfterReload } from "../leaveWithLoader";
import { waitForPageVisuals } from "@/components/shared/loaders/waitForPageVisuals";

beforeEach(() => {
  sessionStorage.clear();
  useLoaderStore.getState().stopLoading();
});
afterEach(() => vi.useRealTimers());

describe("leaveWithLoader", () => {
  it("puts the study deck up, flags the reload, then leaves", () => {
    vi.useFakeTimers();
    const loc = installLocationStub();
    const beforeLeave = vi.fn();

    leaveWithLoader("/", beforeLeave);

    const loader = useLoaderStore.getState();
    expect(loader.isVisible).toBe(true);
    expect(loader.reason).toBe("logout");
    expect(sessionStorage.getItem(LOADER_RESUME_KEY)).toBe("logout");
    expect(beforeLeave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(beforeLeave).toHaveBeenCalledTimes(1);
    expect(loc.href).toBe("/");
  });
});

describe("resumeLoaderAfterReload", () => {
  it("restarts the deck once, and consumes the flag", () => {
    sessionStorage.setItem(LOADER_RESUME_KEY, "logout");

    expect(resumeLoaderAfterReload()).toBe(true);
    expect(useLoaderStore.getState().isVisible).toBe(true);
    expect(useLoaderStore.getState().reason).toBe("logout");
    expect(sessionStorage.getItem(LOADER_RESUME_KEY)).toBeNull();

    useLoaderStore.getState().stopLoading();
    expect(resumeLoaderAfterReload()).toBe(false);
    expect(useLoaderStore.getState().isVisible).toBe(false);
  });
});

describe("waitForPageVisuals", () => {
  it("resolves when there is nothing on screen to wait for", async () => {
    await expect(waitForPageVisuals({ settleMs: 10, pollMs: 5, timeoutMs: 1000 })).resolves.toBeUndefined();
  });

  it("gives up at its timeout rather than hold the loader forever", async () => {
    const img = document.createElement("img");
    Object.defineProperty(img, "complete", { value: false });
    img.getBoundingClientRect = () => ({ width: 50, height: 50, top: 10, bottom: 60, left: 0, right: 50, x: 0, y: 10, toJSON() {} }) as DOMRect;
    document.body.appendChild(img);
    const t0 = Date.now();
    await waitForPageVisuals({ settleMs: 10, pollMs: 5, timeoutMs: 120 });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(110);
    img.remove();
  });
});
