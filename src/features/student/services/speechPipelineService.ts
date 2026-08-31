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

export type PipelineState = "idle" | "listening" | "thinking" | "speaking";

export type SpeechPipelineEvent =
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "session_id"; sessionId: string }
  | { type: "state"; state: PipelineState }
  | { type: "partial_transcript"; text: string }
  | { type: "final_transcript"; text: string; confidence: number | null; language: string }
  | { type: "utterance_start"; utteranceId: number; text: string; estDurationMs: number }
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

class SpeechPipelineService {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private micNode: AudioWorkletNode | null = null;
  private playbackNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private onEvent: ((event: SpeechPipelineEvent) => void) | null = null;

  private uplinkSeq = 0;
  private state: PipelineState = "idle";
  private activeUtteranceId: number | null = null;
  private lastPlayedUntilMs = 0;
  private speechOnsetAt: number | null = null;
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
      await this._startAudio();
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
    await this.audioCtx?.close();
    this.audioCtx = null;
    this.ws?.close();
    this.ws = null;
    this.state = "idle";
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this._sendJson({ type: muted ? "mute" : "unmute" });
  }

  // ── Audio setup ──────────────────────────────────────────────────────────────

  private async _startAudio() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    this.audioCtx = new AudioContext();
    await this.audioCtx.audioWorklet.addModule("/worklets/mic-processor.js");
    await this.audioCtx.audioWorklet.addModule("/worklets/playback-processor.js");

    const source = this.audioCtx.createMediaStreamSource(this.mediaStream);
    this.micNode = new AudioWorkletNode(this.audioCtx, "mic-processor");
    this.micNode.port.onmessage = (e) => this._onMicMessage(e.data);
    source.connect(this.micNode);
    // The mic node produces no output; connecting it to nothing is intentional -- it
    // only needs to run, not to be audible.

    this.playbackNode = new AudioWorkletNode(this.audioCtx, "playback-processor");
    this.playbackNode.port.onmessage = (e) => this._onPlaybackMessage(e.data);
    this.playbackNode.connect(this.audioCtx.destination);
  }

  private _onMicMessage(msg: { type: string; preroll?: ArrayBuffer; pcm?: ArrayBuffer }) {
    if (this.muted) return;

    if (msg.type === "speech_start") {
      this.speechOnsetAt = performance.now();
      if (this.state === "speaking" || this.state === "thinking") {
        // Double-talk / interrupting the pause -- decide backchannel vs. real
        // interruption once we know the duration (see _maybeConfirmBargeIn below).
        // Capture continues regardless; the transcript is discarded server-side if
        // this turns out to be noise.
      } else {
        this.state = "listening";
        this.onEvent?.({ type: "state", state: "listening" });
      }
      this._sendJson({ type: "speech_start", client_ts_ms: Date.now() });
      if (msg.preroll) this._sendBinary(msg.preroll);
      return;
    }

    if (msg.type === "frame" && msg.pcm) {
      this._maybeConfirmBargeIn();
      this._sendBinary(msg.pcm);
      return;
    }

    if (msg.type === "speech_end") {
      this.speechOnsetAt = null;
      this._sendJson({ type: "end_of_speech", client_ts_ms: Date.now() });
    }
  }

  private _maybeConfirmBargeIn() {
    if (this.speechOnsetAt === null) return;
    if (this.state !== "speaking") return;
    if (performance.now() - this.speechOnsetAt < BARGE_IN_MIN_MS) return;

    // Sustained voice while the tutor is speaking: a real interruption. Stop playback
    // locally FIRST (design doc A11 -- never wait for the server round trip), then tell
    // the server what was actually heard.
    this.playbackNode?.port.postMessage({ type: "clear" });
    if (this.activeUtteranceId !== null) {
      this._sendJson({
        type: "barge_in",
        utterance_id: this.activeUtteranceId,
        played_until_ms: this.lastPlayedUntilMs,
      });
    }
    this.state = "listening";
    this.onEvent?.({ type: "state", state: "listening" });
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
        this.onEvent?.({
          type: "utterance_start",
          utteranceId: this.activeUtteranceId,
          text: String(payload.text ?? ""),
          estDurationMs: Number(payload.est_duration_ms ?? 0),
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
