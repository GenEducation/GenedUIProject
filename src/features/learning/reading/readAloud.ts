import { getAuthToken } from "@/utils/authFetch";

/**
 * Optional read-aloud practice (W1): the learner reads a few sentences aloud and sees which of the words the listener picked
 * up. It is practice only. Nothing here is an answer, a score, an attempt, an engagement or progress, and no claim is made
 * about how well anyone read.
 *
 * Privacy: the microphone is asked for only after the server has agreed the part can be practised in this language; audio
 * goes frame by frame to the socket and nowhere else (no recorder, no storage, no file); what was heard is held in memory
 * for the screen and dropped when the practice ends. The server keeps no audio and no transcript either.
 */

export type ReadAloudProblem =
  | "unsupported"
  | "denied"
  | "no_device"
  | "mic_busy"
  | "not_in_lesson"
  | "language"
  | "busy"
  | "trial"
  | "service"
  | "too_long"
  | "idle";

export const READ_ALOUD_MESSAGES: Record<ReadAloudProblem, string> = {
  unsupported: "This browser can't use the microphone here. You can still read it out loud by yourself.",
  denied: "The microphone is turned off for this page. You can turn it on in your browser, or just read on.",
  no_device: "I can't find a microphone. You can still read it out loud by yourself.",
  mic_busy: "Another app is using the microphone. Close it and try again.",
  not_in_lesson: "This part isn't available to practise yet.",
  language: "Reading practice isn't ready in this language yet. You can still read it out loud by yourself.",
  busy: "The listener is busy right now. Try again in a moment.",
  trial: "Your free trial has ended, so reading practice is paused.",
  service: "The listener stopped. Please try again.",
  too_long: "That was a long one. Stop after a few sentences, then try again.",
  idle: "I couldn't hear any sound. Check your microphone, then try again.",
};

const SERVER_CODES: Record<string, ReadAloudProblem> = {
  language_not_enabled: "language",
  language_not_supported: "language",
  passage_not_available: "not_in_lesson",
  busy: "busy",
  trial_ended: "trial",
  speech_unavailable: "service",
  too_long: "too_long",
  idle: "idle",
  protocol: "service",
};

const MIC_ERRORS: Record<string, ReadAloudProblem> = {
  NotAllowedError: "denied",
  SecurityError: "denied",
  NotFoundError: "no_device",
  OverconstrainedError: "no_device",
  NotReadableError: "mic_busy",
  AbortError: "mic_busy",
};

export interface MicHandle {
  stop(): void;
}

export interface SocketLike {
  readyState: number;
  binaryType: string;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string | ArrayBuffer): void;
  close(): void;
}

export interface ReadAloudDeps {
  /** Ask for the microphone and call `onFrame` with 16 kHz 16-bit mono PCM until `stop`. Rejects with an error named as the browser's. */
  openMic(onFrame: (pcm: ArrayBuffer) => void): Promise<MicHandle>;
  openSocket(): SocketLike;
  /** Longest wait for the final words after the learner stops, in ms. */
  finalWaitMs?: number;
}

export type ReadAloudPhase = "idle" | "starting" | "listening" | "finishing" | "done" | "failed";

export interface ReadAloudState {
  phase: ReadAloudPhase;
  /** What the listener has heard so far (the whole attempt), for the screen; empty before anything is heard. */
  heard: string;
  problem: string | null;
}

const OPEN = 1;
const INITIAL: ReadAloudState = { phase: "idle", heard: "", problem: null };

export class ReadAloudSession {
  private state: ReadAloudState = INITIAL;
  private socket: SocketLike | null = null;
  private mic: MicHandle | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;

  constructor(
    private readonly deps: ReadAloudDeps,
    private readonly onChange: (state: ReadAloudState) => void,
  ) {}

  get current(): ReadAloudState {
    return this.state;
  }

  private set(next: Partial<ReadAloudState>) {
    this.state = { ...this.state, ...next };
    this.onChange(this.state);
  }

