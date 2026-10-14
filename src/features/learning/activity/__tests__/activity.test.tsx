import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { activity, lessonFixture } from "@/test/msw/handlers/lesson";
import { useSessionClock, REFRESH_MS, WAITING_MS } from "../useSessionClock";
import { useChapterTime, formatEstimate } from "../useChapterTime";

const STUDENT = "00000000-0000-4000-8000-0000000000bb";
const CHAPTER = "00000000-0000-4000-8000-000000000001";

describe("useSessionClock (server-anchored)", () => {
  beforeEach(() => lessonFixture.reset());
  afterEach(() => vi.useRealTimers());

  it("starts from the server's elapsed time, so a refresh or a new tab continues instead of restarting", async () => {
    const { result } = renderHook(() => useSessionClock(STUDENT));
    expect(result.current).toBeNull(); // nothing known yet: the caller's own clock stands in
    await waitFor(() => expect(result.current).toBe(600));
  });

  it("keeps running between reads", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "setTimeout", "performance"] });
    const { result } = renderHook(() => useSessionClock(STUDENT));
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    const first = result.current ?? 0;
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect((result.current ?? 0) - first).toBeGreaterThanOrEqual(4);
  });

  it("reads 0 with no open session, and reads again soon because one may open at any moment", async () => {
    activity.session = { open: false, started_at: null, elapsed_seconds: 0, credited_seconds: 0, server_time: "x" };
    vi.useFakeTimers({ toFake: ["setInterval", "setTimeout", "performance"] });
    const { result } = renderHook(() => useSessionClock(STUDENT));
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(result.current).toBe(0);
    activity.session = { open: true, started_at: "x", elapsed_seconds: 7, credited_seconds: 0, server_time: "x" };
    await act(async () => { await vi.advanceTimersByTimeAsync(WAITING_MS + 50); });
    expect(result.current).toBeGreaterThanOrEqual(7);
    expect(WAITING_MS).toBeLessThan(REFRESH_MS);
  });

  it("is null when the server cannot be reached, so the local clock is used", async () => {
    activity.fail = true;
    const { result } = renderHook(() => useSessionClock(STUDENT));
    await new Promise((r) => setTimeout(r, 100));
    expect(result.current).toBeNull();
  });

  it("is null without a student", () => {
    const { result } = renderHook(() => useSessionClock(undefined));
    expect(result.current).toBeNull();
  });
});

describe("useChapterTime", () => {
  beforeEach(() => lessonFixture.reset());

  it("is this chapter's estimated minutes, rolled up across sittings", async () => {
    const { result } = renderHook(() => useChapterTime(STUDENT, CHAPTER));
    await waitFor(() => expect(result.current).toBe(12.4));
  });

  it("is 0 for a chapter with no credit yet", async () => {
    const { result } = renderHook(() => useChapterTime(STUDENT, "00000000-0000-4000-8000-0000000000ff"));
    await waitFor(() => expect(result.current).toBe(0));
  });

  it("is null without a student or a chapter", () => {
    expect(renderHook(() => useChapterTime(undefined, CHAPTER)).result.current).toBeNull();
    expect(renderHook(() => useChapterTime(STUDENT, undefined)).result.current).toBeNull();
  });

  it("formats an estimate", () => {
    expect([0, 0.4, 12.4, 59.6, 60, 135].map(formatEstimate)).toEqual(["<1 min", "<1 min", "12 min", "1h", "1h", "2h 15m"]);
  });
});
