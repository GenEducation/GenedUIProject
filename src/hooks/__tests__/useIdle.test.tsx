import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIdle } from "../useIdle";

const DELAY = 3000;

describe("useIdle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts active, so it cannot mismatch on hydration", () => {
    const { result } = renderHook(() => useIdle(DELAY));
    expect(result.current).toBe(false);
  });

  it("goes idle once the delay passes with no activity", () => {
    const { result } = renderHook(() => useIdle(DELAY));
    act(() => { vi.advanceTimersByTime(DELAY + 1); });
    expect(result.current).toBe(true);
  });

  it("wakes on the next sign of life", () => {
    const { result } = renderHook(() => useIdle(DELAY));
    act(() => { vi.advanceTimersByTime(DELAY + 1); });
    expect(result.current).toBe(true);

    act(() => { window.dispatchEvent(new Event("keydown")); });
    expect(result.current).toBe(false);
  });

  it("keeps deferring while activity continues", () => {
    const { result } = renderHook(() => useIdle(DELAY));
    for (let i = 0; i < 5; i++) {
      act(() => {
        vi.advanceTimersByTime(DELAY - 500);
        window.dispatchEvent(new Event("pointermove"));
      });
      expect(result.current).toBe(false);
    }
  });

  /**
   * The trap this hook exists to avoid: `pointermove` can fire at 60Hz, and a
   * naive implementation would setState on every one of them — re-rendering a
   * live SVG sixty times a second. State may only change on a transition.
   */
  it("does not re-render on activity while already active", () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      return useIdle(DELAY);
    });
    const baseline = renders;

    act(() => {
      for (let i = 0; i < 50; i++) window.dispatchEvent(new Event("pointermove"));
    });

    expect(renders).toBe(baseline);
  });

  it("re-renders exactly once per transition", () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      return useIdle(DELAY);
    });
    const baseline = renders;

    act(() => { vi.advanceTimersByTime(DELAY + 1); });          // → idle
    act(() => { window.dispatchEvent(new Event("pointermove")); }); // → active
    act(() => {
      for (let i = 0; i < 20; i++) window.dispatchEvent(new Event("pointermove"));
    });

    expect(renders).toBe(baseline + 2);
  });

  it("removes its listeners on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useIdle(DELAY));
    unmount();
    const removed = remove.mock.calls.map((c) => c[0]);
    expect(removed).toContain("pointermove");
    expect(removed).toContain("keydown");
    remove.mockRestore();
  });
});
