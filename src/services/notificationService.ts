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
   * SSE subscription using native EventSource.
   * This matches the working implementation and avoids issues with auth headers
   * that some SSE servers might not support.
   */

  subscribeToStream: (
    userId: string,
    onMessage: (data: any) => void,
  ): (() => void) => {
    // Determine the base URL for the notification service.
    // We prioritize NEXT_PUBLIC_NOTIFICATION_SERVICE_URL, but if it's missing,
    // we use the main API host on port 8004 as per your working snippet.
    const baseUrl = NOTIFICATION_API_URL.replace(/:8080\/?$/, ":8004").replace(
      /\/$/,
      "",
    );

    const streamUrl = `${baseUrl}/notify/stream?user_id=${userId}`;
    console.log(`Connecting to notification stream: ${streamUrl}`);

    const eventSource = new EventSource(streamUrl);

    eventSource.onopen = () => {
      console.log("✅ Notification stream connected");
    };

    eventSource.onmessage = (event) => {
      console.log("Received notification data:", event.data);
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        // Fallback for raw string messages
        onMessage({
          id: Date.now().toString(),
          message: event.data,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    };

    eventSource.onerror = (err) => {
      console.error("❌ Notification stream error:", err);
    };

    // Return a cleanup function to close the stream
    return () => {
      console.log("Closing notification stream");
      eventSource.close();
    };
  },
};
