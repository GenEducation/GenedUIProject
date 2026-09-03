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
import { frameAction, isSustained, ownsTheTurn } from "@/features/student/services/speechPipelineVad";
import { SileroVadController } from "@/features/student/services/vad/sileroVadController";
import type { VadVerdict } from "@/features/student/services/vad/vadDecision";

export type PipelineState = "idle" | "listening" | "thinking" | "speaking";

/**
 * What the microphone itself is doing, which is NOT the same question as what the turn
 * is doing (PipelineState).
 *
 * The UI previously had only the latter, so it could show a live-looking microphone
 * before capture existed: connect() resolves when the WebSocket opens, but _startAudio()
 * -- getUserMedia's permission prompt, two AudioContexts, two addModule() fetches -- runs
 * afterwards and can take hundreds of milliseconds or fail outright. Anything a child
 * says in that window goes nowhere, and the interface told them it was listening.
 *
 * "ready" therefore means every one of capture, preprocessing and the socket is up, and
 * nothing before that point may present as ready.
 */
export type MicState = "initializing" | "ready" | "listening" | "unavailable";

export type SpeechPipelineEvent =
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "session_id"; sessionId: string }
  | { type: "state"; state: PipelineState }
  | { type: "mic_state"; micState: MicState; detail?: string }
  | { type: "partial_transcript"; text: string }
  | { type: "final_transcript"; text: string; confidence: number | null; language: string }
  | { type: "utterance_start"; utteranceId: number }
  | { type: "assistant_transcript"; utteranceId: number; text: string }
  | { type: "utterance_end"; utteranceId: number; reason: "complete" | "cancelled" }
  | { type: "safety_redirect"; content: string }
  | { type: "visual"; kind: string; eventId: string; payload: Record<string, unknown> }
  | { type: "error"; message: string };

export interface SpeechPipelineInit {
  // Omitted for a cold start (core_service/voice/pipeline/router.py now creates a
  // session when none is given) -- the server assigns one and reports it back as a
  // "session_id" event, which the caller must adopt.
  sessionId?: string;
  chapterId?: string;
  // Cold start only: the subject the student already picked in the agent picker, so
  // entry doesn't re-ask "which subject" -- core_service/voice/pipeline/router.py
  // validates it the same way V2's voice/router.py does (require_taxonomy_subject).
  subject?: string;
  language?: string;
  voice?: string;
  studentId: string;
}

// Design doc §7.5: a voice onset shorter than this while the tutor is speaking is a
// backchannel ("haan", "okay") and must not interrupt; only a sustained one barges in.
const BARGE_IN_MIN_MS = 400;

// Cap on the audio held while an interruption is being confirmed. BARGE_IN_MIN_MS of
// 20ms frames is 20; this is ~1.5s, so a confirmation that never arrives (stray noise)
// cannot grow this without bound, and speech_end clears it either way.
const MAX_PENDING_FRAMES = 75;

// Must match core-service's shared_utils.speech.config.OUTPUT_SAMPLE_RATE_HZ -- the
// rate TTS actually synthesizes at. Live bug: the playback AudioContext used to be
// created with no explicit rate, which browsers default to the hardware's native rate
// (commonly 48000Hz). The worklet wrote 24kHz samples straight into that buffer with no
// resampling, so every utterance played at ~2x speed and pitch -- "very very fast" and
// squeaky, reported live. Constructing this context AT the TTS rate makes the browser's
// own output stage do the resampling, correctly, once, instead of us getting it wrong.
const PLAYBACK_SAMPLE_RATE = 24000;

// How often buffer depth is reported to the server. The worklet already throttles its
// own reports; this bounds the WebSocket traffic independently of the audio callback
// rate, which changes with the device's block size.
const BUFFER_REPORT_INTERVAL_MS = 250;

// How often the clock exchange runs. Frequent at first so an estimate exists early in the
// lesson, then steady -- clocks drift slowly, but laptops sleep and tabs get throttled, so
// it never stops entirely.
const CLOCK_PING_INTERVAL_MS = 15000;
const CLOCK_PING_INITIAL_INTERVAL_MS = 2000;
const CLOCK_PING_FAST_COUNT = 4;
const NEGATIVE_RTT_TOLERANCE_MS = 50;

/**
 * Visual kinds this client can render. Sent at init so the server drops what we cannot
 * draw rather than sending it for us to ignore -- a mismatch is then visible on the
 * server's side as a count, instead of being invisible on both.
 */
