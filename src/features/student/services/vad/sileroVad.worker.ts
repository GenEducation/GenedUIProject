/// <reference lib="webworker" />
/**
 * Silero VAD inference, off both the audio render thread and the UI thread.
 *
 * Three threads, and each is a deliberate choice rather than an accident of the APIs:
 *
 *  - The **AudioWorklet** (`mic-processor.js`) captures and resamples. ONNX cannot run
 *    there at all — the worklet global scope has no WebAssembly instantiation path and
 *    blocking the render thread would drop audio outright.
 *  - The **main thread** only routes frames. Running inference there is what the
 *    requirement to move computationally sensitive work off the UI thread rules out:
 *    every inference would compete with React rendering, and a slow frame becomes a
 *    dropped one.
 *  - **This worker** does the inference and nothing else.
 *
 * The cost is two postMessage hops per frame. At 512 samples (32ms) that is ~31 messages
 * a second carrying 2KB each, which is negligible next to the inference itself, and the
 * buffers are transferred rather than copied.
 *
 * NOT VERIFIED IN A BROWSER. The ONNX I/O contract below is taken from the vendored
 * `@ricky0123/vad-web` v5 wrapper (`dist/models/v5.js`) rather than guessed, and the
 * policy that consumes the output is unit-tested — but the model has not been loaded and
 * run in a real browser as part of this change. The controller treats a worker that fails
 * to start, or one that never returns a probability, as "Silero unavailable" and runs the
 * energy detector, so a mistake here degrades the pipeline to its previous behaviour
 * rather than breaking capture.
 */

import * as ort from "onnxruntime-web/wasm";

/** Silero v5's frame size at 16kHz. Fixed by the model, not a tuning knob. */
const FRAME_SAMPLES = 512;
const MODEL_URL = "/silero_vad_v5.onnx";

type InboundMessage =
  | { type: "init"; wasmBasePath?: string }
  | { type: "frame"; seq: number; pcm: ArrayBuffer }
  | { type: "reset" };

let session: ort.InferenceSession | null = null;
let state: ort.Tensor | null = null;
let sampleRate: ort.Tensor | null = null;
let queued = 0;

function freshState(): ort.Tensor {
  return new ort.Tensor("float32", new Float32Array(2 * 128), [2, 1, 128]);
}

async function init(wasmBasePath: string) {
  ort.env.wasm.wasmPaths = wasmBasePath;
  // Single-threaded on purpose: cross-origin isolation (COOP/COEP) is required for
  // threaded WASM and is not something a voice feature should silently demand of the
  // whole site. One thread is comfortably fast enough for a 512-sample frame.
  ort.env.wasm.numThreads = 1;
  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`model fetch failed: ${response.status}`);
  const bytes = await response.arrayBuffer();
  session = await ort.InferenceSession.create(bytes);
  state = freshState();
  // int64, because that is how the model declares sr. Written with the BigInt()
  // constructor rather than a 16000n literal: this project targets below ES2020, where
  // the literal form is a compile error but the constructor is fine.
  sampleRate = new ort.Tensor("int64", BigInt64Array.from([BigInt(16000)]));
}

async function processFrame(seq: number, pcm: ArrayBuffer) {
  if (!session || !state || !sampleRate) return;
  const samples = new Float32Array(pcm);
  if (samples.length !== FRAME_SAMPLES) return;

  const startedAt = performance.now();
  const outputs = await session.run({
    input: new ort.Tensor("float32", samples, [1, samples.length]),
    state,
    sr: sampleRate,
  });
  // The LSTM state is carried forward; losing it resets the model's context and makes
  // every frame look like the start of an utterance.
  state = outputs.stateN as ort.Tensor;
  const probability = (outputs.output as ort.Tensor).data[0] as number;

  queued = Math.max(0, queued - 1);
  self.postMessage({
    type: "probability",
    seq,
    probability,
    inferenceMs: performance.now() - startedAt,
    backlogFrames: queued,
  });
}

self.onmessage = async (event: MessageEvent<InboundMessage>) => {
  const message = event.data;
  try {
    if (message.type === "init") {
      await init(message.wasmBasePath ?? "/");
      self.postMessage({ type: "ready" });
      return;
    }
    if (message.type === "reset") {
      state = freshState();
      queued = 0;
      return;
    }
    if (message.type === "frame") {
      queued++;
      await processFrame(message.seq, message.pcm);
    }
  } catch (error) {
    // Reported rather than thrown: an unhandled rejection in a worker is invisible to
    // the page, and the controller needs to know to fall back to energy.
    queued = Math.max(0, queued - 1);
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export {};
