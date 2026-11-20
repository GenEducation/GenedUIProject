import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OralAnswerSession, type OralDeps, type OralState } from "../oralAnswer";
import { SpokenAnswer } from "../SpokenAnswer";
import { useLessonStore } from "../../useLessonStore";
import type { CheckItem } from "../../types";
import type { SocketLike } from "../../reading/readAloud";

/** The scored spoken answer (W2 P7): a scripted socket and microphone, no audio, no network. SYNTHETIC test data. */
class FakeSocket implements SocketLike {
  readyState = 1;
  binaryType = "blob";
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: (string | ArrayBuffer)[] = [];
  closed = false;
  send(data: string | ArrayBuffer) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
  open() {
    this.onopen?.();
  }
  say(frame: object) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
  get texts() {
    return this.sent.filter((s): s is string => typeof s === "string").map((s) => JSON.parse(s));
  }
}

function rig() {
  const sockets: FakeSocket[] = [];
  const mic = { stop: vi.fn() };
  let onFrame: (pcm: ArrayBuffer) => void = () => {};
  const openMic = vi.fn(async (cb: (pcm: ArrayBuffer) => void) => {
    onFrame = cb;
    return mic;
  });
  const next = () => {
    const s = new FakeSocket();
    sockets.push(s);
    return s;
  };
  const real: OralDeps = { openMic, openSocket: next };
  return { sockets, mic, openMic, deps: real, frame: (n = 4) => onFrame(new ArrayBuffer(n)) };
}
const context = { instanceId: "i1", itemId: "c1", sessionId: "s1", expectedRevision: 5, language: "en" };
const READY = { type: "ready", utterance_id: "u-1", sample_rate: 16000, max_seconds: 60 };
const RESULT = { type: "result", status: "committed", attempt_id: "a1", outcome: "correct", correct: true, feedback: { kind: "criteria", criteria: [{ criterion: "needs", title: "t", met: true, shown: "names two needs", next: null, error_tags: [] }] }, heard: "water and light", round_state: "open", revision: 6, replayed: false };

describe("OralAnswerSession", () => {
  it("asks the server first, opens the microphone only after ready, streams frames, and never sends words", async () => {
    const r = rig();
    const states: OralState[] = [];
    const session = new OralAnswerSession(r.deps, (s) => states.push(s));
    session.start(context);
    const socket = r.sockets[0];
    socket.open();
    expect(socket.texts[0]).toEqual({ type: "init", instance_id: "i1", item_id: "c1", session_id: "s1", expected_revision: 5, language: "en" });
    expect(r.openMic).not.toHaveBeenCalled();
    socket.say(READY);
    await waitFor(() => expect(session.current.phase).toBe("recording"));
    r.frame();
    r.frame();
    expect(socket.sent.filter((s) => typeof s !== "string")).toHaveLength(2);
    session.finish();
    expect(socket.texts.map((f) => f.type)).toEqual(["init", "stop"]);
    expect(JSON.stringify(socket.texts)).not.toMatch(/transcript|text|heard/);
    expect(r.mic.stop).toHaveBeenCalled();
    socket.say(RESULT);
    expect(session.current.phase).toBe("result");
    expect(session.current.result?.heard).toBe("water and light");
    expect(socket.closed).toBe(true);
  });

  it("shows the neutral question when the answer cannot be placed, and an unclear recording as a retry the learner can resume", async () => {
    const r = rig();
    const session = new OralAnswerSession(r.deps, () => {});
    session.start(context);
    r.sockets[0].open();
    r.sockets[0].say(READY);
    await waitFor(() => expect(session.current.phase).toBe("recording"));
    session.finish();
    r.sockets[0].say({ type: "clarify", criterion: "needs", probe: "Can you tell me one more thing?", remaining: 1, heard: "plants need water" });
    expect(session.current).toMatchObject({ phase: "clarify", clarify: { probe: "Can you tell me one more thing?", heard: "plants need water" } });
    session.start(context);
    r.sockets[1].open();
    r.sockets[1].say({ type: "error", code: "no_speech", retry: true, feedback_code: "say_it_again" });
    expect(session.current).toMatchObject({ phase: "failed", problem: "say_it_again", retry: true });
  });

  it("resumes a dropped connection with the server's utterance id, and treats a refusal as final", async () => {
    const r = rig();
    const session = new OralAnswerSession(r.deps, () => {});
    session.start(context);
    r.sockets[0].open();
    r.sockets[0].say(READY);
    await waitFor(() => expect(session.current.phase).toBe("recording"));
    r.sockets[0].onclose?.();
    expect(session.current).toMatchObject({ phase: "failed", problem: "connection_lost", retry: true, utteranceId: "u-1" });
    session.start(context);
    r.sockets[1].open();
    expect(r.sockets[1].texts[0]).toEqual({ type: "resume", utterance_id: "u-1", session_id: "s1", language: "en" });
    r.sockets[1].say({ type: "error", code: "rubric_not_qualified", retry: false });
    expect(session.current).toMatchObject({ phase: "failed", retry: false });
  });

  it("a refused microphone is a neutral problem with no retry, and cancel closes everything", async () => {
    const r = rig();
    r.openMic.mockRejectedValueOnce(Object.assign(new Error("x"), { name: "NotAllowedError" }));
    const session = new OralAnswerSession(r.deps, () => {});
    session.start(context);
    r.sockets[0].open();
    r.sockets[0].say(READY);
    await waitFor(() => expect(session.current.problem).toBe("mic_denied"));
    expect(session.current.retry).toBe(false);
    session.cancel();
    expect(session.current.phase).toBe("idle");
  });
});