  private fail(problem: ReadAloudProblem) {
    this.release();
    this.set({ phase: "failed", problem: READ_ALOUD_MESSAGES[problem] });
  }

  private release() {
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.mic?.stop();
    this.mic = null;
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      socket.close();
    }
  }

  /** Begin: the server first agrees the part (a passage of this lesson, a language it can listen in); only then the microphone. */
  start(part: { instanceId: string; passageId: string; segment: number }) {
    if (this.state.phase === "starting" || this.state.phase === "listening") return;
    this.release();
    const mine = this.generation;
    this.set({ phase: "starting", heard: "", problem: null });
    const socket = this.deps.openSocket();
    socket.binaryType = "arraybuffer";
    this.socket = socket;
    socket.onopen = () =>
      socket.send(JSON.stringify({ type: "init", instance_id: part.instanceId, passage_id: part.passageId, segment: part.segment }));
    socket.onerror = () => {
      if (mine === this.generation) this.fail("service");
    };
    socket.onclose = () => {
      if (mine !== this.generation) return;
      if (this.state.phase === "finishing") this.complete();
      else if (this.state.phase === "starting" || this.state.phase === "listening") this.fail("service");
    };
    socket.onmessage = (event) => {
      if (mine !== this.generation || typeof event.data !== "string") return;
      let frame: { type?: string; code?: string; text?: string; final?: boolean };
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }
      if (frame.type === "ready") void this.listen(mine);
      else if (frame.type === "heard") {
        this.set({ heard: frame.text ?? "" });
        if (frame.final) this.complete();
      } else if (frame.type === "error") this.fail(SERVER_CODES[frame.code ?? ""] ?? "service");
    };
  }

  private async listen(mine: number) {
    try {
      const mic = await this.deps.openMic((pcm) => {
        if (this.socket && this.socket.readyState === OPEN) this.socket.send(pcm);
      });
      if (mine !== this.generation) {
        mic.stop();
        return;
      }
      this.mic = mic;
      this.set({ phase: "listening" });
    } catch (error) {
      if (mine !== this.generation) return;
      this.fail(MIC_ERRORS[(error as { name?: string })?.name ?? ""] ?? "unsupported");
    }
  }

  /** The learner is done reading: stop the microphone and ask for the final words. */
  finish() {
    if (this.state.phase !== "listening") return;
    this.mic?.stop();
    this.mic = null;
    this.set({ phase: "finishing" });
    this.socket?.send(JSON.stringify({ type: "stop" }));
    this.timer = setTimeout(() => this.complete(), this.deps.finalWaitMs ?? 8000);
  }

  private complete() {
    if (this.state.phase === "done") return;
    this.release();
    this.set({ phase: "done" });
  }

  /** Leave: the microphone and the socket are closed, and what was heard is dropped. */
  cancel() {
    this.release();
    this.set({ ...INITIAL });
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/** Whether this browser can capture audio at all (a secure page with a microphone API and audio worklets). */
export function canCaptureAudio(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof AudioContext !== "undefined" &&
    typeof AudioWorkletNode !== "undefined"
  );
}

export const browserReadAloudDeps: ReadAloudDeps = {
  openSocket: () =>
    new WebSocket(`${API_BASE_URL.replace(/^http/, "ws")}/v1/voice/read-aloud`, [
      "gened-companion-v1",
      // The gateway reads the account token from the subprotocols, never from a URL a log would keep.
      `companion-token.${getAuthToken()}`,
    ]) as unknown as SocketLike,
  openMic: async (onFrame) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    const context = new AudioContext();
    try {
      await context.audioWorklet.addModule("/read-aloud/pcm-worklet.js");
      const source = context.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(context, "pcm-capture");
      node.port.onmessage = (event: MessageEvent<ArrayBuffer>) => onFrame(event.data);
      source.connect(node);
      return {
        stop() {
          node.port.onmessage = null;
          source.disconnect();
          stream.getTracks().forEach((track) => track.stop());
          void context.close();
        },
      };
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
      throw error;
    }
  },
};
