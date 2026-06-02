/**
 * Event-aware SSE parser for React Native.
 *
 * Mirrors the web's stream reader loop (useStudentStore.ts lines 2348–2430).
 * Each `data:` line is parsed as JSON and dispatched as a typed SSEEvent.
 *
 * Usage:
 *   const response = await studentService.sendChatMessage(payload, signal);
 *   await parseSSEEvents(response, (event) => handleEvent(event), signal);
 */

export interface SSEEvent {
  type: string;
  // planning
  text?: string;
  message?: string;
  phase?: string;
  // chunk / chunks
  // text field reused
  // session_id
  session_id?: string;
  title?: string;
  subject?: string;
  // tool_status
  // message field reused
  // done
  options?: string[];
  response?: string;
  status?: string;
  // error
  error_code?: string;
  // catch-all
  [key: string]: any;
}

export async function parseSSEEvents(
  response: Response,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  if (!response.body) {
    // Fallback: try to read full text and parse lines
    const text = await response.text();
    parseLines(text.split("\n"), onEvent);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep last (possibly incomplete) line in buffer
      buffer = lines.pop() ?? "";

      parseLines(lines, onEvent);
    }

    // Process any remaining buffered line
    if (buffer.trim()) {
      parseLines([buffer], onEvent);
    }
  } finally {
    reader.releaseLock();
  }
}

function parseLines(lines: string[], onEvent: (event: SSEEvent) => void): void {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data:")) continue;

    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr || jsonStr === "[DONE]") continue;

    try {
      const event = JSON.parse(jsonStr) as SSEEvent;
      if (event && typeof event === "object") {
        onEvent(event);
      }
    } catch {
      // Not valid JSON — skip
    }
  }
}
