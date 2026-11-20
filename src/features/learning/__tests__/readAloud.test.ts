import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ReadAloudSession, READ_ALOUD_MESSAGES, type MicHandle, type ReadAloudDeps, type ReadAloudState, type SocketLike } from "../reading/readAloud";

class FakeSocket implements SocketLike {
  readyState = 1;
  binaryType = "blob";
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: Array<string | ArrayBuffer> = [];
  closed = false;
  send(data: string | ArrayBuffer) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
  say(frame: object) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
  get texts() {
    return this.sent.filter((s): s is string => typeof s === "string").map((s) => JSON.parse(s));
  }
}

const PART = { instanceId: "inst-1", passageId: "p-1", segment: 2 };

function setup(mic: ReadAloudDeps["openMic"] = async () => ({ stop: stopMic })) {
  const socket = new FakeSocket();
  const states: ReadAloudState[] = [];
  const deps: ReadAloudDeps = { openSocket: () => socket, openMic: vi.fn(mic), finalWaitMs: 50 };
  const session = new ReadAloudSession(deps, (s) => states.push(s));
  return { socket, states, deps, session };
}
const stopMic = vi.fn();
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => stopMic.mockClear());
afterEach(() => vi.useRealTimers());

describe("ReadAloudSession", () => {
  it("asks the server first and opens the microphone only once the part is agreed", async () => {
    const { socket, deps, session } = setup();
    session.start(PART);
    socket.onopen?.();

    expect(socket.texts[0]).toEqual({ type: "init", instance_id: "inst-1", passage_id: "p-1", segment: 2 });
    expect(deps.openMic).not.toHaveBeenCalled();
    socket.say({ type: "ready", language: "en", sample_rate: 16000 });
    await flush();

    expect(deps.openMic).toHaveBeenCalledTimes(1);
    expect(session.current.phase).toBe("listening");
  });

  it("sends audio frames straight to the socket and shows what was heard, then the final words", async () => {
    let push: (pcm: ArrayBuffer) => void = () => {};
    const { socket, session } = setup(async (onFrame) => {
      push = onFrame;
      return { stop: stopMic };
    });
    session.start(PART);
    socket.onopen?.();
    socket.say({ type: "ready" });
    await flush();

    const frame = new ArrayBuffer(640);
    push(frame);
    socket.say({ type: "heard", text: "rama natha", final: false });
    expect(socket.sent).toContain(frame);
    expect(session.current.heard).toBe("rama natha");

    session.finish();
    expect(stopMic).toHaveBeenCalled();
    expect(socket.texts.at(-1)).toEqual({ type: "stop" });
    socket.say({ type: "heard", text: "rama natha was", final: true });
    expect(session.current).toMatchObject({ phase: "done", heard: "rama natha was" });
    expect(socket.closed).toBe(true);
  });

  it("still finishes, with what it has, if the final words never come", async () => {
    vi.useFakeTimers();
    const { socket, session } = setup();
    session.start(PART);
    socket.onopen?.();
    socket.say({ type: "ready" });
    await vi.advanceTimersByTimeAsync(0);
    socket.say({ type: "heard", text: "partial words", final: false });
    session.finish();

    await vi.advanceTimersByTimeAsync(60);

    expect(session.current).toMatchObject({ phase: "done", heard: "partial words" });
  });

  it.each([
    ["language_not_enabled", "language"],
    ["language_not_supported", "language"],
    ["passage_not_available", "not_in_lesson"],
    ["busy", "busy"],
    ["trial_ended", "trial"],
    ["speech_unavailable", "service"],
    ["too_long", "too_long"],
  ] as const)("a server %s never reaches the microphone and says so plainly", async (code, problem) => {
    const { socket, deps, session } = setup();
    session.start(PART);
    socket.onopen?.();
    socket.say({ type: "error", code, message: "x" });
    await flush();

    expect(session.current).toMatchObject({ phase: "failed", problem: READ_ALOUD_MESSAGES[problem] });
    expect(deps.openMic).not.toHaveBeenCalled();
    expect(socket.closed).toBe(true);
  });

  it.each([
    ["NotAllowedError", "denied"],
    ["NotFoundError", "no_device"],
    ["NotReadableError", "mic_busy"],
    ["Weird", "unsupported"],
  ] as const)("a microphone that fails with %s is a plain message, and the socket is closed", async (name, problem) => {
    const { socket, session } = setup(async () => {
      throw Object.assign(new Error("x"), { name });
    });
    session.start(PART);
    socket.onopen?.();
    socket.say({ type: "ready" });
    await flush();

    expect(session.current).toMatchObject({ phase: "failed", problem: READ_ALOUD_MESSAGES[problem] });
    expect(socket.closed).toBe(true);
  });

  it("a connection that drops while listening stops the microphone and says the listener stopped", async () => {
    const { socket, session } = setup();
    session.start(PART);
    socket.onopen?.();
    socket.say({ type: "ready" });
    await flush();
    const drop = socket.onclose;

    drop?.();

    expect(stopMic).toHaveBeenCalled();
    expect(session.current).toMatchObject({ phase: "failed", problem: READ_ALOUD_MESSAGES.service });
  });

  it("cancel closes the microphone and the socket and drops what was heard", async () => {
    const { socket, session } = setup();
    session.start(PART);
    socket.onopen?.();
    socket.say({ type: "ready" });
    await flush();
    socket.say({ type: "heard", text: "words", final: false });

    session.cancel();

    expect(stopMic).toHaveBeenCalled();
    expect(socket.closed).toBe(true);
    expect(session.current).toEqual({ phase: "idle", heard: "", problem: null });
  });

  it("a microphone that opens after the learner already left is closed at once", async () => {
    let release: (m: MicHandle) => void = () => {};
    const { socket, session } = setup(() => new Promise<MicHandle>((r) => (release = r)));
    session.start(PART);
    socket.onopen?.();
    socket.say({ type: "ready" });
    session.cancel();
    release({ stop: stopMic });
    await flush();

    expect(stopMic).toHaveBeenCalledTimes(1);
    expect(session.current.phase).toBe("idle");
  });

  it("keeps no audio and no transcript beyond the screen: no recorder, storage or file in the module", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(`${process.cwd()}/src/features/learning/reading/readAloud.ts`, "utf8");
    for (const forbidden of ["MediaRecorder", "localStorage", "sessionStorage", "indexedDB", "createObjectURL", "Blob(", "FileReader"]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