describe("SpokenAnswer", () => {
  const check: CheckItem = { id: "c1", prompt: "SYNTHETIC say what plants need", response_type: "rubric", role: "checkpoint", options: [], figure_groups: [], task: { mode: "spoken", min_chars: 1, max_chars: 100 } };
  const afterOral = vi.fn(async () => {});
  beforeEach(() => {
    afterOral.mockClear();
    useLessonStore.setState({ afterOral, oralContext: () => ({ instanceId: "i1", revision: 5, sessionId: "s1" }) });
  });

  it("is operated by buttons: Start, the live status, Done; then shows what was heard and the descriptor, and reports the attempt once", async () => {
    const r = rig();
    render(<SpokenAnswer check={check} deps={r.deps} />);
    await userEvent.click(screen.getByRole("button", { name: "Start answering" }));
    act(() => r.sockets[0].open());
    expect(screen.getByRole("status")).toHaveTextContent("Getting ready");
    act(() => r.sockets[0].say(READY));
    expect(await screen.findByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Listening");
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Checking your answer");
    act(() => r.sockets[0].say(RESULT));
    expect(await screen.findByText("I heard: water and light")).toBeInTheDocument();
    expect(screen.getByText("You showed: names two needs")).toBeInTheDocument();
    await waitFor(() => expect(afterOral).toHaveBeenCalledTimes(1));
    expect(afterOral).toHaveBeenCalledWith("a1");
  });

  it("an unclear recording is a neutral line and the learner may try again; it is never reported as an attempt", async () => {
    const r = rig();
    render(<SpokenAnswer check={check} deps={r.deps} />);
    await userEvent.click(screen.getByRole("button", { name: "Start answering" }));
    act(() => r.sockets[0].open());
    act(() => r.sockets[0].say(READY));
    await userEvent.click(await screen.findByRole("button", { name: "Done" }));
    act(() => r.sockets[0].say({ type: "error", code: "no_speech", retry: true, feedback_code: "say_it_again" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please say it again");
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    expect(afterOral).not.toHaveBeenCalled();
    expect(screen.queryByText(/wrong|Not quite/i)).toBeNull();
  });
});
