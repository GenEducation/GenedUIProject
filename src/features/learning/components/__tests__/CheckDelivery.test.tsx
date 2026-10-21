import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { CHECK_ITEM, LESSON_ID, OPTION_A, answerRequests, deliveryRequests, lessonFixture, makeLessonInstance, turnRequests } from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import type { PipelineEvent, PipelineOptions } from "../../voice/loadPipeline";

/** A stand-in for the backend's audio client (as in VoiceMode.test): a test plays the server's and the player's part. */
const fake = vi.hoisted(() => ({ options: null as PipelineOptions | null }));
vi.mock("../../voice/loadPipeline", () => ({
  loadPipeline: async () => ({
    VoicePipeline: class {
      constructor(options: PipelineOptions) { fake.options = options; }
      worker = { postMessage: () => undefined };
      track = { enabled: true };
      async start() { return { aec: true, ns: true, agc: true, inRate: 48000 }; }
      async close() {}
    },
    MicError: class extends Error {},
  }),
}));

import { BoardPanel } from "../BoardPanel";
import { ChatPanel } from "../ChatPanel";

const store = () => useLessonStore.getState();
const emit = (e: PipelineEvent) => act(() => fake.options!.onEvent(e));
const server = (msg: object) => emit({ t: "server", msg } as PipelineEvent);
const ui = (ev: string, responseNo = 1) => emit({ t: "ui", ev, responseNo, on: ev === "speaking" ? true : undefined } as PipelineEvent);
const only = (channel: "screen" | "voice") => deliveryRequests.filter((d) => d.body.channel === channel);
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

/** Controls what the board's `IntersectionObserver` reports. */
const observers: Array<(isIntersecting: boolean) => void> = [];
function stubIntersectionObserver() {
  vi.stubGlobal("IntersectionObserver", class {
    constructor(private cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
      observers.push((isIntersecting) => act(() => this.cb([{ isIntersecting }])));
    }
    observe() {}
    disconnect() {}
  });
}

