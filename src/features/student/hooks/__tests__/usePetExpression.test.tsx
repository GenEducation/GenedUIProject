import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { idle, wink, surprised } from "blobatar/expression";
import { usePetExpression } from "../usePetExpression";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useNotificationStore } from "@/store/useNotificationStore";

const setStats = (currentStreak: number, longestStreak: number) =>
  act(() => {
    useStudentStore.setState({ studentStats: { currentStreak, longestStreak, totalSessions: 0 } });
  });

/** A fetch landing, or a later change once one has. */
const setUnread = (unreadCount: number) =>
  act(() => {
    useNotificationStore.setState({ unreadCount, hasFetched: true });
  });

describe("usePetExpression — triggers that watch a number rise", () => {
  beforeEach(() => {
    act(() => {
      useStudentStore.setState({ studentStats: null, isAITyping: false });
      useNotificationStore.setState({ unreadCount: 0, hasFetched: false });
    });
  });

  /**
   * The defect most likely to ship unnoticed. On mount both signals jump from
   * nothing to their real value; compared naively against 0 that is an
   * "increase", and the buddy would celebrate every time the app loads.
   */
  it("does NOT react to the first observation of an existing streak", () => {
    const { result } = renderHook(() => usePetExpression());
    setStats(7, 7); // first fetch lands — a 7-day streak the student already had
    expect(result.current).toBe(idle);
  });

  it("does NOT react to the first observation of existing unread notifications", () => {
    const { result } = renderHook(() => usePetExpression());
    setUnread(5); // first fetch lands — five notifications already waiting
    expect(result.current).toBe(idle);
  });

  it("winks when the streak actually increases past the record", () => {
    const { result } = renderHook(() => usePetExpression());
    setStats(6, 6); // seeds
    expect(result.current).toBe(idle);
    setStats(7, 6); // a genuine new record
    expect(result.current).toBe(wink);
  });

  it("winks on a milestone even without beating the record", () => {
    const { result } = renderHook(() => usePetExpression());
    setStats(2, 30); // seeds; longest is far ahead
    setStats(3, 30); // hits the 3-day milestone
    expect(result.current).toBe(wink);
  });

  it("ignores a streak that increases to nothing notable", () => {
    const { result } = renderHook(() => usePetExpression());
    setStats(4, 30);
    setStats(5, 30); // neither a record nor a milestone
    expect(result.current).toBe(idle);
  });

  it("ignores a streak resetting to zero — that is not a celebration", () => {
    const { result } = renderHook(() => usePetExpression());
    setStats(7, 7);
    setStats(0, 7);
    expect(result.current).toBe(idle);
  });

  it("is surprised when a notification genuinely arrives", () => {
    const { result } = renderHook(() => usePetExpression());
    setUnread(2); // seeds
    expect(result.current).toBe(idle);
    setUnread(3); // one just landed
    expect(result.current).toBe(surprised);
  });

  it("does not react again inside the cooldown", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => usePetExpression());
      setUnread(1);
      setUnread(2);
      expect(result.current).toBe(surprised);
      // Let the burst lapse, then deliver another notification immediately.
      act(() => { vi.advanceTimersByTime(3000); });
      setUnread(3);
      expect(result.current).toBe(idle);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores notifications being read (the count falling)", () => {
    const { result } = renderHook(() => usePetExpression());
    setUnread(4);
    setUnread(1);
    expect(result.current).toBe(idle);
  });
});
