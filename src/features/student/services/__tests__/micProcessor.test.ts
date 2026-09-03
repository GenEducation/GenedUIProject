/**
 * Tests for public/worklets/mic-processor.js -- specifically the preroll ring buffer.
 *
 * Evaluated from source with stubbed worklet globals, the same way the playback worklet
 * is tested: the ring-buffer bookkeeping is plain arithmetic, and it is the part that
 * silently destroyed the start of every utterance.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

interface PostedMessage {
  type: string;
  pcm?: ArrayBuffer;
  floats?: ArrayBuffer;
  preroll?: ArrayBuffer;
  energyVoiced?: boolean;
}

interface MicNode {
  port: {
    onmessage: (event: { data: Record<string, unknown> }) => void;
    postMessage: (msg: PostedMessage, transfer?: Transferable[]) => void;
  };
  process(inputs: Float32Array[][], outputs: unknown[]): boolean;
  _prerollFrames: Int16Array[];
  _mode: string;
}

const SAMPLE_RATE = 48000;

function loadProcessor(posted: PostedMessage[]): MicNode {
  const source = readFileSync(join(process.cwd(), "public/worklets/mic-processor.js"), "utf8");
  let captured: (new () => MicNode) | null = null;

  class FakeProcessor {
    port = {
      onmessage: undefined as unknown,
      postMessage: (msg: PostedMessage, transfer?: Transferable[]) => {
        // Snapshot the payload BEFORE transferring. A real receiver gets the buffer
        // intact; here the same object is both the record and the thing being detached,
        // so without the copy the assertions would read a detached buffer and the test
        // would fail for a reason that has nothing to do with the worklet.
        posted.push({
          ...msg,
          ...(msg.pcm ? { pcm: msg.pcm.slice(0) } : {}),
          ...(msg.floats ? { floats: msg.floats.slice(0) } : {}),
          ...(msg.preroll ? { preroll: msg.preroll.slice(0) } : {}),
        });
        // Faithfully models a real postMessage: it TRANSFERS, which detaches the buffers
        // listed. Without that the test cannot see the bug at all -- a fake that merely
        // records the message leaves the sender's view of the buffer intact.
        for (const buffer of transfer ?? []) {
          structuredClone({ b: buffer }, { transfer: [buffer] });
        }
      },
    };
  }

  new Function(
    "AudioWorkletProcessor",
    "registerProcessor",
    "sampleRate",
    source,
  )(FakeProcessor, (_n: string, cls: new () => MicNode) => (captured = cls), SAMPLE_RATE);

  if (!captured) throw new Error("worklet did not register a processor");
  return new (captured as unknown as new () => MicNode)();
}

/** Feed `blocks` render quanta of audible tone at the native rate. */
function feed(node: MicNode, blocks: number, amplitude = 0.3) {
  const quantum = new Float32Array(128);
  for (let i = 0; i < quantum.length; i++) quantum[i] = amplitude * Math.sin(i / 4);
  for (let i = 0; i < blocks; i++) node.process([[quantum]], []);
}

describe("mic-processor preroll ring", () => {
  let posted: PostedMessage[];
  let node: MicNode;

  beforeEach(() => {
    posted = [];
    node = loadProcessor(posted);
    node.port.onmessage({ data: { type: "set_mode", mode: "external" } });
  });

  it("keeps real audio in the preroll ring even though frames are transferred away", () => {
    /* The regression. The ring used to hold the very Int16Arrays whose buffers were then
     * transferred to the main thread, and a transfer DETACHES: every retained frame
     * became zero-length, so the preroll flushed on the next onset was empty. That
     * silently removed the ~500ms before the onset -- the whole reason the ring exists.
     *
     * Live, 3 Sep 2026: "Let's start fresh" -> "Start fresh", "I want to study ML Aggarwal
     * test only" -> "to study ML Aggarwal test only", "So how will it grow?" -> "How will
     * it grow", "four hundred" -> "hundred". One or two leading words gone every time. */
    feed(node, 200);

    expect(node._prerollFrames.length).toBeGreaterThan(0);
    const retained = node._prerollFrames.reduce((n, f) => n + f.length, 0);
    expect(retained).toBeGreaterThan(0);
    expect(node._prerollFrames.every((f) => f.length > 0)).toBe(true);
  });

  it("flushes a preroll containing actual samples", () => {
    feed(node, 200);
    posted.length = 0;

    node.port.onmessage({ data: { type: "flush_preroll" } });

    const flush = posted.find((m) => m.type === "preroll");
    expect(flush).toBeDefined();
    const samples = new Int16Array(flush!.preroll!);
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.some((s) => s !== 0)).toBe(true);
  });

  it("bounds the ring to the configured preroll window", () => {
    feed(node, 2000); // far more than 500ms

    // 500ms of 20ms frames.
    expect(node._prerollFrames.length).toBeLessThanOrEqual(25);
  });

  it("streams analysis frames with an energy verdict in external mode", () => {
    feed(node, 100);

    const frames = posted.filter((m) => m.type === "analysis_frame");
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]).toHaveProperty("floats");
    expect(typeof frames[0].energyVoiced).toBe("boolean");
  });

  it("makes no onset decision of its own in external mode", () => {
    /* The main thread arbitrates between Silero and energy; a worklet-side speech_start
     * would open a turn behind its back. */
    feed(node, 300);

    expect(posted.some((m) => m.type === "speech_start")).toBe(false);
  });
});
