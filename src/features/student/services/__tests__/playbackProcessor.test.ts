/**
 * Tests for public/worklets/playback-processor.js -- the bounded jitter buffer.
 *
 * The worklet runs on the audio render thread against globals that do not exist in a
 * test environment (AudioWorkletProcessor, registerProcessor, sampleRate), so the module
 * is evaluated here with those stubbed. That is deliberate rather than a workaround: the
 * queue-bounding logic is the part worth testing and it is plain arithmetic, while the
 * parts that genuinely need an audio thread (actual playback) are not.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const SAMPLE_RATE = 24000;

interface PositionMessage {
  type: string;
  utteranceId?: number | null;
  playedUntilMs?: number;
  bufferedMs?: number;
  wantMore?: boolean;
  saturated?: boolean;
  droppedChunks?: number;
}

/** The internals these tests deliberately reach into. The worklet is evaluated from
 * source with stubbed globals, so there is no exported type to import. */
interface PlaybackNode {
  port: {
    onmessage: (event: { data: Record<string, unknown> }) => void;
    postMessage: { mock: { calls: [PositionMessage][] } };
  };
  process(inputs: unknown[], outputs: Float32Array[][]): boolean;
  _bufferedMs(): number;
  _started: boolean;
  _paused: boolean;
  _playedByUtterance: Map<number | null, number>;
}

function loadProcessor(): new () => PlaybackNode {
  const source = readFileSync(
    join(process.cwd(), "public/worklets/playback-processor.js"),
    "utf8",
  );
  let captured: (new () => PlaybackNode) | null = null;
  const scope = {
    AudioWorkletProcessor: class {
      port = { onmessage: undefined, postMessage: vi.fn() };
    },
    registerProcessor: (_name: string, cls: new () => PlaybackNode) => {
      captured = cls;
    },
    sampleRate: 48000,
  };
  new Function(
    "AudioWorkletProcessor",
    "registerProcessor",
    "sampleRate",
    source,
  )(scope.AudioWorkletProcessor, scope.registerProcessor, scope.sampleRate);
  if (!captured) throw new Error("worklet did not register a processor");
  return captured;
}

/** `ms` of 24kHz mono PCM16, as the ArrayBuffer an enqueue message carries. */
function pcmOf(ms: number): ArrayBuffer {
  return new Int16Array(Math.round((SAMPLE_RATE * ms) / 1000)).buffer;
}

function render(node: PlaybackNode, quanta = 1) {
  const output = [new Float32Array(128)];
  for (let i = 0; i < quanta; i++) node.process([], [output]);
}

