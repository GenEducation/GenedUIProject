/**
 * Lab board delta stream — subscribes to the same shared SSE endpoint used by
 * notificationService.ts (/notify/stream), filters for lab_board_delta events,
 * and hands the caller a parsed LabBoardDelta. Mirrors the web app's
 * src/features/lab/services/labStream.ts.
 */
import { getToken } from "./storage";
import type { LabBoardDelta } from "../types/lab";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

function isLabBoardDelta(value: unknown): value is LabBoardDelta {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.slot_id === "string" && typeof v.event === "string";
}

export const labStream = {
  /**
   * Subscribes to /notify/stream and calls `onDelta` for every
   * `type === "lab_board_delta"` event. Returns a cleanup fn that aborts
   * the connection.
   */
  subscribeToBoardDeltas: (
    userId: string,
    onDelta: (delta: LabBoardDelta) => void
  ): (() => void) => {
    const controller = new AbortController();

    const run = async () => {
      try {
        const token = await getToken();
        const res = await fetch(
          `${BASE}/notify/stream?user_id=${encodeURIComponent(userId)}`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
              Accept: "text/event-stream",
              "Cache-Control": "no-cache",
            },
            signal: controller.signal,
          }
        );

        if (!res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || controller.signal.aborted) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "heartbeat" || raw === "keep-alive" || raw === ":") continue;
            try {
              const envelope = JSON.parse(raw);
              if (envelope?.type !== "lab_board_delta") continue;

              const inner =
                typeof envelope.message === "string" ? JSON.parse(envelope.message) : envelope.message;
              if (isLabBoardDelta(inner)) onDelta(inner);
            } catch {
              /* ignore non-JSON / malformed payloads */
            }
          }
        }
      } catch {
        /* AbortError or network loss — no reconnect in v1 */
      }
    };

    run();

    return () => controller.abort();
  },
};
