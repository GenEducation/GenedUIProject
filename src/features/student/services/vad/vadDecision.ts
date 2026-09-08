/**
 * Speech-detection policy for the cascade: Silero primary, energy as the fallback.
 *
 * The cascade has been running on an energy VAD with a tracked noise floor
 * (`public/worklets/mic-processor.js`). That was a deliberate first cut and its own
 * comments are honest about the limit: an energy detector cannot separate speech from
 * loud steady noise, and `RMS_THRESHOLD_MAX` exists to stop a noisy room from becoming a
 * DEAF room rather than to make detection correct in one. In a classroom, a room with a
 * television on, or with a fan near the mic, that ceiling is reached routinely — and the
 * failure is not symmetric: a false onset cancels the tutor mid-sentence, and a missed
 * onset loses the child's answer entirely.
 *
 * Silero is a small trained model that answers the actual question ("is this speech")
 * rather than a proxy for it ("is this loud"). The assets have shipped in `public/` for
 * some time — `silero_vad_v5.onnx`, the ONNX runtime WASM, and the worklet bundle, copied
 * by `scripts/copy-vad-assets.mjs` — but nothing in `src/` ever consumed them, so the
 * copy script's comment about `voiceService.ts` loading them is stale. This is the
 * consumer.
 *
 * This module is the POLICY only, deliberately separated from the ONNX plumbing:
 * hysteresis, warm-up, health tracking and the fallback arbitration are where the
 * behavioural bugs live, and they are testable as pure functions. The worker that runs
 * inference is not.
 */

/** Which detector produced the current verdict. Reported so a session can be explained. */
export type VadSource = "silero" | "energy";

export type VadHealth = "starting" | "healthy" | "degraded" | "unavailable";

export interface VadFrameInput {
  /** Silero's speech probability for this frame, or null if inference did not produce one. */
  probability: number | null;
  /** The worklet's energy verdict for the same audio — always available. */
  energyVoiced: boolean;
  /** Milliseconds of audio this frame represents. */
  frameMs: number;
  /** How far behind real time inference is running, in frames. */
  backlogFrames: number;
  /** Inference wall time for the most recent completed frame, in ms. */
  inferenceMs: number | null;
}

export interface VadVerdict {
  voiced: boolean;
  source: VadSource;
  health: VadHealth;
  /** True on the transition into speech, so the caller can flush preroll exactly once. */
  onset: boolean;
  /** True on the transition out of speech (after the hangover). */
  offset: boolean;
}

export interface VadThresholds {
  /** Probability at or above which a frame counts as speech. Silero's own default. */
  positive: number;
  /** Probability below which a frame counts as silence. The gap between the two is the
   * hysteresis band: a single value makes the verdict chatter on every frame whose
   * probability sits near it, and chatter at the onset boundary is a false barge-in. */
  negative: number;
  /** Sustained speech required before an onset is declared, when SILERO is deciding.
   * It is discriminative, so it can commit sooner. */
  minSpeechMs: number;
  /** The same, when the ENERGY fallback is deciding. Longer on purpose: energy cannot
   * tell speech from any other loud sound, so committing as fast as Silero does turns
   * every cough, chair creak and echo of the tutor's own voice into an interruption. */
  minSpeechEnergyMs: number;
  /** Silence tolerated inside speech before an offset. Matches the worklet's HANGOVER_MS
   * so the two detectors agree on turn shape and only disagree about what is speech. */
  hangoverMs: number;
  /** Inference lag beyond which Silero is treated as degraded and energy takes over. */
  maxBacklogFrames: number;
  /** Per-frame inference budget. Silero v5 on a 512-sample frame is ~1-3ms on a laptop;
   * an order of magnitude beyond that means the device cannot keep up. */
  maxInferenceMs: number;
  /** Frames processed before Silero's verdict is trusted. The model carries LSTM state
   * and its first outputs are produced from a zeroed one. */
  warmupFrames: number;
  /** Sustained energy-voiced audio that Silero calls silence before Silero is distrusted
   * outright. See the disagreement latch in `push`. */
  disagreementMs: number;
}

export const DEFAULT_THRESHOLDS: VadThresholds = {
  positive: 0.5,
  negative: 0.35,
  minSpeechMs: 160,
  // Matches mic-processor.js's own MIN_SPEECH_MS. That value was tuned against real
  // rooms on the energy detector and this path is the same detector, so running it at
  // Silero's 160ms made the fallback MORE trigger-happy than the code it replaced.
  minSpeechEnergyMs: 250,
  hangoverMs: 700,
  maxBacklogFrames: 8,
  maxInferenceMs: 40,
  warmupFrames: 4,
  disagreementMs: 600,
};

/**
 * Rolling speech decision.
 *
 * Deliberately clock-free, like the server's endpointer: every input carries its own
 * duration, so the policy is deterministically testable rather than dependent on how
 * fast the test ran.
 */
export class VadDecider {
  private readonly thresholds: VadThresholds;
  private voiced = false;
  private voicedMs = 0;
  private silenceMs = 0;
  private framesSeen = 0;
  private consecutiveDegraded = 0;
  private disagreementMs = 0;
  private energyOnlyLatched = false;

