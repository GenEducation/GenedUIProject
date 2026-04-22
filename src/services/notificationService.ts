const NOTIFICATION_API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

if (!NOTIFICATION_API_URL) {
  throw new Error("NEXT_PUBLIC_NOTIFICATION_SERVICE_URL is required. Set it in your .env.local file.");
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
    const response = await fetch(url, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch notifications");
    return response.json();
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    const response = await fetch(
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

  subscribeToStream: (userId: string, onMessage: (data: any) => void) => {
    const eventSource = new EventSource(
      `${NOTIFICATION_API_URL}/notify/stream?user_id=${userId}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error("Error parsing notification stream data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("Notification stream error:", error);
      // EventSource will automatically try to reconnect unless closed
    };

    return () => {
      eventSource.close();
    };
  },
};