describe("playback-processor bounded queue", () => {
  let Processor: new () => PlaybackNode;

  beforeEach(() => {
    Processor = loadProcessor();
  });

  it("waits for the jitter buffer before starting playback", () => {
    const node = new Processor();

    node.port.onmessage({ data: { type: "enqueue", pcm: pcmOf(50) } });
    expect(node._started).toBe(false);

    node.port.onmessage({ data: { type: "enqueue", pcm: pcmOf(100) } });
    expect(node._started).toBe(true);
  });

  it("refuses audio past the hard ceiling instead of growing without bound", () => {
    /* The queue used to be a plain array that grew with whatever arrived. The server
     * synthesizes several segments concurrently and sends each the moment it exists, at
     * well above realtime, so on a slow client or a hidden tab it simply kept growing. */
    const node = new Processor();

    for (let i = 0; i < 60; i++) {
      node.port.onmessage({ data: { type: "enqueue", pcm: pcmOf(1000) } });
    }

    expect(node._bufferedMs()).toBeLessThanOrEqual(31000);
  });

  it("reports an overflow rather than dropping audio silently", () => {
    /* A hole in the middle of an utterance is indistinguishable to the child from the
     * tutor simply being wrong -- the same class of failure as a dropped TTS segment. */
    const node = new Processor();
    for (let i = 0; i < 60; i++) {
      node.port.onmessage({ data: { type: "enqueue", pcm: pcmOf(1000) } });
    }

    const overflows = node.port.postMessage.mock.calls
      .map(([msg]) => msg)
      .filter((msg) => msg.type === "overflow");

    expect(overflows.length).toBeGreaterThan(0);
    expect(overflows[0].droppedChunks).toBeGreaterThan(0);
  });

  it("reports buffer depth and saturation so the server can stop running ahead", () => {
    const node = new Processor();
    node.port.onmessage({ data: { type: "enqueue", pcm: pcmOf(7000) } });

    render(node, 100);

    const positions = node.port.postMessage.mock.calls
      .map(([msg]) => msg)
      .filter((msg) => msg.type === "position");
    expect(positions.length).toBeGreaterThan(0);
    const last = positions[positions.length - 1];
    expect(last.bufferedMs).toBeGreaterThan(5000);
    expect(last.saturated).toBe(true);
    expect(last.wantMore).toBe(false);
  });

  it("asks for more once playback has drained the buffer below the target lead", () => {
    const node = new Processor();
    node.port.onmessage({ data: { type: "enqueue", pcm: pcmOf(200) } });

    render(node, 50);

    const positions = node.port.postMessage.mock.calls
      .map(([msg]) => msg)
      .filter((msg) => msg.type === "position");
    expect(positions[positions.length - 1].wantMore).toBe(true);
  });

  it("pause keeps the queue intact -- a false barge-in must be recoverable", () => {
    /* This used to be a "clear", and since the server streams faster than realtime the
     * buffer routinely holds seconds of speech, so one false positive destroyed a large
     * chunk of the reply. That is what "it only ever speaks part of the response" was. */
    const node = new Processor();
    node.port.onmessage({ data: { type: "enqueue", pcm: pcmOf(2000) } });
    const before = node._bufferedMs();

    node.port.onmessage({ data: { type: "pause" } });

    expect(node._paused).toBe(true);
    expect(node._bufferedMs()).toBe(before);
  });

  it("clear empties the queue and resets the depth accounting", () => {
    const node = new Processor();
    node.port.onmessage({ data: { type: "enqueue", pcm: pcmOf(2000) } });

    node.port.onmessage({ data: { type: "clear" } });

    expect(node._bufferedMs()).toBe(0);
    expect(node._started).toBe(false);
  });
});

describe("per-utterance playback attribution", () => {
  let Processor: new () => PlaybackNode;

  beforeEach(() => {
    Processor = loadProcessor();
  });

  function enqueue(node: PlaybackNode, ms: number, utteranceId: number) {
    node.port.onmessage({ data: { type: "enqueue", pcm: pcmOf(ms), utteranceId } });
  }

  it("counts played samples against the utterance the audio belongs to", () => {
    /* A single session-cumulative counter -- what this used to be -- is wrong for both
     * consumers: barge_in reports played_until_ms as "how far into THIS utterance the
     * child got", and the server's heard-text ledger measures segment offsets within one
     * utterance. Cumulatively, every utterance after the first reported a position far
     * beyond its own length, so truncation looked complete and every segment looked
     * fully heard. */
    const node = new Processor();
    enqueue(node, 200, 1);
    render(node, 400); // drain utterance 1

    const afterFirst = node.port.postMessage.mock.calls
      .map(([m]) => m)
      .filter((m) => m.type === "position")
      .pop();
    expect(afterFirst.utteranceId).toBe(1);

    enqueue(node, 200, 2);
    render(node, 400);

    const afterSecond = node.port.postMessage.mock.calls
      .map(([m]) => m)
      .filter((m) => m.type === "position")
      .pop();
    expect(afterSecond.utteranceId).toBe(2);
    // Restarts from zero for the new utterance rather than continuing to climb.
    expect(afterSecond.playedUntilMs).toBeLessThanOrEqual(afterFirst.playedUntilMs + 50);
  });

  it("keeps played counters after a cancel", () => {
    /* How much of the cancelled utterance the child actually heard is exactly what the
     * server reconciles against; clearing it would report a truncated utterance as never
     * having played at all. */
    const node = new Processor();
    enqueue(node, 500, 7);
    render(node, 200);
    const played = node._playedByUtterance.get(7);

    node.port.onmessage({ data: { type: "clear" } });

    expect(node._playedByUtterance.get(7)).toBe(played);
  });

  it("bounds the per-utterance counters over a long lesson", () => {
    /* An unbounded Map on the audio thread is a slow leak in the one place where
     * allocation pressure is least acceptable. */
    const node = new Processor();
    for (let i = 0; i < 50; i++) {
      enqueue(node, 20, i);
      render(node, 20);
    }

    expect(node._playedByUtterance.size).toBeLessThanOrEqual(4);
  });
});
