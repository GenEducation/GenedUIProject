// Client for /ws/v3/voice (ADR-0015 -- cascaded STT -> April -> TTS).
//
// New, standalone service -- does not edit voiceService.ts (the v1/v2 Gemini Live
// client). Swapping surfaces later is repointing the caller at this file and commenting
// out the old route, per the ADR's "no migration" decision.
//
// Wire protocol matches core-service's core_service/voice/pipeline/protocol.py exactly:
// binary frames are big-endian (DataView default), JSON frames are the control channel.
// See docs/speech-pipeline-architecture.md §6 for the full frame catalog.

import { getAuthToken } from "@/utils/authFetch";
import {
  isDownlinkAudioFrame,
  packUplinkFrame,
  parseDownlinkFrame,
} from "@/features/student/services/speechPipelineProtocol";
import { isSustained, ownsTheTurn } from "@/features/student/services/speechPipelineVad";

export type PipelineState = "idle" | "listening" | "thinking" | "speaking";

export type SpeechPipelineEvent =
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "session_id"; sessionId: string }
  | { type: "state"; state: PipelineState }
  | { type: "partial_transcript"; text: string }
  | { type: "final_transcript"; text: string; confidence: number | null; language: string }
  | { type: "utterance_start"; utteranceId: number }
  | { type: "assistant_transcript"; utteranceId: number; text: string }
  | { type: "utterance_end"; utteranceId: number; reason: "complete" | "cancelled" }
  | { type: "safety_redirect"; content: string }
  | { type: "error"; message: string };

export interface SpeechPipelineInit {
  sessionId: string;
  chapterId?: string;
  language?: string;
  voice?: string;
  studentId: string;
}

// Design doc §7.5: a voice onset shorter than this while the tutor is speaking is a
// backchannel ("haan", "okay") and must not interrupt; only a sustained one barges in.
const BARGE_IN_MIN_MS = 400;

// Must match core-service's shared_utils.speech.config.OUTPUT_SAMPLE_RATE_HZ -- the
// rate TTS actually synthesizes at. Live bug: the playback AudioContext used to be
// created with no explicit rate, which browsers default to the hardware's native rate
// (commonly 48000Hz). The worklet wrote 24kHz samples straight into that buffer with no
// resampling, so every utterance played at ~2x speed and pitch -- "very very fast" and
// squeaky, reported live. Constructing this context AT the TTS rate makes the browser's
// own output stage do the resampling, correctly, once, instead of us getting it wrong.
const PLAYBACK_SAMPLE_RATE = 24000;

class SpeechPipelineService {
  private ws: WebSocket | null = null;
  private micCtx: AudioContext | null = null;
  private playbackCtx: AudioContext | null = null;
  private micNode: AudioWorkletNode | null = null;
  private playbackNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private onEvent: ((event: SpeechPipelineEvent) => void) | null = null;

  private uplinkSeq = 0;
  private state: PipelineState = "idle";
  private activeUtteranceId: number | null = null;
  private lastPlayedUntilMs = 0;
  private speechOnsetAt: number | null = null;
  private pendingPreroll: ArrayBuffer | null = null;
  private muted = false;

  async connect(init: SpeechPipelineInit, onEvent: (event: SpeechPipelineEvent) => void) {
    this.onEvent = onEvent;

    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const wsBaseUrl = apiBaseUrl.replace(/^http/, "ws").replace(/\/$/, "");
    const token = getAuthToken();
    if (!token) {
      onEvent({ type: "error", message: "Not authenticated" });
      return;
    }

    const ws = new WebSocket(`${wsBaseUrl}/ws/v3/voice?token=${token}`);
    ws.binaryType = "arraybuffer";
    this.ws = ws;

    ws.onopen = async () => {
      ws.send(
        JSON.stringify({
          type: "init",
          launch_mode: "continue_session",
          session_id: init.sessionId,
          student_id: init.studentId,
          chapter_id: init.chapterId,
          language: init.language,
          voice: init.voice,
        }),
      );
      onEvent({ type: "connected" });
      try {
        await this._startAudio();
      } catch (err) {
        // getUserMedia permission denial, no AudioWorklet support, etc. WebSocket's
        // onopen handler is fire-and-forget -- nothing awaits this closure's promise --
        // so a rejection here would otherwise vanish as an unhandled rejection instead
        // of ever reaching the caller.
        console.error("[SpeechPipelineService] Failed to start audio:", err);
        onEvent({
          type: "error",
          message: err instanceof Error ? err.message : "Could not access the microphone",
        });
      }
    };

    ws.onmessage = (event) => this._onMessage(event);
    ws.onclose = () => onEvent({ type: "disconnected" });
    ws.onerror = () => onEvent({ type: "error", message: "Connection error" });
  }

