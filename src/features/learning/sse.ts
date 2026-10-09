/**
 * Server-sent events read off a fetch `Response` body. The teacher-turn stream
 * rides on a POST, so `EventSource` can't be used. Frames are separated by a
 * blank line; a sequenced one carries `id: <turn_id>:<seq>`, a keepalive has no
 * `id` (backend `turns/transport_frame.py`).
 */
export interface SseFrame {
  id: string | null;
  event: string | null;
  data: string;
}

function parseFrame(block: string): SseFrame | null {
  let id: string | null = null;
  let event: string | null = null;
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "id") id = value;
    else if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  return data.length ? { id, event, data: data.join("\n") } : null;
}

/**
 * Yields each complete frame; a partial frame at the end of a dropped stream is
 * discarded. `signal` cancels the read itself, so an abort ends the loop even
 * where the fetch layer leaves a pending read hanging.
 */
export async function* readSseFrames(response: Response, signal?: AbortSignal): AsyncGenerator<SseFrame> {
  if (!response.body || signal?.aborted) return;
  const reader = response.body.getReader();
  const cancel = () => void reader.cancel().catch(() => undefined);
  signal?.addEventListener("abort", cancel, { once: true });
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = parseFrame(buffer.slice(0, boundary.index));
        buffer = buffer.slice(boundary.index + boundary[0].length);
        if (frame) yield frame;
      }
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}
