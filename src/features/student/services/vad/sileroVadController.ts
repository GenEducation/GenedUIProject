/**
 * Owns the Silero worker's lifetime and arbitrates it against the energy detector.
 *
 * The controller never decides whether audio is speech — `VadDecider` does, and it is a
 * pure function of the inputs so the policy stays testable. What lives here is
 * everything that cannot be: capability detection, worker startup and teardown, frame
 * accumulation to the model's fixed 512-sample window, and turning a worker that fails
 * or falls behind into "use energy for now".
 *
 * The fallback is the load-bearing part. Every path that can go wrong — no Worker, no
 * WebAssembly, a model that 404s, an inference that throws, a device that cannot keep up
 * — lands on the energy detector the cascade already shipped with, rather than on a
 * microphone that has stopped working. A child whose browser cannot run ONNX gets the
 * previous behaviour, not silence.
 */

import {
  DEFAULT_THRESHOLDS,
  detectCapabilities,
  VadDecider,
  type VadCapabilities,
  type VadThresholds,
  type VadVerdict,
} from "@/features/student/services/vad/vadDecision";

/** Silero v5's window. Fixed by the model. */
export const FRAME_SAMPLES = 512;
const FRAME_MS = (FRAME_SAMPLES / 16000) * 1000;

export interface VadControllerOptions {
  thresholds?: Partial<VadThresholds>;
  onVerdict: (verdict: VadVerdict) => void;
  /** Injected in tests; defaults to constructing the real module worker. */
  createWorker?: () => Worker;
  scope?: { AudioWorkletNode?: unknown; WebAssembly?: unknown; Worker?: unknown };
}

export class SileroVadController {
  private readonly decider: VadDecider;
  private readonly options: VadControllerOptions;
  private worker: Worker | null = null;
  private pending = new Float32Array(0);
  private seq = 0;
  private lastProbability: number | null = null;
  private lastInferenceMs: number | null = null;
  private backlog = 0;
  readonly capabilities: VadCapabilities;

  constructor(options: VadControllerOptions) {
    this.options = options;
    this.decider = new VadDecider(options.thresholds ?? {});
    this.capabilities = detectCapabilities(
      options.scope ?? (typeof globalThis !== "undefined" ? (globalThis as never) : {}),
    );
  }

  /**
   * Try to bring Silero up. Never throws and never rejects: a failure here is a
   * degradation, not an error the caller has to handle, and making it throw would put a
   * try/catch around microphone startup for a detector that is optional by design.
   */
  async start(): Promise<boolean> {
    if (!this.capabilities.silero) {
      this.decider.markSileroUnavailable();
      return false;
    }
    try {
      this.worker =
        this.options.createWorker?.() ??
        new Worker(new URL("./sileroVad.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (event) => this.onWorkerMessage(event.data);
      this.worker.onerror = () => this.degrade("worker error");
      this.worker.postMessage({ type: "init", wasmBasePath: "/" });
      return true;
    } catch {
      this.degrade("worker could not be created");
      return false;
    }
  }

  stop() {
    this.worker?.terminate();
    this.worker = null;
    this.pending = new Float32Array(0);
  }

  reset() {
    this.decider.reset();
    this.worker?.postMessage({ type: "reset" });
    this.pending = new Float32Array(0);
  }

  private degrade(reason: string) {
    console.warn("[SileroVadController] falling back to the energy detector:", reason);
    this.decider.markSileroUnavailable();
    this.worker?.terminate();
    this.worker = null;
  }

  private onWorkerMessage(message: {
    type: string;
    probability?: number;
    inferenceMs?: number;
    backlogFrames?: number;
    message?: string;
  }) {
    if (message.type === "probability") {
      this.lastProbability = message.probability ?? null;
      this.lastInferenceMs = message.inferenceMs ?? null;
      this.backlog = message.backlogFrames ?? 0;
      return;
    }
    if (message.type === "error") {
      this.degrade(message.message ?? "unknown worker error");
    }
  }

  /**
   * Feed one 20ms capture frame and get the current verdict.
   *
   * The worklet's frames (20ms / 320 samples at 16kHz) do not divide evenly into
   * Silero's 512-sample window, so they are accumulated here rather than resampled or
   * padded — padding a partial window with zeros would feed the model silence that was
   * never in the room and bias it toward "not speech" at exactly the onset it needs to
   * catch.
   *
   * The verdict returned is based on the most recent probability available, not on this
   * frame's own: inference is asynchronous, so the answer necessarily trails the audio
   * by up to one window. That lag is why preroll exists.
   */
  pushFrame(samples: Float32Array, energyVoiced: boolean): VadVerdict {
    if (this.worker) {
      const merged = new Float32Array(this.pending.length + samples.length);
      merged.set(this.pending, 0);
      merged.set(samples, this.pending.length);
      this.pending = merged;

      while (this.pending.length >= FRAME_SAMPLES) {
        const window = this.pending.slice(0, FRAME_SAMPLES);
        this.pending = this.pending.slice(FRAME_SAMPLES);
        this.worker.postMessage({ type: "frame", seq: this.seq++, pcm: window.buffer }, [
          window.buffer,
        ]);
      }
    }

    const verdict = this.decider.push({
      probability: this.lastProbability,
      energyVoiced,
      frameMs: (samples.length / 16000) * 1000,
      backlogFrames: this.backlog,
      inferenceMs: this.lastInferenceMs,
    });
    this.options.onVerdict(verdict);
    return verdict;
  }
}

export { DEFAULT_THRESHOLDS, FRAME_MS };
