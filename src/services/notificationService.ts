import { fetchEventSource } from "@microsoft/fetch-event-source";
import { authFetch, getAuthToken } from "@/utils/authFetch";

const NOTIFICATION_API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

if (!NOTIFICATION_API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required. Set it in your .env.local file.",
  );
}

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
    unreadOnly: boolean = false,
  ): Promise<Notification[]> => {
    const url = `${NOTIFICATION_API_URL}/notify/notifications?user_id=${userId}&unread_only=${unreadOnly}`;
    const response = await authFetch(url, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch notifications");
    return response.json();
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    const response = await authFetch(
      `${NOTIFICATION_API_URL}/notify/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );
    if (!response.ok) throw new Error("Failed to mark notification as read");
  },

  /**
   * SSE subscription using fetchEventSource.
   * This allows us to inject the Authorization header required by the API Gateway.
   */
  subscribeToStream: (
    userId: string,
    onMessage: (data: any) => void,
  ): (() => void) => {
    const controller = new AbortController();
    const token = getAuthToken();
    const streamUrl = `${NOTIFICATION_API_URL}/notify/stream?user_id=${userId}`;

    console.log(`Connecting to notification stream: ${streamUrl}`);

    fetchEventSource(streamUrl, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "text/event-stream",
      },
      signal: controller.signal,
      onopen: async (response) => {
        if (response.ok) {
          console.log("✅ Notification stream connected");
        } else {
          console.error(
            "❌ Notification stream connection failed:",
            response.status,
          );
        }
      },
      onmessage(event) {
        console.log("Received notification data:", event.data);
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          onMessage({
            id: Date.now().toString(),
            message: event.data,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        }
      },
      onerror(error) {
        console.error("❌ Notification stream error:", error);
      },
    });

    return () => {
      console.log("Closing notification stream");
      controller.abort();
    };
  },
};
