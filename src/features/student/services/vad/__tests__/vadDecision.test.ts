import { describe, expect, it, vi } from "vitest";

import { SileroVadController } from "@/features/student/services/vad/sileroVadController";
import { detectCapabilities, VadDecider } from "@/features/student/services/vad/vadDecision";

const FRAME_MS = 32;

function feed(
  decider: VadDecider,
  frames: Array<{ probability?: number | null; energy?: boolean; backlog?: number }>,
) {
  let last;
  for (const frame of frames) {
    last = decider.push({
      probability: frame.probability === undefined ? 0.9 : frame.probability,
      energyVoiced: frame.energy ?? false,
      frameMs: FRAME_MS,
      backlogFrames: frame.backlog ?? 0,
      inferenceMs: 2,
    });
  }
  return last!;
}

const speech = (n: number, probability = 0.9) =>
  Array.from({ length: n }, () => ({ probability, energy: true }));
const silence = (n: number, probability = 0.05) =>
  Array.from({ length: n }, () => ({ probability, energy: false }));

describe("VadDecider", () => {
  it("declares an onset once speech is sustained, not on the first loud frame", () => {
    const decider = new VadDecider();
    const verdict = feed(decider, [...silence(6), ...speech(10)]);

    expect(verdict.voiced).toBe(true);
    expect(verdict.source).toBe("silero");
  });

  it("does not fire an onset on a single speech-like frame", () => {
    /* A cough, a chair creak, or one frame of playback echo. Under the energy detector
     * this class of blip is what cancelled the tutor mid-reply. */
    const decider = new VadDecider();

    expect(feed(decider, [...silence(6), ...speech(1), ...silence(3)]).voiced).toBe(false);
  });

  it("reports the onset transition exactly once", () => {
    /* The caller flushes preroll on it -- flushing twice duplicates audio in the uplink. */
    const decider = new VadDecider();
    const verdicts = [...silence(6), ...speech(20)].map((f) =>
      decider.push({
        probability: f.probability,
        energyVoiced: f.energy,
        frameMs: FRAME_MS,
        backlogFrames: 0,
        inferenceMs: 2,
      }),
    );

    expect(verdicts.filter((v) => v.onset)).toHaveLength(1);
  });

  it("uses hysteresis so a probability near the threshold cannot chatter", () => {
    /* One threshold makes the verdict toggle every frame for audio sitting on it, and
     * chatter at the onset boundary IS a false barge-in. */
    const decider = new VadDecider();
    feed(decider, [...silence(6), ...speech(10)]);

    expect(feed(decider, [{ probability: 0.4, energy: false }]).voiced).toBe(true);
    expect(feed(decider, silence(30)).voiced).toBe(false);
  });

  it("holds through a short gap and releases after the hangover", () => {
    const decider = new VadDecider();
    feed(decider, [...silence(6), ...speech(10)]);

    expect(feed(decider, silence(5)).voiced).toBe(true); // ~160ms

    // offset is a one-frame TRANSITION, so it is asserted across the batch rather than
    // on the last verdict -- which reports the steady state after it.
    const verdicts = silence(25).map((f) =>
      decider.push({
        probability: f.probability,
        energyVoiced: f.energy,
        frameMs: FRAME_MS,
        backlogFrames: 0,
        inferenceMs: 2,
      }),
    );
    expect(verdicts[verdicts.length - 1].voiced).toBe(false);
    expect(verdicts.filter((v) => v.offset)).toHaveLength(1);
  });

  it("uses the energy detector until Silero has warmed up", () => {
    /* The model carries LSTM state; its first outputs come from a zeroed one. */
    const decider = new VadDecider();
    const first = feed(decider, [{ probability: 0.99, energy: false }]);

    expect(first.source).toBe("energy");
    expect(first.health).toBe("starting");
  });

  it("falls back to energy when inference falls behind", () => {
    const decider = new VadDecider();
    feed(decider, speech(10));

    const degraded = feed(
      decider,
      Array.from({ length: 20 }, () => ({ probability: 0.9, energy: false, backlog: 50 })),
    );

    expect(degraded.health).toBe("degraded");
    expect(degraded.source).toBe("energy");
  });

  it("recovers to Silero once inference catches up", () => {
    /* Per-frame, not a one-way switch: a device that stutters for a second under GC
     * pressure should not spend the rest of the lesson on the weaker detector. */
    const decider = new VadDecider();
    feed(decider, speech(10));
    feed(decider, Array.from({ length: 20 }, () => ({ probability: 0.9, energy: false, backlog: 50 })));

    const recovered = feed(decider, speech(10));

    expect(recovered.health).toBe("healthy");
    expect(recovered.source).toBe("silero");
  });

  it("uses energy indefinitely once Silero is marked unavailable", () => {
    const decider = new VadDecider();
    decider.markSileroUnavailable();

    const verdict = feed(decider, speech(20));

    expect(verdict.health).toBe("unavailable");
    expect(verdict.source).toBe("energy");
    expect(verdict.voiced).toBe(true); // the microphone still works
  });

  it("treats a missing probability as a degradation, not as silence", () => {
    /* Reading "no answer yet" as "not speech" makes every dropped inference a missed
     * word. */
    const decider = new VadDecider();
    feed(decider, speech(10));

    const verdict = feed(
      decider,
      Array.from({ length: 20 }, () => ({ probability: null, energy: true })),
    );

    expect(verdict.source).toBe("energy");
    expect(verdict.voiced).toBe(true);
  });
});