const SUPPORTED_VISUAL_KINDS = [
  "visual",
  "pointer",
  "pointer_clear",
  "show_figure",
  "math_draw",
  "clear",
];

interface ScheduledVisual {
  eventId: string;
  kind: string;
  utteranceId: number;
  sequence: number;
  playAtMs: number;
  payload: Record<string, unknown>;
}

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
  /** Audio captured while an interruption is still being confirmed -- see
   * MAX_PENDING_FRAMES and _onMicMessage's "frame" branch. */
  private pendingFrames: ArrayBuffer[] = [];
  private muted = false;
  private micState: MicState = "initializing";
  private pushToTalk = false;
  private lastBufferReportAt = 0;
  private clockTimer: ReturnType<typeof setTimeout> | null = null;
  private clockPingsSent = 0;
  /** Add to a local timestamp to express it on the server's timeline. Null until the
   * estimator has enough evidence -- callers must degrade rather than assume zero. */
  private clockOffsetMs: number | null = null;
  private clockRttMs: number | null = null;
  /** Visuals waiting for playback to reach them, ordered by sequence within utterance. */
  private scheduledVisuals: ScheduledVisual[] = [];
  private vad: SileroVadController | null = null;
  /** Latest detector health, surfaced for diagnostics -- a session spent on the energy
   * fallback behaves measurably differently from one on Silero. */
  private vadHealth = "starting";

  async connect(init: SpeechPipelineInit, onEvent: (event: SpeechPipelineEvent) => void) {
    // Live bug: a second connect() while one was already open (React StrictMode's
    // double-invoked effects in dev, or any other double-call) never closed the first
    // socket -- `this.ws = ws` below just overwrote the reference, leaving the old
    // connection's own server-side session alive and its frames still arriving into
    // this.onEvent (a single shared field, always the latest closure) interleaved with
    // the new session's -- two independent cold-start entry conversations, two sets of
    // utterance_start/assistant_transcript frames on one message handler: a literal
    // "double response". Tearing down any existing connection first makes connect()
    // idempotent under a double-call the way it was always assumed to be.
    if (this.ws) {
      await this.disconnect();
    }
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
          // No sessionId -> cold start: no chapter resolved yet, nothing to continue.
          // core_service/voice/v2/session_contract.py's VoiceLaunchContract forbids
          // "new" from carrying a session_id, mirroring continue_session's requiring one.
          launch_mode: init.sessionId ? "continue_session" : "new",
          session_id: init.sessionId,
          student_id: init.studentId,
          chapter_id: init.chapterId,
          subject: init.subject,
          language: init.language,
          voice: init.voice,
          supported_visuals: SUPPORTED_VISUAL_KINDS,
        }),
      );
      onEvent({ type: "connected" });
      this._startClockSync();
      // Explicitly NOT "ready" yet -- the socket being open says nothing about whether
      // the microphone is. See MicState.
      this._setMicState("initializing");
      try {
        await this._startAudio();
        this._setMicState("ready");
      } catch (err) {
        // getUserMedia permission denial, no AudioWorklet support, etc. WebSocket's
        // onopen handler is fire-and-forget -- nothing awaits this closure's promise --
        // so a rejection here would otherwise vanish as an unhandled rejection instead
        // of ever reaching the caller.
        console.error("[SpeechPipelineService] Failed to start audio:", err);
        this._setMicState(
          "unavailable",
          err instanceof Error ? err.message : "Could not access the microphone",
        );
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
    this._stopClockSync();
    this.vad?.stop();
    this.vad = null;
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
    this.clockOffsetMs = null;
    this.clockRttMs = null;
    this.clockPingsSent = 0;
    this.scheduledVisuals = [];
    this._setMicState("initializing");
    this.pushToTalk = false;
    this.speechOnsetAt = null;
    this.pendingPreroll = null;
    this.pendingFrames = [];
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

  /**
   * Begin a forced-listening turn: the child is holding the talk button.
   *
   * Capture is started BEFORE any visual acknowledgement the caller renders, because the
   * opposite order loses the first syllable -- a child starts talking as they press, not
   * after the button finishes animating. The worklet's preroll ring buffer covers the
   * remaining few tens of milliseconds.
   */
  startPushToTalk() {
    if (this.pushToTalk) return; // stuck/repeat pointer events must be idempotent
    this.pushToTalk = true;
    this.muted = false;
    this.state = "listening";
    this._setMicState("listening");
    this.onEvent?.({ type: "state", state: "listening" });
    this._sendJson({ type: "ptt_press", client_ts_ms: Date.now() });
    // Anything the mic worklet had already buffered toward an onset belongs to this
    // turn -- the child may well have started speaking before the press landed.
    if (this.pendingPreroll) this._sendBinary(this.pendingPreroll);
    for (const frame of this.pendingFrames) this._sendBinary(frame);
    this.pendingFrames = [];
    this.pendingPreroll = null;
    this.speechOnsetAt = null;
  }

  /**
   * Release, cancel, blur, disconnect, pointer loss -- every one of these ends the turn,
   * and they can arrive together, so this is idempotent by construction.
   *
   * The server keeps a short trailing grace after the release (its
   * ptt_release_grace_ms), because a release reliably lands slightly before the speaker
   * actually stops.
   */
  stopPushToTalk() {
    if (!this.pushToTalk) return;
    this.pushToTalk = false;
    this._sendJson({ type: "ptt_release", client_ts_ms: Date.now() });
    this._setMicState("ready");
  }

  /**
   * A local timestamp expressed on the server's timeline, or null while unsynchronised.
   *
   * Null rather than the raw value on purpose: silently returning an unconverted local
   * timestamp is the meaningless cross-clock comparison the whole exchange exists to
   * prevent, and it fails invisibly.
   */
  toServerMs(localMs: number): number | null {
    return this.clockOffsetMs === null ? null : localMs + this.clockOffsetMs;
  }

  get clockSync(): { offsetMs: number | null; rttMs: number | null } {
    return { offsetMs: this.clockOffsetMs, rttMs: this.clockRttMs };
  }

  /**
   * Emit every visual whose moment in the audio has arrived.
   *
   * Scheduled against the PLAYBACK position the worklet reports -- not the server's
   * clock, not a setTimeout from the frame's arrival. Arrival time is meaningless here:
   * the server streams several seconds ahead of playback, so a visual arrives long
   * before the sentence that introduces it is heard.
   */
  private _applyDueVisuals() {
    if (this.scheduledVisuals.length === 0) return;
    const remaining: ScheduledVisual[] = [];
    for (const visual of this.scheduledVisuals) {
      const isCurrent = visual.utteranceId === this.activeUtteranceId;
      // A visual for an utterance that has already finished is LATE, not obsolete -- the
      // server cancels genuinely stale ones explicitly (visual_cancel). Applying it
      // immediately is better than dropping it: the figure the tutor just described
      // should still appear, even a beat behind.
      const due = !isCurrent || this.lastPlayedUntilMs >= visual.playAtMs;
      if (!due) {
        remaining.push(visual);
        continue;
      }
      this.onEvent?.({
        type: "visual",
        kind: visual.kind,
        eventId: visual.eventId,
        payload: visual.payload,
      });
      // Acknowledged only once handed to the renderer, so "applied" on the server means
      // the child saw it rather than that a frame was delivered.
      this._sendJson({ type: "visual_ack", event_id: visual.eventId });
    }
    this.scheduledVisuals = remaining;
  }

  private _startClockSync() {
    this._stopClockSync();
    const tick = () => {
      this._sendJson({ type: "ping", client_ts_ms: Date.now() });
      this.clockPingsSent++;
      // Fast at first so an estimate exists before the first turn needs one, then steady.
      const next =
        this.clockPingsSent < CLOCK_PING_FAST_COUNT
          ? CLOCK_PING_INITIAL_INTERVAL_MS
          : CLOCK_PING_INTERVAL_MS;
      this.clockTimer = setTimeout(tick, next);
    };
    tick();
  }

  private _stopClockSync() {
    if (this.clockTimer !== null) {
      clearTimeout(this.clockTimer);
      this.clockTimer = null;
    }
  }

  get microphoneState(): MicState {
    return this.micState;
  }

  private _setMicState(next: MicState, detail?: string) {
    if (this.micState === next) return;
    this.micState = next;
    this.onEvent?.({ type: "mic_state", micState: next, detail });
  }

  // ── Audio setup ──────────────────────────────────────────────────────────────

  private async _startAudio() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      // autoGainControl is OFF deliberately, and it is half of why the cascade could not
      // hold a single turn: AGC continuously renormalizes gain, so in a quiet room it
      // raises the noise floor until room tone alone reads as speech to any energy VAD
      // downstream. That produced a stream of phantom "barge-ins" which destroyed three
      // consecutive tutor replies before one byte of audio was ever spoken (live, 2 Sep
      // 2026 -- see mic-processor.js's RMS_ABSOLUTE_FLOOR comment for the evidence).
      // The VAD there now measures against a tracked noise floor instead of a constant,
      // which tolerates AGC far better, but a mic whose gain is stable is still the input
      // that decision wants -- the two fixes belong together. echoCancellation stays ON
      // and is load-bearing: without it the tutor's own playback re-enters the mic and
      // barges in on itself.
      // echoCancellation stays ON and is load-bearing: without it the tutor's own
      // playback re-enters the mic and barges in on itself.
      //
      // noiseSuppression stays ON, and this is the denoising decision rather than an
      // omission. RNNoise was considered and NOT added:
      //
      //  - The browser's WebRTC noise suppressor is already here, runs natively off the
      //    main thread, costs no bundle size, and is the "technically justified
      //    equivalent" the requirement allows for.
      //  - RNNoise would mean another WASM module competing for the same CPU as Silero
      //    inference on low-end devices -- which is precisely the population that noise
      //    suppression is supposed to help.
      //  - The actual failure being fixed was never insufficient denoising. It was that
      //    an ENERGY detector cannot tell speech from loud steady noise at any SNR
      //    (mic-processor.js's RMS_THRESHOLD_MAX names that limit outright). Silero
      //    answers the real question, which is the change that matters here.
      //
      // What has NOT been established, and must not be claimed: whether suppression
      // helps or harms RECOGNITION. Aggressive NS distorts speech, and it is entirely
      // plausible that STT would score better on the unsuppressed signal while detection
      // scores better on the suppressed one -- which is what the requirement to separate
      // detection audio from STT audio anticipates. Deciding that without measurement
      // would be a guess dressed as a design choice. It needs the benchmark harness
      // (tools/speech_benchmark) run over a real noisy corpus, which does not exist yet.
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
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

    // Silero is the primary detector; the worklet's energy VAD becomes the fallback.
    // start() never throws -- every failure path (no Worker, no WASM, a model that 404s,
    // a device that cannot keep up) lands on the energy detector rather than on a
    // microphone that has stopped working.
    this.vad = new SileroVadController({ onVerdict: (v) => this._onVadVerdict(v) });
    const sileroStarted = await this.vad.start();
    if (sileroStarted) {
      // Only now does the worklet stop deciding for itself. Switching before the worker
      // is up would leave nobody making the decision at all.
      this.micNode.port.postMessage({ type: "set_mode", mode: "external" });
    } else {
      console.warn("[SpeechPipelineService] Silero unavailable -- using the energy VAD");
      this.vad = null;
    }
    source.connect(this.micNode);
    // The mic node produces no output; connecting it to nothing is intentional -- it
    // only needs to run, not to be audible.

    this.playbackCtx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
    await this.playbackCtx.audioWorklet.addModule("/worklets/playback-processor.js");
    this.playbackNode = new AudioWorkletNode(this.playbackCtx, "playback-processor");
    this.playbackNode.port.onmessage = (e) => this._onPlaybackMessage(e.data);
    this.playbackNode.connect(this.playbackCtx.destination);
  }

  private _onMicMessage(msg: {
    type: string;
    preroll?: ArrayBuffer;
    pcm?: ArrayBuffer;
    floats?: ArrayBuffer;
    energyVoiced?: boolean;
  }) {
    if (this.muted) return;

    if (this.pushToTalk) {
      // Forced listening: the button owns the turn boundary, so onset/end decisions from
      // the energy VAD are ignored entirely and every captured frame is forwarded. This
      // is the "bypasses autonomous onset decisions while preserving preroll" rule -- the
      // preroll still applies, it was just already flushed at press time.
      if (msg.type === "frame" && msg.pcm) this._sendBinary(msg.pcm);
      return;
    }

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

    if (msg.type === "analysis_frame" && msg.pcm && msg.floats) {
      // External mode: the worklet made no decision, so route the frame through the
      // arbiter and act on its verdict below. The uplink still only carries PCM16.
      this.vad?.pushFrame(new Float32Array(msg.floats), Boolean(msg.energyVoiced));
      this._handleCaptureFrame(msg.pcm);
      return;
    }

    if (msg.type === "preroll" && msg.preroll) {
      // Arrived because _onVadVerdict asked for it on a confirmed onset.
      if (ownsTheTurn(this.state)) this.pendingPreroll = msg.preroll;
      else this._sendBinary(msg.preroll);
      return;
    }

    if (msg.type === "frame" && msg.pcm) {
      if (this.speechOnsetAt !== null && interrupting) {
        this._maybeConfirmInterruption();
      }
      // Only forward audio once a turn is actually open server-side. Before
      // confirmation there is no open AudioFeed on the other end to receive it.
      // "cannot send it yet" is not "throw it away" -- see frameAction, which carries the
      // full story of the 400ms hole this used to punch into the start of every
      // interrupting utterance.
      const action = frameAction(this.state, this.speechOnsetAt !== null);
      if (action === "send") {
        this._sendBinary(msg.pcm);
      } else if (action === "buffer") {
        this.pendingFrames.push(msg.pcm);
        if (this.pendingFrames.length > MAX_PENDING_FRAMES) this.pendingFrames.shift();
      }
      return;
    }

    if (msg.type === "speech_end") {
      const wasUnconfirmed = this.speechOnsetAt !== null && this.state !== "listening";
      this.speechOnsetAt = null;
      this.pendingPreroll = null;
      this.pendingFrames = [];
      if (wasUnconfirmed) return; // never opened a server-side turn; nothing to close
      if (this.pushToTalk) return; // the button, not the VAD, ends a push-to-talk turn
      // `candidate: true` hands the decision to the server's endpoint arbiter instead of
      // finalizing the turn outright. The local VAD only knows that 700ms of silence
      // passed, which is not the same thing as the child having finished: they pause
      // mid-sentence to think, and low-energy terminal phonemes fall under the threshold
      // while the word is still being said. The arbiter weighs this against the
      // provider's own endpoint signal and its partials before committing, and keeps the
      // audio feed open meanwhile so nothing spoken during the window is lost.
      //
      // A server that does not understand the flag treats this as a plain end_of_speech,
      // which is exactly the previous behaviour -- so this is safe to ship ahead of the
      // backend.
      this._sendJson({ type: "end_of_speech", candidate: true, client_ts_ms: Date.now() });
    }
  }

  /** One captured frame, once a decision about it has been made (or deferred). */
  private _handleCaptureFrame(pcm: ArrayBuffer) {
    if (this.speechOnsetAt !== null && ownsTheTurn(this.state)) {
      this._maybeConfirmInterruption();
    }
    const action = frameAction(this.state, this.speechOnsetAt !== null);
    if (action === "send") {
      this._sendBinary(pcm);
    } else if (action === "buffer") {
      this.pendingFrames.push(pcm);
      if (this.pendingFrames.length > MAX_PENDING_FRAMES) this.pendingFrames.shift();
    }
  }

  /**
   * The arbiter's verdict for the frame just pushed.
   *
   * Mirrors what the worklet used to do internally, with one difference that matters: the
   * decision is now Silero's whenever Silero is healthy, and the energy detector's only
   * when it is not. The turn-shaping around it -- preroll, the barge-in confirmation
   * gate, forced listening -- is unchanged, because none of it was ever the problem.
   */
  private _onVadVerdict(verdict: VadVerdict) {
    this.vadHealth = verdict.health;
    if (this.pushToTalk) return; // the button owns the turn boundary

    if (verdict.onset) {
      this.speechOnsetAt = performance.now();
      // The preroll lives in the worklet's ring buffer; ask for it now that the onset is
      // real. Inference necessarily trails the audio, which is exactly why it exists.
      this.micNode?.port.postMessage({ type: "flush_preroll" });
      if (!ownsTheTurn(this.state)) {
        this.state = "listening";
        this.onEvent?.({ type: "state", state: "listening" });
        this._sendJson({ type: "speech_start", client_ts_ms: Date.now() });
      }
      return;
    }

    if (verdict.offset) {
      const wasUnconfirmed = this.speechOnsetAt !== null && this.state !== "listening";
      this.speechOnsetAt = null;
      this.pendingPreroll = null;
      this.pendingFrames = [];
      if (wasUnconfirmed) return;
      this._sendJson({ type: "end_of_speech", candidate: true, client_ts_ms: Date.now() });
    }
  }

  get vadStatus(): string {
    return this.vadHealth;
  }

  private _maybeConfirmInterruption() {
    if (this.speechOnsetAt === null) return;
    if (!isSustained(this.speechOnsetAt, performance.now(), BARGE_IN_MIN_MS)) return;

    if (this.state === "speaking") {
      // Sustained voice while the tutor is speaking: probably a real interruption.
      // Silence playback locally FIRST (design doc A11 -- never wait for the server
      // round trip), but PAUSE rather than discard: "probably" is doing real work in
      // that sentence, and if the transcript comes back empty the server tells us to
      // resume and nothing was lost. Discarding here meant every false positive
      // permanently ate whatever was buffered, which is seconds of speech.
      this.playbackNode?.port.postMessage({ type: "pause" });
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
    // Then everything captured while we were deciding, in order, so the utterance the
    // server sees runs preroll -> confirmation window -> live with no gap in it.
    for (const frame of this.pendingFrames) this._sendBinary(frame);
    this.pendingFrames = [];
    this.pendingPreroll = null;
    this.speechOnsetAt = null; // one confirmation per onset
  }

  private _onPlaybackMessage(msg: {
    type: string;
    playedUntilMs?: number;
    utteranceId?: number | null;
    bufferedMs?: number;
    wantMore?: boolean;
    saturated?: boolean;
    droppedChunks?: number;
  }) {
    if (msg.type === "overflow") {
      // The bounded queue refused audio, which can only happen if the server ignored
      // backpressure. Surfaced rather than swallowed: a hole in the middle of an
      // utterance is indistinguishable to the child from the tutor being wrong.
      console.error(
        "[SpeechPipelineService] playback buffer overflow -- dropped",
        msg.droppedChunks,
        "chunk(s)",
      );
      this.onEvent?.({ type: "error", message: "Audio buffer overflowed" });
      return;
    }
    if (msg.type !== "position") return;
    // Only trust a position that is about the utterance we currently believe is playing.
    // A report for the previous utterance's tail would otherwise be read as progress
    // through the new one.
    if (msg.utteranceId != null && msg.utteranceId !== this.activeUtteranceId) return;
    this.lastPlayedUntilMs = msg.playedUntilMs ?? this.lastPlayedUntilMs;
    this._applyDueVisuals();

    // Report depth so the server can stop synthesizing ahead of playback. Without this
    // the server has no idea how far in front it is running and will happily queue the
    // whole reply into concurrent provider calls, all of which a barge-in then discards.
    const now = Date.now();
    if (now - this.lastBufferReportAt < BUFFER_REPORT_INTERVAL_MS) return;
    this.lastBufferReportAt = now;
    this._sendJson({
      type: "playback_buffer",
      buffered_ms: msg.bufferedMs ?? 0,
      played_until_ms: this.lastPlayedUntilMs,
      want_more: msg.wantMore ?? true,
      saturated: msg.saturated ?? false,
      utterance_id: this.activeUtteranceId,
    });
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
    // The utterance id travels WITH the audio so the worklet can attribute played
    // samples to the utterance they belong to -- see playback-processor.js. The main
    // thread cannot do that attribution itself: at any moment the queue may still hold
    // the tail of the previous utterance.
    this.playbackNode?.port.postMessage(
      { type: "enqueue", pcm: parsed.pcm, utteranceId: parsed.utteranceId },
      [parsed.pcm],
    );
  }

  private _onControlFrame(payload: Record<string, unknown>) {
    const type = payload.type as string;
    switch (type) {
      case "session_id":
        this.onEvent?.({ type: "session_id", sessionId: String(payload.session_id) });
        break;
      case "state":
        this.state = payload.state as PipelineState;
        // The server re-sends this when it has read an interruption's transcript and
        // found nothing in it, which is both halves of undoing a false positive: it
        // restores the state _maybeConfirmInterruption optimistically set to
        // "listening" (without which ownsTheTurn stays false, the 400ms barge-in gate
        // never applies again for the rest of the turn, and the next stray noise
        // cancels the reply outright), and it lets the paused audio play on.
        if (ownsTheTurn(this.state)) {
          this.playbackNode?.port.postMessage({ type: "resume" });
          this.speechOnsetAt = null;
          this.pendingPreroll = null;
          this.pendingFrames = [];
        }
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
      case "utterance_end": {
        const reason = payload.reason === "cancelled" ? "cancelled" : "complete";
        if (reason === "cancelled") {
          // Confirmed stale: now it really can go. (A "complete" utterance must NOT be
          // cleared -- its tail is still queued and still owed to the child.)
          this.playbackNode?.port.postMessage({ type: "clear" });
        }
        this.onEvent?.({
          type: "utterance_end",
          utteranceId: Number(payload.utterance_id),
          reason,
        });
        this.activeUtteranceId = null;
        break;
      }
      case "cancel":
        // Server-initiated cancel (distinct from our own local barge-in): clear
        // whatever is still queued for that utterance.
        if (Number(payload.utterance_id) === this.activeUtteranceId) {
          this.playbackNode?.port.postMessage({ type: "clear" });
        }
        break;
      case "visual_event":
        this.scheduledVisuals.push({
          eventId: String(payload.event_id),
          kind: String(payload.kind),
          utteranceId: Number(payload.utterance_id),
          sequence: Number(payload.sequence),
          playAtMs: Number(payload.play_at_ms) || 0,
          payload: (payload.payload as Record<string, unknown>) ?? {},
        });
        // Sorted by the server's sequence, not arrival order: model tokens, tool calls,
        // TTS segments and network frames all complete out of order, and applying a
        // pointer before the figure it points at is exactly what that would produce.
        this.scheduledVisuals.sort((a, b) =>
          a.utteranceId === b.utteranceId
            ? a.sequence - b.sequence
            : a.utteranceId - b.utteranceId,
        );
        // Deliberately NOT flushed here. Firing on arrival would apply each event in
        // ARRIVAL order, which makes the sort above pointless -- an already-due event
        // that arrived second would still be emitted second. Flushing only on playback
        // ticks means every event pending at that moment is ordered together. The
        // playback worklet reports every ~100ms whether or not audio is playing, so a
        // late visual waits at most that long.
        break;
      case "visual_cancel": {
        const ids = new Set((payload.event_ids as string[]) ?? []);
        this.scheduledVisuals = this.scheduledVisuals.filter((v) => !ids.has(v.eventId));
        break;
      }
      case "session_limit":
        this.onEvent?.({
          type: "error",
          message: String(payload.message ?? "session limit reached"),
        });
        break;
      case "safety_redirect":
        this.onEvent?.({ type: "safety_redirect", content: String(payload.content ?? "") });
        break;
      case "error":
        this.onEvent?.({ type: "error", message: String(payload.message ?? payload.code ?? "error") });
        break;
      case "pong": {
        // t3 is read HERE, at the moment of receipt, not later in the handler chain --
        // any work done first is charged to the network as delay it did not cause.
        const t3 = Date.now();
        const t0 = Number(payload.client_ts_ms);
        const t1 = Number(payload.server_recv_ms);
        const t2 = Number(payload.server_send_ms);
        if (!Number.isFinite(t0) || !Number.isFinite(t1) || !Number.isFinite(t2)) break;
        // Every difference below is between two readings of the SAME clock, which is
        // what makes the result meaningful: (t3-t0) is measured entirely on this
        // machine, (t2-t1) entirely on the server's. Subtracting the second from the
        // first removes server processing time without ever mixing the two clocks.
        const rtt = t3 - t0 - (t2 - t1);
        const offset = (t1 - t0 + (t2 - t3)) / 2;
        // Tolerant of a slightly negative result rather than demanding >= 0. Both clocks
        // are read at millisecond granularity, so on a fast link where the true round
        // trip is under a millisecond, rounding alone can make (t3-t0) smaller than
        // (t2-t1). Rejecting those would discard the lowest-delay samples -- exactly the
        // ones the estimate most wants. A genuinely inconsistent exchange is off by
        // orders of magnitude more.
        if (rtt >= -NEGATIVE_RTT_TOLERANCE_MS) {
          this.clockRttMs = Math.max(0, rtt);
          this.clockOffsetMs = offset;
        }
        // The server keeps its own filtered estimate (outlier rejection, step
        // detection); it needs all four timestamps to do that, not our conclusion.
        this._sendJson({
          type: "clock_sync",
          t0_client_ms: t0,
          t1_server_ms: t1,
          t2_server_ms: t2,
          t3_client_ms: t3,
        });
        break;
      }
      case "clock_sync":
        // The server's filtered view. Preferred over our own single-sample estimate
        // because it has rejected outliers across a window we cannot see.
        if (payload.synchronised) {
          this.clockOffsetMs = Number(payload.offset_ms);
          this.clockRttMs = Number(payload.rtt_ms);
        }
        break;
      default:
        break;
    }
  }
}

export const speechPipelineService = new SpeechPipelineService();