  constructor(thresholds: Partial<VadThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /** Force the energy path — used when the worker could not start at all. */
  markSileroUnavailable() {
    this.consecutiveDegraded = Number.MAX_SAFE_INTEGER;
  }

  reset() {
    this.voiced = false;
    this.voicedMs = 0;
    this.silenceMs = 0;
    this.framesSeen = 0;
    this.disagreementMs = 0;
    // energyOnlyLatched is deliberately NOT cleared: it is a verdict about the model, not
    // about this utterance, and re-trusting a detector that has already proven deaf would
    // just lose the next utterance too.
  }

  private health(input: VadFrameInput): VadHealth {
    if (this.consecutiveDegraded === Number.MAX_SAFE_INTEGER) return "unavailable";
    if (input.probability === null) {
      // A single missing probability is normal — inference is asynchronous and a frame
      // can arrive before the previous result. Sustained absence is not.
      this.consecutiveDegraded++;
    } else if (
      input.backlogFrames > this.thresholds.maxBacklogFrames ||
      (input.inferenceMs !== null && input.inferenceMs > this.thresholds.maxInferenceMs)
    ) {
      this.consecutiveDegraded++;
    } else {
      this.consecutiveDegraded = 0;
    }

    if (this.consecutiveDegraded > this.thresholds.maxBacklogFrames) return "degraded";
    // Warm-up depends only on how many frames have been seen. An earlier version also
    // required "Silero has never worked", which defeated the gate entirely: the very
    // first healthy frame satisfied that condition and the model was trusted before its
    // LSTM state had been built up at all.
    if (this.framesSeen <= this.thresholds.warmupFrames) return "starting";
    return "healthy";
  }

  /**
   * One frame in, one verdict out.
   *
   * The fallback is per-frame rather than a one-way switch: a device that stutters for a
   * second under GC pressure should hand the decision to energy for that second and take
   * it back, not spend the rest of the lesson on the weaker detector.
   */
  push(input: VadFrameInput): VadVerdict {
    this.framesSeen++;
    const health = this.health(input);

    // Energy is the fallback and it is genuinely load-bearing: while Silero is starting,
    // degraded or unavailable, this is the only thing keeping the microphone working.
    // A model that is HEALTHY but WRONG was the gap here, and it is the worst possible
    // failure for this component: energy was only ever consulted when Silero was
    // unhealthy, so a Silero returning confident low probabilities for real speech made
    // the microphone silently, permanently deaf -- and the detector that used to work was
    // never asked. Live, 3 Sep 2026 (session d4986d19): the tutor delivered its opening
    // turn, the child spoke, not one speech_start reached the server, and the session was
    // closed 120s later by the silence budget with nothing in the logs but quiet.
    //
    // Energy cannot arbitrate for Silero in noise -- that is the whole reason Silero is
    // primary. But sustained loud audio that Silero insists is silence is not a close
    // call, it is evidence the model is not working, and it is the one disagreement worth
    // acting on.
    if (!this.energyOnlyLatched && input.energyVoiced && input.probability !== null) {
      const sileroSaysSilence = input.probability < this.thresholds.negative;
      this.disagreementMs = sileroSaysSilence ? this.disagreementMs + input.frameMs : 0;
      if (this.disagreementMs >= this.thresholds.disagreementMs) {
        // Latched rather than re-evaluated per frame: a model this wrong will not become
        // right mid-session, and flapping between detectors mid-utterance would split it.
        this.energyOnlyLatched = true;
        console.warn(
          "[VadDecider] Silero called",
          this.disagreementMs,
          "ms of energy-voiced audio silence -- distrusting it and using the energy detector",
        );
      }
    }

    const useSilero =
      !this.energyOnlyLatched &&
      health === "healthy" &&
      input.probability !== null &&
      this.framesSeen > this.thresholds.warmupFrames;
    const source: VadSource = useSilero ? "silero" : "energy";

    let frameVoiced: boolean;
    if (useSilero) {
      const probability = input.probability as number;
      // Hysteresis: the bar to START speaking is higher than the bar to KEEP speaking, so
      // a probability hovering near the threshold cannot toggle the verdict every frame.
      frameVoiced = this.voiced ? probability >= this.thresholds.negative : probability >= this.thresholds.positive;
    } else {
      frameVoiced = input.energyVoiced;
    }

    if (frameVoiced) {
      this.voicedMs += input.frameMs;
      this.silenceMs = 0;
    } else {
      this.silenceMs += input.frameMs;
      this.voicedMs = 0;
    }

    const onsetThreshold = useSilero
      ? this.thresholds.minSpeechMs
      : this.thresholds.minSpeechEnergyMs;

    let onset = false;
    let offset = false;
    if (!this.voiced && this.voicedMs >= onsetThreshold) {
      this.voiced = true;
      onset = true;
    } else if (this.voiced && this.silenceMs >= this.thresholds.hangoverMs) {
      this.voiced = false;
      offset = true;
    }

    return { voiced: this.voiced, source, health, onset, offset };
  }
}

/**
 * What this browser can actually do. Checked before anything is loaded, because every
 * one of these is absent somewhere real: AudioWorklet in older Safari, WebAssembly under
 * some locked-down enterprise policies, and Worker in a few embedded webviews.
 */
export interface VadCapabilities {
  audioWorklet: boolean;
  webAssembly: boolean;
  worker: boolean;
  /** True only if EVERY prerequisite for Silero is present. */
  silero: boolean;
}

export function detectCapabilities(scope: {
  AudioWorkletNode?: unknown;
  WebAssembly?: unknown;
  Worker?: unknown;
}): VadCapabilities {
  const audioWorklet = typeof scope.AudioWorkletNode !== "undefined";
  const webAssembly = typeof scope.WebAssembly !== "undefined";
  const worker = typeof scope.Worker !== "undefined";
  return {
    audioWorklet,
    webAssembly,
    worker,
    // AudioWorklet is required for capture at all, so its absence is fatal to the whole
    // pipeline rather than only to Silero — it is included here so a caller checking one
    // flag cannot conclude "Silero is fine" on a browser that cannot capture audio.
    silero: audioWorklet && webAssembly && worker,
  };
}