  async disconnect() {
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
    this.micNode?.disconnect();
    this.micNode = null;
    this.playbackNode?.disconnect();
    this.playbackNode = null;
    await this.micCtx?.close();
    this.micCtx = null;
    await this.playbackCtx?.close();
    this.playbackCtx = null;
    this.ws?.close();
    this.ws = null;
    this.state = "idle";
  }

  setMuted(muted: boolean) {
    // Push-to-talk is built on this, the same way voiceService's is: unmute on press,
    // mute on release. Releasing mid-utterance must close the turn explicitly -- the
    // worklet's own end_of_speech only fires after 700ms of silence, which a PTT
    // release does not wait for, and _onMicMessage drops everything the instant
    // `this.muted` flips, so without this the server would be left holding an
    // AudioFeed open forever waiting for a close that was never going to arrive.
    if (muted && !this.muted && this.state === "listening") {
      this._sendJson({ type: "end_of_speech", client_ts_ms: Date.now() });
    }
    this.muted = muted;
    this._sendJson({ type: muted ? "mute" : "unmute" });
  }

  // ── Audio setup ──────────────────────────────────────────────────────────────

  private async _startAudio() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    // Two contexts, deliberately: the mic wants the device's native rate (best capture
    // quality/compatibility; mic-processor.js resamples to 16k itself, so it does not
    // care what that native rate is), and playback wants to run AT the TTS rate so the
    // browser's own output stage resamples correctly instead of us skipping that step.
    this.micCtx = new AudioContext();
    await this.micCtx.audioWorklet.addModule("/worklets/mic-processor.js");

    const source = this.micCtx.createMediaStreamSource(this.mediaStream);
    this.micNode = new AudioWorkletNode(this.micCtx, "mic-processor");
    this.micNode.port.onmessage = (e) => this._onMicMessage(e.data);
    source.connect(this.micNode);
    // The mic node produces no output; connecting it to nothing is intentional -- it
    // only needs to run, not to be audible.

