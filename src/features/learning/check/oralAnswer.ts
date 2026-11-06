import { getAuthToken } from "@/utils/authFetch";
import { browserReadAloudDeps, canCaptureAudio, type MicHandle, type SocketLike } from "../reading/readAloud";

/**
 * A scored spoken answer to a rubric check (W2 P7), over its own socket `/v1/voice/oral-answer`. It is NOT W1's read-aloud practice: that one is
 * ungraded, keeps nothing and never touches a lesson's evidence; this one produces an attempt the server evaluates and commits.
 *
 * What the client does: ask the server to open the attempt (it validates the learner's own lesson, the delivered and selected check and the
 * rubric's qualification before anything else), then, only on `ready`, ask for the microphone and stream 16 kHz PCM; on Done send `stop`.
 * What the client never does: send words. There is no message for a transcript: the server's own recogniser produces it, the server measures how
 * much of the audio was voiced, and the server commits. Nothing is recorded or stored here: audio goes frame by frame to the socket.
 * A dropped connection can be resumed within the server's lease (the recording then starts again from the beginning).
 */

export type OralPhase = "idle" | "starting" | "recording" | "sending" | "result" | "clarify" | "failed";

export interface OralResult {
  status: "committed";
  attempt_id: string;
  outcome: "correct" | "incorrect" | "unscorable";
  correct: boolean | null;
  feedback:
    | { kind: "criteria"; criteria: { criterion: string; title: string; met: boolean; shown: string; next: string | null; error_tags: string[] }[] }
    | { kind: "retry"; code: string; retry: boolean; reason: string }
    | null;
  heard: string;
  round_state: "open" | "passed" | "failed" | null;
  revision: number;
  replayed: boolean;
}

export interface OralState {
  phase: OralPhase;
  result: OralResult | null;
  /** The rubric's neutral question when the answer could not be placed (nothing was committed). */
  clarify: { probe: string; heard: string } | null;
  /** A neutral code the interface words (`say_it_again`, `busy`, ...); never a mistake of the learner's. */
  problem: string | null;
  retry: boolean;
  /** The server's id for this attempt, kept so a dropped connection can resume it. */
  utteranceId: string | null;
}

export interface OralDeps {
  openMic(onFrame: (pcm: ArrayBuffer) => void): Promise<MicHandle>;
  openSocket(): SocketLike;
}

export const INITIAL_ORAL: OralState = { phase: "idle", result: null, clarify: null, problem: null, retry: false, utteranceId: null };
const OPEN = 1;
const MIC_PROBLEMS: Record<string, string> = { NotAllowedError: "mic_denied", SecurityError: "mic_denied", NotFoundError: "no_device", NotReadableError: "mic_busy", AbortError: "mic_busy" };

export interface OralContext {
  instanceId: string;
  itemId: string;
  sessionId: string;
  expectedRevision: number;
  language: string;
}

export class OralAnswerSession {
  private state: OralState = INITIAL_ORAL;
  private socket: SocketLike | null = null;
  private mic: MicHandle | null = null;
  private generation = 0;

  constructor(
    private readonly deps: OralDeps,
    private readonly onChange: (state: OralState) => void,
  ) {}

  get current() {
    return this.state;
  }

  private set(next: Partial<OralState>) {
    this.state = { ...this.state, ...next };
    this.onChange(this.state);
  }

  private release() {
    this.generation++;
    this.mic?.stop();
    this.mic = null;
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      socket.close();
    }
  }

  private fail(problem: string, retry: boolean) {
    this.release();
    this.set({ phase: "failed", problem, retry });
  }

  /** Begin a new answer, or (with a kept utterance id) resume the one a dropped connection left. */
  start(context: OralContext) {
    if (this.state.phase === "starting" || this.state.phase === "recording" || this.state.phase === "sending") return;
    this.release();
    const mine = this.generation;
    const resume = this.state.phase === "failed" && this.state.retry ? this.state.utteranceId : null;
    this.set({ phase: "starting", result: null, clarify: null, problem: null, retry: false });
    const socket = this.deps.openSocket();
    socket.binaryType = "arraybuffer";
    this.socket = socket;
    socket.onopen = () =>
      socket.send(
        JSON.stringify(
          resume
            ? { type: "resume", utterance_id: resume, session_id: context.sessionId, language: context.language }
            : { type: "init", instance_id: context.instanceId, item_id: context.itemId, session_id: context.sessionId, expected_revision: context.expectedRevision, language: context.language },
        ),
      );
    socket.onerror = () => mine === this.generation && this.fail("service", true);
    socket.onclose = () => {
      if (mine !== this.generation) return;
      if (this.state.phase === "starting" || this.state.phase === "recording" || this.state.phase === "sending") this.fail("connection_lost", true);
    };
    socket.onmessage = (event) => {
      if (mine !== this.generation || typeof event.data !== "string") return;
      let frame: Record<string, unknown>;
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }
      if (frame.type === "ready") {
        this.set({ utteranceId: String(frame.utterance_id) });
        void this.record(mine);
      } else if (frame.type === "result") {
        this.release();
        this.set({ phase: "result", result: frame as unknown as OralResult });
      } else if (frame.type === "clarify") {
        this.release();
        this.set({ phase: "clarify", clarify: { probe: String(frame.probe), heard: String(frame.heard ?? "") } });
      } else if (frame.type === "error") {
        const code = String(frame.feedback_code ?? frame.code ?? "service");
        // a refusal is never retried on its own; an unclear or interrupted recording may be recorded again
        this.fail(code, Boolean(frame.retry));
      }
    };
  }

  private async record(mine: number) {
    try {
      const mic = await this.deps.openMic((pcm) => this.socket && this.socket.readyState === OPEN && this.socket.send(pcm));
      if (mine !== this.generation) {
        mic.stop();
        return;
      }
      this.mic = mic;
      this.set({ phase: "recording" });
    } catch (error) {
      if (mine === this.generation) this.fail(MIC_PROBLEMS[(error as { name?: string })?.name ?? ""] ?? "unsupported", false);
    }
  }

  /** The learner is done: stop the microphone and ask the server to listen to what it heard and decide. */
  finish() {
    if (this.state.phase !== "recording") return;
    this.mic?.stop();
    this.mic = null;
    this.set({ phase: "sending" });
    this.socket?.send(JSON.stringify({ type: "stop" }));
  }

  cancel() {
    this.release();
    this.set({ ...INITIAL_ORAL });
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export const browserOralDeps: OralDeps = {
  openMic: browserReadAloudDeps.openMic,
  openSocket: () =>
    new WebSocket(`${API_BASE_URL.replace(/^http/, "ws")}/v1/voice/oral-answer`, ["gened-companion-v1", `companion-token.${getAuthToken()}`]) as unknown as SocketLike,
};

export { canCaptureAudio };
