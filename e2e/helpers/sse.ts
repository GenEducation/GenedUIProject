/**
 * Builds a static SSE body string from an array of JSON-serializable frames.
 * page.route().fulfill() sends the whole body at once (no real streaming), but
 * the app's ReadableStream reader loop parses whatever bytes it receives — it
 * doesn't care whether chunks arrive incrementally or all at once.
 */
export function joinSseFrames(frames: unknown[]): string {
  return frames.map((f) => `data: ${JSON.stringify(f)}\n\n`).join("");
}
