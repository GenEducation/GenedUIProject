import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { usePolling } from "../usePolling";

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  setVisibility("visible");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("usePolling", () => {
  it("fetches once on mount and exposes the result", async () => {
    const fetcher = vi.fn().mockResolvedValue("first");
    const { result } = renderHook(() => usePolling(fetcher, 30_000));

    await waitFor(() => expect(result.current.data).toBe("first"));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.lastUpdatedAt).toBeInstanceOf(Date);
  });

  it("refetches on the interval while the tab is visible", async () => {
    const fetcher = vi.fn().mockResolvedValue("x");
    renderHook(() => usePolling(fetcher, 30_000));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("skips interval ticks while the tab is hidden", async () => {
    const fetcher = vi.fn().mockResolvedValue("x");
    renderHook(() => usePolling(fetcher, 30_000));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    act(() => setVisibility("hidden"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(90_000);
    });

    // Three ticks passed; a background tab must not hammer the fleet endpoints.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches immediately when the tab becomes visible again", async () => {
    const fetcher = vi.fn().mockResolvedValue("x");
    renderHook(() => usePolling(fetcher, 30_000));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    act(() => setVisibility("hidden"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      setVisibility("visible");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps the previous data visible and reports an error on a failed refresh", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("good")
      .mockRejectedValueOnce(new Error("gateway down"));
    const { result } = renderHook(() => usePolling(fetcher, 30_000));
    await waitFor(() => expect(result.current.data).toBe("good"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    await waitFor(() => expect(result.current.error).toBe("gateway down"));
    expect(result.current.data).toBe("good");
  });

  it("does not stack requests when a fetch outlives the interval", async () => {
    let release: (v: string) => void = () => {};
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );
    renderHook(() => usePolling(fetcher, 10_000));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      release("done");
      await vi.advanceTimersByTimeAsync(0);
    });
  });

  it("stops polling after unmount", async () => {
    const fetcher = vi.fn().mockResolvedValue("x");
    const { unmount } = renderHook(() => usePolling(fetcher, 30_000));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