    this.playbackCtx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
    await this.playbackCtx.audioWorklet.addModule("/worklets/playback-processor.js");
    this.playbackNode = new AudioWorkletNode(this.playbackCtx, "playback-processor");
    this.playbackNode.port.onmessage = (e) => this._onPlaybackMessage(e.data);
    this.playbackNode.connect(this.playbackCtx.destination);
  }

  private _onMicMessage(msg: { type: string; preroll?: ArrayBuffer; pcm?: ArrayBuffer }) {
    if (this.muted) return;

    const interrupting = ownsTheTurn(this.state);

    if (msg.type === "speech_start") {
      this.speechOnsetAt = performance.now();
      if (interrupting) {
        // Do NOT tell the server yet. A bug here (found live, session
        // 5d058c6c-...): the worklet's VAD only requires 250ms + an RMS threshold to
        // fire, and any cough, chair creak or mic self-noise during the tutor's
        // multi-second "thinking" pause used to be forwarded as speech_start
        // immediately -- which the server treats as a real interruption on sight
        // (connection.py cancels the in-flight brain generation the instant it sees
        // one). The child's real question was silently discarded, no error, no
        // audio, ever. Buffering the preroll and waiting for BARGE_IN_MIN_MS of
        // sustained voice (_maybeConfirmInterruption) is the same gate the SPEAKING
        // path already had; THINKING just never got it.
        this.pendingPreroll = msg.preroll ?? null;
        return;
      }
      this.state = "listening";
      this.onEvent?.({ type: "state", state: "listening" });
      this._sendJson({ type: "speech_start", client_ts_ms: Date.now() });
      if (msg.preroll) this._sendBinary(msg.preroll);
      return;
    }

    if (msg.type === "frame" && msg.pcm) {
      if (this.speechOnsetAt !== null && interrupting) {
        this._maybeConfirmInterruption();
      }
      // Only forward audio once a turn is actually open server-side. Before
      // confirmation there is no open AudioFeed on the other end to receive it.
      if (this.state === "listening") {
        this._sendBinary(msg.pcm);
      }
      return;
    }

    if (msg.type === "speech_end") {
      const wasUnconfirmed = this.speechOnsetAt !== null && this.state !== "listening";
      this.speechOnsetAt = null;
      this.pendingPreroll = null;
      if (wasUnconfirmed) return; // never opened a server-side turn; nothing to close
      this._sendJson({ type: "end_of_speech", client_ts_ms: Date.now() });
    }
  }

  private _maybeConfirmInterruption() {
    if (this.speechOnsetAt === null) return;
    if (!isSustained(this.speechOnsetAt, performance.now(), BARGE_IN_MIN_MS)) return;

    if (this.state === "speaking") {
      // Sustained voice while the tutor is speaking: a real interruption. Stop
      // playback locally FIRST (design doc A11 -- never wait for the server round
      // trip), then tell the server what was actually heard.
      this.playbackNode?.port.postMessage({ type: "clear" });
      if (this.activeUtteranceId !== null) {
        this._sendJson({
          type: "barge_in",
          utterance_id: this.activeUtteranceId,
          played_until_ms: this.lastPlayedUntilMs,
        });
      }
    }
    // Either way (interrupting SPEAKING or THINKING), open the new turn now that
    // we've confirmed this is real speech, not a stray noise.
    this.state = "listening";
    this.onEvent?.({ type: "state", state: "listening" });
    this._sendJson({ type: "speech_start", client_ts_ms: Date.now() });
    if (this.pendingPreroll) this._sendBinary(this.pendingPreroll);
    this.pendingPreroll = null;
    this.speechOnsetAt = null; // one confirmation per onset
  }

  private _onPlaybackMessage(msg: { type: string; playedUntilMs: number }) {
    if (msg.type === "position") {
      this.lastPlayedUntilMs = msg.playedUntilMs;
    }
  }

  // ── Wire framing ─────────────────────────────────────────────────────────────

  private _sendBinary(pcm: ArrayBuffer) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(packUplinkFrame(this.uplinkSeq++, Date.now(), pcm));
  }

  private _sendJson(payload: Record<string, unknown>) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  private _onMessage(event: MessageEvent) {
    if (event.data instanceof ArrayBuffer) {
      this._onDownlinkAudio(event.data);
      return;
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    this._onControlFrame(payload);
  }

  private _onDownlinkAudio(frame: ArrayBuffer) {
    const parsed = parseDownlinkFrame(frame);
    if (!isDownlinkAudioFrame(parsed)) return;
    if (this.activeUtteranceId !== null && parsed.utteranceId !== this.activeUtteranceId) {
      // Stale audio from an utterance we already cancelled -- drop it. This is what
      // utterance_id on every chunk buys (design doc §6): a barge-in can distinguish
      // "the one I meant to stop" from a later utterance that has already started.
      return;
    }
    this.playbackNode?.port.postMessage({ type: "enqueue", pcm: parsed.pcm }, [parsed.pcm]);
  }

  private _onControlFrame(payload: Record<string, unknown>) {
    const type = payload.type as string;
    switch (type) {
      case "session_id":
        this.onEvent?.({ type: "session_id", sessionId: String(payload.session_id) });
        break;
      case "state":
        this.state = payload.state as PipelineState;
        this.onEvent?.({ type: "state", state: this.state });
        break;
      case "partial_transcript":
        this.onEvent?.({ type: "partial_transcript", text: String(payload.text) });
        break;
      case "final_transcript":
        this.onEvent?.({
          type: "final_transcript",
          text: String(payload.text),
          confidence: (payload.confidence as number) ?? null,
          language: String(payload.language ?? ""),
        });
        break;
      case "utterance_start":
        this.activeUtteranceId = Number(payload.utterance_id);
        this.lastPlayedUntilMs = 0;
        this.onEvent?.({ type: "utterance_start", utteranceId: this.activeUtteranceId });
        break;
      case "assistant_transcript":
        this.onEvent?.({
          type: "assistant_transcript",
          utteranceId: Number(payload.utterance_id),
          text: String(payload.text ?? ""),
        });
        break;
      case "utterance_end":
        this.onEvent?.({
          type: "utterance_end",
          utteranceId: Number(payload.utterance_id),
          reason: payload.reason === "cancelled" ? "cancelled" : "complete",
        });
        this.activeUtteranceId = null;
        break;
      case "cancel":
        // Server-initiated cancel (distinct from our own local barge-in): clear
        // whatever is still queued for that utterance.
        if (Number(payload.utterance_id) === this.activeUtteranceId) {
          this.playbackNode?.port.postMessage({ type: "clear" });
        }
        break;
      case "safety_redirect":
        this.onEvent?.({ type: "safety_redirect", content: String(payload.content ?? "") });
        break;
      case "error":
        this.onEvent?.({ type: "error", message: String(payload.message ?? payload.code ?? "error") });
        break;
      case "pong":
        break; // clock-sync offset estimation is a later refinement (design doc A14)
      default:
        break;
    }
  }
}

export const speechPipelineService = new SpeechPipelineService();
