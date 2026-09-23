import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSSEStream } from "../sseParser";

const FIXTURES_DIR = join(__dirname, "../../__tests__/fixtures");

function streamFromString(text: string, chunkSize = 17): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      const end = Math.min(offset + chunkSize, bytes.length);
      controller.enqueue(bytes.slice(offset, end));
      offset = end;
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>) {
  const frames = [];
  for await (const frame of parseSSEStream(stream)) frames.push(frame);
  return frames;
}

describe("parseSSEStream against the backend's golden teacher-turn streams", () => {
  it("parses completed_turn.sse into 5 identified frames in order", async () => {
    const text = readFileSync(join(FIXTURES_DIR, "completed_turn.sse"), "utf-8");
    const frames = await collect(streamFromString(text));

    expect(frames).toHaveLength(5);
    expect(frames[0]).toMatchObject({ id: "00000000-0000-0000-0000-0000000000a1:1", event: "turn_started" });
    expect(frames[4]).toMatchObject({ id: "00000000-0000-0000-0000-0000000000a1:5", event: "turn_completed" });

    const parsed = JSON.parse(frames[2].data);
    expect(parsed).toMatchObject({ type: "text_delta", seq: 3, text: "Yes, one half. " });
  });

  it("parses a keepalive frame with no id, distinct from sequenced frames", async () => {
    const text = readFileSync(join(FIXTURES_DIR, "keepalive_then_failure.sse"), "utf-8");
    const frames = await collect(streamFromString(text));

    expect(frames).toHaveLength(3);
    expect(frames[1].id).toBeUndefined();
    expect(frames[1].event).toBe("keepalive");
    expect(JSON.parse(frames[1].data)).toMatchObject({ type: "keepalive", committed_through_seq: 1 });
  });

  it("reassembles frames split across arbitrary chunk boundaries", async () => {
    const text = readFileSync(join(FIXTURES_DIR, "learner_stop.sse"), "utf-8");
    for (const chunkSize of [1, 3, 40, 4096]) {
      const frames = await collect(streamFromString(text, chunkSize));
      expect(frames).toHaveLength(4);
      expect(frames[3].event).toBe("turn_interrupted");
      expect(JSON.parse(frames[3].data)).toMatchObject({ cause: "learner_stop", transcript_through_seq: 2 });
    }
  });

  it("preserves a null, suppressed text_delta exactly (learner_stop_replay)", async () => {
    const text = readFileSync(join(FIXTURES_DIR, "learner_stop_replay.sse"), "utf-8");
    const frames = await collect(streamFromString(text));
    const suppressed = JSON.parse(frames[2].data);
    expect(suppressed).toMatchObject({ type: "text_delta", text: null, suppressed: true, seq: 3 });
  });
});
