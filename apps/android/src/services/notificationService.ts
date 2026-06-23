/**
 * Notification service — mobile port of the web src/services/notificationService.ts.
 * Uses authFetch for REST calls and a manual SSE reader for the live stream.
 */
import { authFetch } from "./authFetch";
import { getToken } from "./storage";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export interface Notification {
  id: string;
  user_id: string;
  title?: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type?: string;
}

export const notificationService = {
  fetchNotifications: async (
    userId: string,
    unreadOnly = false
  ): Promise<Notification[]> => {
    const res = await authFetch(
      `${BASE}/notify/notifications?user_id=${encodeURIComponent(userId)}&unread_only=${unreadOnly}`,
      { headers: { accept: "application/json" } }
    );
    return res.json();
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await authFetch(
      `${BASE}/notify/notifications/${encodeURIComponent(notificationId)}/read`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
  },

  /**
   * SSE subscription via native fetch streaming.
   * Parses `data:` lines and ignores heartbeats/keep-alives.
   * Returns a cleanup fn that aborts the connection.
   */
  subscribeToStream: (
    userId: string,
    onMessage: (n: Notification) => void
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
              const data = JSON.parse(raw);
              if (data?.id) onMessage(data as Notification);
            } catch { /* ignore non-JSON */ }
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
