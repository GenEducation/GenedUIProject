import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const presence = vi.fn<(instanceId: string, sourceId: string) => Promise<{ active: boolean }>>();
vi.mock("../lessonService", () => ({ lessonService: { presence: (...args: [string, string]) => presence(...args) } }));

import { PRESENCE_BACKOFF, PRESENCE_BEAT_MS, PRESENCE_IDLE_MS, useLessonPresence } from "../useLessonPresence";

type Props = Parameters<typeof useLessonPresence>[0];
const HERE: Props = { instanceId: "inst-1", ready: true, streaming: false, voiceRunning: false };

let visibility: DocumentVisibilityState = "visible";
const setVisibility = (state: DocumentVisibilityState) => {
  visibility = state;
  document.dispatchEvent(new Event("visibilitychange"));
};
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const render = (props: Props = HERE) => renderHook((p: Props) => useLessonPresence(p), { initialProps: props });

describe("useLessonPresence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    presence.mockReset();
    presence.mockResolvedValue({ active: true });
    visibility = "visible";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  });
  afterEach(() => vi.useRealTimers());

  it("beats at once when the lesson is ready, then every 30 s, with one source id per mount", async () => {
    render();
    await advance(0);
    expect(presence).toHaveBeenCalledTimes(1);
    await advance(PRESENCE_BEAT_MS);
    await advance(PRESENCE_BEAT_MS);
    expect(presence).toHaveBeenCalledTimes(3);
    const sources = new Set(presence.mock.calls.map(([, source]) => source));
    expect(presence.mock.calls.every(([id]) => id === "inst-1") && sources.size === 1).toBe(true);

    const other = render();
    await advance(0);
    expect(presence.mock.calls.at(-1)?.[1]).not.toBe([...sources][0]);
    other.unmount();
  });

  it("sends nothing before the lesson is ready, and beats at once when it becomes ready", async () => {
    const { rerender } = render({ ...HERE, ready: false });
    await advance(PRESENCE_BEAT_MS * 2);
    expect(presence).not.toHaveBeenCalled();
    rerender(HERE);
    await advance(0);
    expect(presence).toHaveBeenCalledTimes(1);
  });

  it("stops after two idle minutes and beats at once on the next input", async () => {
    render();
    await advance(PRESENCE_IDLE_MS + 1);
    const beforeQuiet = presence.mock.calls.length;
    await advance(PRESENCE_BEAT_MS * 3);
    expect(presence).toHaveBeenCalledTimes(beforeQuiet);

    await act(async () => { window.dispatchEvent(new Event("keydown")); });
    await advance(0);
    expect(presence).toHaveBeenCalledTimes(beforeQuiet + 1);
  });

  it("keeps beating while a reply streams to an idle learner, and for two minutes after it ends", async () => {
    const { rerender } = render({ ...HERE, streaming: true });
    await advance(PRESENCE_IDLE_MS + 1);
    const whileStreaming = presence.mock.calls.length;
    expect(whileStreaming).toBeGreaterThan(4);

    rerender(HERE); // the reply ended; the learner is still reading it
    await advance(PRESENCE_IDLE_MS - PRESENCE_BEAT_MS);
    expect(presence.mock.calls.length).toBeGreaterThan(whileStreaming);
    await advance(PRESENCE_BEAT_MS + 1);
    const done = presence.mock.calls.length;
    await advance(PRESENCE_BEAT_MS * 3);
    expect(presence).toHaveBeenCalledTimes(done);
  });

  it("stops while the page is hidden and beats at once when it is visible again", async () => {
    render();
    await advance(0);
    await act(async () => setVisibility("hidden"));
    await advance(PRESENCE_BEAT_MS * 3);
    expect(presence).toHaveBeenCalledTimes(1);
    await act(async () => setVisibility("visible"));
    await advance(0);
    expect(presence).toHaveBeenCalledTimes(2);
  });

  it("sends nothing while a voice session runs in the tab", async () => {
    const { rerender } = render({ ...HERE, voiceRunning: true });
    await advance(PRESENCE_BEAT_MS * 3);
    expect(presence).not.toHaveBeenCalled();
    rerender(HERE);
    await advance(0);
    expect(presence).toHaveBeenCalledTimes(1);
  });

  it("slows to 4 × H while the server answers active: false", async () => {
    presence.mockResolvedValue({ active: false });
    render();
    await advance(0);
    await advance(PRESENCE_BEAT_MS * (PRESENCE_BACKOFF - 1));
    expect(presence).toHaveBeenCalledTimes(1);
    await advance(PRESENCE_BEAT_MS + 1);
    expect(presence).toHaveBeenCalledTimes(2);
  });

  it("drops a failed beat and tries again on schedule, never replaying it", async () => {
    presence.mockRejectedValueOnce(new Error("network"));
    render();
    await advance(0);
    await advance(PRESENCE_BEAT_MS - 1);
    expect(presence).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(presence).toHaveBeenCalledTimes(2);
  });

  it("stops when the lesson screen closes", async () => {
    const { unmount } = render();
    await advance(0);
    unmount();
    await advance(PRESENCE_BEAT_MS * 3);
    expect(presence).toHaveBeenCalledTimes(1);
  });
});
