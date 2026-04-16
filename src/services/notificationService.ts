const NOTIFICATION_API_URL = (
  process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL || "http://192.168.1.15:8001"
).replace(/\/$/, "");

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
    const url = `${NOTIFICATION_API_URL}/notifications?user_id=${userId}&unread_only=${unreadOnly}`;
    const response = await fetch(url, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch notifications");
    return response.json();
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    const response = await fetch(
      `${NOTIFICATION_API_URL}/notifications/${notificationId}/read`,
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
      `${NOTIFICATION_API_URL}/stream?user_id=${userId}`,
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