beforeEach(() => {
  observers.length = 0;
  fake.options = null;
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("check delivery: a check shown on the board", () => {
  it("is confirmed once, after it renders, with the page's session id", async () => {
    await store().load(LESSON_ID);
    render(<BoardPanel />);
    await waitFor(() => expect(deliveryRequests).toHaveLength(1));
    expect(deliveryRequests[0]).toMatchObject({ itemId: CHECK_ITEM, body: { channel: "screen", completed: true, session_id: store().pageSessionId } });
    expect(store().pageSessionId).not.toBe("");
    // Re-renders and a refreshed instance of the same round are duplicate events: still one request.
    act(() => store().setCheckVisible(CHECK_ITEM, true));
    await settle();
    expect(deliveryRequests).toHaveLength(1);
  });

  it("is not confirmed while it is off screen, and is as soon as it scrolls into view", async () => {
    stubIntersectionObserver();
    await store().load(LESSON_ID);
    render(<BoardPanel />);
    await settle();
    expect(deliveryRequests).toEqual([]);
    observers.at(-1)!(true);
    await waitFor(() => expect(deliveryRequests).toHaveLength(1));
  });

  it("is never confirmed for a check that is not the active node's pending check", async () => {
    await store().load(LESSON_ID);
    act(() => store().setCheckVisible("00000000-0000-4000-8000-0000000000ff", true));
    await settle();
    expect(deliveryRequests).toEqual([]);
    // Nor once it has been answered.
    lessonFixture.setInstance(makeLessonInstance({ active_node: { ...makeLessonInstance().active_node!, answered_item_ids: [CHECK_ITEM] } }));
    await store().load(LESSON_ID);
    act(() => store().setCheckVisible(CHECK_ITEM, true));
    await settle();
    expect(deliveryRequests).toEqual([]);
  });

  it("a failed confirmation is retried with the same request id, and the learner sees nothing", async () => {
    lessonFixture.failNextDeliveries(2);
    await store().load(LESSON_ID);
    render(<BoardPanel />);
    await waitFor(() => expect(deliveryRequests).toHaveLength(3), { timeout: 5000 });
    expect(new Set(deliveryRequests.map((d) => d.body.request_id)).size).toBe(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("the answer carries the session id, and a refusal as not delivered is a neutral note, never incorrect", async () => {
    lessonFixture.requireDelivery(true);
    lessonFixture.failNextDeliveries(99); // the confirmation never gets through
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await store().load(LESSON_ID);
      render(<BoardPanel />);
      fireEvent.click(await screen.findByRole("radio", { name: "SYNTHETIC A" }));
      fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
      await act(() => vi.advanceTimersByTimeAsync(8000));
      expect(await screen.findByText(/still getting this question ready/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
    expect(answerRequests.length).toBeGreaterThanOrEqual(1);
    expect(answerRequests.every((a) => a.session_id === store().pageSessionId)).toBe(true);
    expect(screen.queryByText(/Not quite/)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(store().instance?.revision).toBe(4); // nothing was recorded
  });

  it("a delivered check is answered with the session id it was confirmed in", async () => {
    lessonFixture.requireDelivery(true);
    await store().load(LESSON_ID);
    render(<BoardPanel />);
    await waitFor(() => expect(deliveryRequests).toHaveLength(1));
    const result = await store().answer(CHECK_ITEM, { kind: "choice", option_ids: [OPTION_A] });
    expect(result?.outcome).toBe("correct");
    expect(answerRequests[0].session_id).toBe(deliveryRequests[0].body.session_id);
  });

  it("typed chat turns carry the learner session id", async () => {
    await store().load(LESSON_ID);
    await store().send("SYNTHETIC hello");
    expect(turnRequests.at(-1)?.session_id).toBe(store().pageSessionId);
  });
});

describe("check delivery: a check read aloud", () => {
  const turn_id = "aaaaaaaa-0000-4000-8000-0000000000d1";

  async function openVoice() {
    await store().load(LESSON_ID);
    store().setVoiceMode(true);
    render(<><BoardPanel /><ChatPanel onShowFigure={vi.fn()} /></>);
    await waitFor(() => expect(fake.options).not.toBeNull());
    await server({ type: "ready", session_id: "voice-session-1", degraded: [] });
    await waitFor(() => expect(only("screen").at(-1)?.body.session_id).toBe("voice-session-1"));
  }
  beforeEach(() => void vi.stubEnv("NEXT_PUBLIC_LESSON_VOICE", "true"));

  const startReply = async (no = 1) => {
    await server({ type: "response_started", response_no: no, turn_id });
    await ui("speaking", no);
  };

  it("is confirmed only when the playback ends, not when it starts", async () => {
    await openVoice();
    await startReply();
    await settle();
    expect(only("voice")).toEqual([]);
    await ui("drained");
    await waitFor(() => expect(only("voice")).toHaveLength(1));
    expect(only("voice")[0]).toMatchObject({ itemId: CHECK_ITEM, body: { channel: "voice", completed: true, session_id: "voice-session-1" } });
  });

  it("a duplicate end-of-playback event does not send a second request", async () => {
    await openVoice();
    await startReply();
    await ui("drained");
    await ui("drained");
    await settle();
    expect(only("voice")).toHaveLength(1);
  });

  it("an interrupted playback (barge-in, mute, cancel) sends nothing", async () => {
    await openVoice();
    await startReply(1);
    await ui("stopped", 1);
    await startReply(2);
    await server({ type: "response_ended", response_no: 2, reason: "interrupted" });
    await ui("drained", 2);
    await settle();
    expect(only("voice")).toEqual([]);
  });

  it("audio that never began is not a delivery", async () => {
    await openVoice();
    await server({ type: "response_started", response_no: 1, turn_id });
    await ui("drained");
    await settle();
    expect(only("voice")).toEqual([]);
  });

  it("a reconnect is a new session: the visible check is confirmed again, and the lost session's audio counts for nothing", async () => {
    await openVoice();
    const before = only("screen").length;
    await startReply();
    await emit({ t: "status", state: "reconnecting" });
    await ui("drained"); // played out in the session that was lost
    await settle();
    expect(only("voice")).toEqual([]);
    await emit({ t: "status", state: "reconnected" });
    await server({ type: "ready", session_id: "voice-session-2", degraded: [] });
    await waitFor(() => expect(only("screen")).toHaveLength(before + 1));
    expect(only("screen").at(-1)?.body.session_id).toBe("voice-session-2");
    expect(new Set(only("screen").map((d) => d.body.request_id)).size).toBe(only("screen").length);
  });

  it("answers and turns use the live voice session id", async () => {
    await openVoice();
    expect(store().sessionId()).toBe("voice-session-1");
    await store().send("SYNTHETIC hi");
    expect(turnRequests.at(-1)?.session_id).toBe("voice-session-1");
  });

  it("is not claimed when the check is not on screen", async () => {
    stubIntersectionObserver();
    await store().load(LESSON_ID);
    store().setVoiceMode(true);
    render(<><BoardPanel /><ChatPanel onShowFigure={vi.fn()} /></>);
    await waitFor(() => expect(fake.options).not.toBeNull());
    await server({ type: "ready", session_id: "voice-session-1", degraded: [] });
    await startReply();
    await ui("drained");
    await settle();
    expect(deliveryRequests).toEqual([]);
  });
});
