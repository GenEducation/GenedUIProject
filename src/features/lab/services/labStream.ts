import { fetchEventSource } from "@microsoft/fetch-event-source";
import { getAuthToken } from "@/utils/authFetch";
import type { LabBoardDelta } from "../types/lab";

const STREAM_API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

if (!STREAM_API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is required. Set it in your .env.local file.");
}

/**
 * Subscribes to the shared notification stream and forwards only
 * `lab_board_delta` events. The push is a signal, not the data — callers
 * must refetch the board themselves (spec §7).
 */
export const labStream = {
  subscribeToBoardDeltas: (userId: string, onDelta: (delta: LabBoardDelta) => void): (() => void) => {
    const controller = new AbortController();
    const token = getAuthToken();
    const streamUrl = `${STREAM_API_URL}/stream?user_id=${userId}`;

    fetchEventSource(streamUrl, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "text/event-stream",
      },
      signal: controller.signal,
      onopen: async (response) => {
        if (!response.ok) {
          console.error("❌ Lab board stream connection failed:", response.status);
        }
      },
      onmessage(event) {
        const rawData = event.data?.trim();
        if (!rawData || rawData === "heartbeat" || rawData === "keep-alive" || rawData === ":") {
          return;
        }

        try {
          const notification = JSON.parse(rawData);
          if (notification?.type !== "lab_board_delta") return;

          const inner = typeof notification.message === "string"
            ? JSON.parse(notification.message)
            : notification.message;

          if (inner?.slot_id && inner?.event) {
            onDelta(inner as LabBoardDelta);
          }
        } catch {
          // Silent ignore for non-JSON / unrelated messages.
        }
      },
      onerror(error) {
        console.error("❌ Lab board stream error:", error);
      },
    });

    return () => {
      controller.abort();
    };
  },
};
