import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { lessonFixture } from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import { lessonService } from "../../lessonService";
import { BACKOFF_MS, BEAT_MS, IDLE_MS } from "../rules";
import { useLessonPresence } from "../useLessonPresence";

import { LESSON_ID } from "@/test/msw/handlers/lesson";

function visible(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}
const input = () => window.dispatchEvent(new Event("pointerdown"));
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

describe("useLessonPresence", () => {
  let send: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    lessonFixture.reset();
    visible("visible");
    useLessonStore.setState({ status: "ready", voiceSessionId: null, turns: [] });
    send = vi.spyOn(lessonService, "presence").mockResolvedValue({ active: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("sends nothing for a lesson that is merely open", async () => {
    renderHook(() => useLessonPresence(LESSON_ID));
    await tick(IDLE_MS * 3);
    expect(send).not.toHaveBeenCalled();
  });

  it("beats on the first input and then every period while the learner stays active", async () => {
    renderHook(() => useLessonPresence(LESSON_ID));
    await act(async () => input());
    expect(send).toHaveBeenCalledTimes(1);
    await tick(BEAT_MS);
    expect(send).toHaveBeenCalledTimes(2);
    expect(new Set(send.mock.calls.map((c: unknown[]) => c[1])).size).toBe(1); // one source id for the tab
  });

  it("stops beating once the learner has been idle for the idle window", async () => {
    renderHook(() => useLessonPresence(LESSON_ID));
    await act(async () => input());
    await tick(IDLE_MS + BEAT_MS);
    const after = send.mock.calls.length;
    await tick(BEAT_MS * 4);
    expect(send.mock.calls.length).toBe(after);
  });

  it("sends nothing from a hidden tab and beats again when it is shown", async () => {
    renderHook(() => useLessonPresence(LESSON_ID));
    await act(async () => input());
    send.mockClear();
    await act(async () => visible("hidden"));
    await tick(BEAT_MS * 2);
    expect(send).not.toHaveBeenCalled();
    await act(async () => visible("visible"));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("sends nothing while a voice session runs in the tab", async () => {
    useLessonStore.setState({ voiceSessionId: "voice-1" });
    renderHook(() => useLessonPresence(LESSON_ID));
    await act(async () => input());
    await tick(BEAT_MS * 3);
    expect(send).not.toHaveBeenCalled();
  });

  it("backs off to four periods while the server answers active:false", async () => {
    send.mockResolvedValue({ active: false });
    renderHook(() => useLessonPresence(LESSON_ID));
    await act(async () => input());
    expect(send).toHaveBeenCalledTimes(1);
    await tick(BEAT_MS * 2);
    expect(send).toHaveBeenCalledTimes(1);
    await tick(BACKOFF_MS - BEAT_MS * 2);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("drops a failed beat: nothing is replayed and the next period tries again", async () => {
    send.mockRejectedValueOnce(new Error("offline"));
    renderHook(() => useLessonPresence(LESSON_ID));
    await act(async () => input());
    expect(send).toHaveBeenCalledTimes(1);
    await tick(BEAT_MS);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("counts a reply streaming to the tab as activity without any input", async () => {
    renderHook(() => useLessonPresence(LESSON_ID));
    await act(async () => {
      useLessonStore.setState({ turns: [{ turn_id: "t", status: "streaming" } as never] });
    });
    await tick(BEAT_MS);
    expect(send).toHaveBeenCalled();
  });
});
