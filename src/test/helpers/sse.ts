/**
 * Build a streaming `Response` that emits SSE `data: <json>\n\n` frames, the exact
 * wire format `useStudentStore.sendMessage` parses. Used by MSW handlers (and direct
 * service mocks) to drive the chat reader loop without a real backend.
 */
export function makeSseResponse(frames: string[], init?: ResponseInit): Response {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      for (const frame of frames) {
        controller.enqueue(encoder.encode(`data: ${frame}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream" },
    ...init,
  });
}
