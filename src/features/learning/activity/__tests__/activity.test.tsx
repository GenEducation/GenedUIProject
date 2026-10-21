import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { lessonFixture } from "@/test/msw/handlers/lesson";
import { useChapterClock, useChapterTime, formatEstimate } from "../useChapterTime";

const STUDENT = "00000000-0000-4000-8000-0000000000bb";
const CHAPTER = "00000000-0000-4000-8000-000000000001";

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

describe("useChapterClock", () => {
  beforeEach(() => lessonFixture.reset());

  it("starts from the server's credited time and counts on between reads", async () => {
    const { result } = renderHook(() => useChapterClock(STUDENT, CHAPTER));
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBeGreaterThanOrEqual(744)); // 12.4 min = 744 s
    // Between reads it runs like a clock, a second at a time.
    await waitFor(() => expect(result.current).toBeGreaterThanOrEqual(745), { timeout: 2500 });
  });
});
