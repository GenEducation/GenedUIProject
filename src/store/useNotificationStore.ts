import { create } from 'zustand';
import { notificationService, Notification } from '../services/notificationService';

// Event types that are internal signals (e.g. consumed by labStream.ts to
// trigger a board refetch) and were never meant to be shown to users.
const INTERNAL_NOTIFICATION_TYPES = new Set(['lab_board_delta']);
const isUserFacing = (n: Notification) => !INTERNAL_NOTIFICATION_TYPES.has(n.type as string);

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  initStream: (userId: string, onNew?: (notification: Notification) => void) => () => void;
  addNotification: (notification: Notification) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const allNotifications = await notificationService.fetchNotifications(userId);
      const notifications = allNotifications.filter(isUserFacing);
      set({
        notifications,
        unreadCount: notifications.filter(n => !n.is_read).length,
        isLoading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      // Optimistic update
      set((state) => {
        const updated = state.notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        return {
          notifications: updated,
          unreadCount: updated.filter(n => !n.is_read).length
        };
      });
      
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error("Failed to mark notification as read", error);
      // Rollback or handle error if needed
    }
  },

  addNotification: (notification: Notification) => {
    if (!isUserFacing(notification)) return;
    set((state) => {
      const exists = state.notifications.some(n => n.id === notification.id);
      if (exists) return state;

      const updated = [notification, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.is_read).length
      };
    });
  },

  initStream: (userId: string, onNew?: (notification: Notification) => void) => {
    const unsub = notificationService.subscribeToStream(userId, (data) => {
      console.log("🔔 [NotificationStore] Processing incoming data:", data);

      // Validate the incoming SSE data payload correctly
      if (data && typeof data === 'object' && data.id) {
        get().addNotification(data as Notification);
        if (isUserFacing(data as Notification)) {
          onNew?.(data as Notification);
        }
      } else {
        console.warn("⚠️ [NotificationStore] Received malformed or incomplete notification payload:", data);
      }
    });

    return unsub;
  },

  isDropdownOpen: false,
  setIsDropdownOpen: (open) => set({ isDropdownOpen: open }),
}));
