/**
 * A minimal SSE line parser for `teacher_turn_stream_v2`
 * (docs/specs/TEXT_STREAMING_TRANSPORT_v1.md §4 in the backend repo).
 *
 * `fetchEventSource` isn't used for the turn stream itself: it retries a
 * failed connection by re-issuing the exact same request, which for a POST
 * would re-admit the turn. This transport's own resume path is a GET with
 * `Last-Event-ID` (§9's client rules), so the retry decision has to be made
 * by the caller, not a library default. `EventSource` can't be used either —
 * the gateway needs an `Authorization` header and the admitting request is a
 * POST with a body, neither of which `EventSource` can send.
 *
 * One frame is: zero or more of `id:`, `event:`, `data:`, `retry:` lines,
 * ended by a blank line. A frame is at most 16 KiB and carries exactly one
 * `data:` line of compact JSON, so no multi-line `data:` accumulation is
 * needed here (unlike the general SSE spec).
 */

export interface RawSSEFrame {
  id?: string;
  event?: string;
  data: string;
}

export async function* parseSSEStream(body: ReadableStream<Uint8Array>): AsyncGenerator<RawSSEFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      // Frames are separated by a blank line; accumulate whole lines first,
      // then split the buffer into frames on "\n\n".
      while ((newlineIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawFrame = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 2);
        const frame = parseFrame(rawFrame);
        if (frame) yield frame;
      }
    }
    // A stray trailing frame with no final blank line still counts (the
    // server always ends the body after the terminal event's blank line,
    // but a lost connection can cut a partial one short).
    const trailing = buffer.trim();
    if (trailing) {
      const frame = parseFrame(trailing);
      if (frame) yield frame;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(raw: string): RawSSEFrame | null {
  let id: string | undefined;
  let event: string | undefined;
  let data: string | undefined;

  for (const line of raw.split("\n")) {
    if (line.startsWith("id:")) {
      id = line.slice(3).trim();
    } else if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data = line.slice(5).trim();
    }
    // "retry:" (the first line of every response) carries no frame data.
  }

  if (data === undefined) return null;
  return { id, event, data };
}
