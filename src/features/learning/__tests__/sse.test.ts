import { describe, it, expect } from "vitest";
import { readSseFrames } from "../sse";

/** A Response whose body arrives in the given chunks, as a network would split it. */
const chunked = (...chunks: string[]) =>
  new Response(new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }));

async function collect(response: Response) {
  const frames = [];
  for await (const frame of readSseFrames(response)) frames.push(frame);
  return frames;
}

describe("readSseFrames", () => {
  it("reads id/event/data frames, even when a frame is split across chunks", async () => {
    const frames = await collect(chunked('id: t:1\nevent: text_delta\nda', 'ta: {"a":1}\n\nid: t:2\nevent: turn_completed\ndata: {"b":2}\n\n'));
    expect(frames).toEqual([
      { id: "t:1", event: "text_delta", data: '{"a":1}' },
      { id: "t:2", event: "turn_completed", data: '{"b":2}' },
    ]);
  });

  it("reads a keepalive with no id, skips comments, and drops a partial frame at a drop", async () => {
    const frames = await collect(chunked(': ping\n\nevent: keepalive\ndata: {}\n\nid: t:3\ndata: {"cut'));
    expect(frames).toEqual([{ id: null, event: "keepalive", data: "{}" }]);
  });

  it("accepts CRLF line endings", async () => {
    expect(await collect(chunked("id: t:1\r\ndata: x\r\n\r\n"))).toEqual([{ id: "t:1", event: null, data: "x" }]);
  });
});
