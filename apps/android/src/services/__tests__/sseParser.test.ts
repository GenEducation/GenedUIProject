import { parseSSEEvents, type SSEEvent } from "../sseParser";

/**
 * Build a fake `Response` whose `body.getReader()` yields the given UTF-8
 * chunks, one per `read()` call. Passing `withBody: false` simulates a
 * platform without a streaming body (exercises the `response.text()` fallback).
 */
function fakeResponse(
  chunks: string[],
  opts: { withBody?: boolean } = {}
): Response {
  const { withBody = true } = opts;
  const encoder = new TextEncoder();

  if (!withBody) {
    return {
      body: null,
      text: async () => chunks.join(""),
    } as unknown as Response;
  }

  let i = 0;
  const reader = {
    read: async () => {
      if (i >= chunks.length) return { done: true, value: undefined };
      return { done: false, value: encoder.encode(chunks[i++]) };
    },
    releaseLock: () => {},
  };

  return {
    body: { getReader: () => reader },
  } as unknown as Response;
}

async function collect(res: Response, signal?: AbortSignal): Promise<SSEEvent[]> {
  const events: SSEEvent[] = [];
  await parseSSEEvents(res, (e) => events.push(e), signal);
  return events;
}

describe("parseSSEEvents", () => {
  it("parses complete data lines into typed events", async () => {
    const res = fakeResponse([
      'data: {"type":"chunk","text":"hello"}\n',
      'data: {"type":"done","status":"ok"}\n',
    ]);
    const events = await collect(res);
    expect(events).toEqual([
      { type: "chunk", text: "hello" },
      { type: "done", status: "ok" },
    ]);
  });

  it("buffers a JSON line split across two read() chunks", async () => {
    const res = fakeResponse([
      'data: {"type":"chunk","te',
      'xt":"split"}\n',
    ]);
    const events = await collect(res);
    expect(events).toEqual([{ type: "chunk", text: "split" }]);
  });

  it("flushes a trailing line with no final newline", async () => {
    const res = fakeResponse(['data: {"type":"done"}']);
    const events = await collect(res);
    expect(events).toEqual([{ type: "done" }]);
  });

  it("skips the [DONE] sentinel", async () => {
    const res = fakeResponse([
      'data: {"type":"chunk","text":"x"}\n',
      "data: [DONE]\n",
    ]);
    const events = await collect(res);
    expect(events).toEqual([{ type: "chunk", text: "x" }]);
  });

  it("skips malformed JSON without throwing", async () => {
    const res = fakeResponse([
      "data: {not valid json}\n",
      'data: {"type":"ok"}\n',
    ]);
    const events = await collect(res);
    expect(events).toEqual([{ type: "ok" }]);
  });

  it("ignores non-data lines (comments / blanks)", async () => {
    const res = fakeResponse([
      ": keep-alive comment\n",
      "\n",
      'event: message\ndata: {"type":"ok"}\n',
    ]);
    const events = await collect(res);
    expect(events).toEqual([{ type: "ok" }]);
  });

  it("falls back to response.text() when there is no streaming body", async () => {
    const res = fakeResponse(
      ['data: {"type":"a"}\ndata: {"type":"b"}\n'],
      { withBody: false }
    );
    const events = await collect(res);
    expect(events).toEqual([{ type: "a" }, { type: "b" }]);
  });

  it("stops early when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const res = fakeResponse(['data: {"type":"never"}\n']);
    const events = await collect(res, controller.signal);
    expect(events).toEqual([]);
  });
});