describe("capability detection", () => {
  it("requires worker, wasm and audioWorklet together", () => {
    expect(detectCapabilities({ AudioWorkletNode: {}, WebAssembly: {}, Worker: {} }).silero).toBe(true);
    expect(detectCapabilities({ AudioWorkletNode: {}, WebAssembly: {} }).silero).toBe(false);
    expect(detectCapabilities({ WebAssembly: {}, Worker: {} }).silero).toBe(false);
    expect(detectCapabilities({ AudioWorkletNode: {}, Worker: {} }).silero).toBe(false);
  });
});

describe("SileroVadController", () => {
  interface PostedMessage {
    type: string;
    [key: string]: unknown;
  }

  /** The subset of Worker this controller touches, so the fake needs no casts. */
  type FakeWorker = Worker & { onmessage: ((e: { data: unknown }) => void) | null };

  function make(overrides: Record<string, unknown> = {}) {
    const posted: PostedMessage[] = [];
    const worker = {
      postMessage: (msg: PostedMessage) => posted.push(msg),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    } as unknown as FakeWorker;
    const ctrl = new SileroVadController({
      onVerdict: () => {},
      createWorker: () => worker,
      scope: { AudioWorkletNode: {}, WebAssembly: {}, Worker: {} },
      ...overrides,
    });
    return { ctrl, posted, worker };
  }

  it("does not start a worker on a browser that cannot run one", async () => {
    const { ctrl } = make({ scope: { AudioWorkletNode: {} } });

    expect(await ctrl.start()).toBe(false);
    expect(ctrl.pushFrame(new Float32Array(320), true).source).toBe("energy");
  });

  it("never throws when the worker cannot be created", async () => {
    /* A failure here is a degradation, not something microphone startup should wrap in a
     * try/catch for an optional detector. */
    const { ctrl } = make({
      createWorker: () => {
        throw new Error("blocked by policy");
      },
    });

    await expect(ctrl.start()).resolves.toBe(false);
  });

  it("accumulates 20ms capture frames into the model's 512-sample window", async () => {
    /* Padding a partial window with zeros feeds the model silence that was never in the
     * room, biasing it against exactly the onset it needs to catch. */
    const { ctrl, posted } = make();
    await ctrl.start();
    posted.length = 0;

    ctrl.pushFrame(new Float32Array(320), false);
    expect(posted.filter((m) => m.type === "frame")).toHaveLength(0);

    ctrl.pushFrame(new Float32Array(320), false); // 640 >= 512
    expect(posted.filter((m) => m.type === "frame")).toHaveLength(1);
  });

  it("falls back to energy when the worker reports an error", async () => {
    const { ctrl, worker } = make();
    await ctrl.start();

    worker.onmessage!({ data: { type: "error", message: "model 404" } });

    expect(ctrl.pushFrame(new Float32Array(320), true).health).toBe("unavailable");
  });

  it("keeps the microphone working when Silero dies mid-session", async () => {
    const { ctrl, worker } = make();
    await ctrl.start();
    worker.onmessage!({ data: { type: "error", message: "crashed" } });

    let verdict = ctrl.pushFrame(new Float32Array(320), true);
    for (let i = 0; i < 20; i++) verdict = ctrl.pushFrame(new Float32Array(320), true);

    expect(verdict.voiced).toBe(true);
  });
});
