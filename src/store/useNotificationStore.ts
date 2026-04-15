import { create } from 'zustand';
import { notificationService, Notification } from '../services/notificationService';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  initStream: (userId: string) => () => void;
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
      const unreadNotifications = allNotifications.filter(n => !n.is_read);
      set({ 
        notifications: unreadNotifications, 
        unreadCount: unreadNotifications.length,
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
        const updated = state.notifications.filter(n => n.id !== notificationId);
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

  initStream: (userId: string) => {
    const unsub = notificationService.subscribeToStream(userId, (data) => {
      // Validate the incoming SSE data payload correctly
      if (data && typeof data === 'object' && data.id) {
        get().addNotification(data as Notification);
      } else {
        console.warn("Received malformed or incomplete notification payload:", data);
      }
    });
    
    return unsub;
  },

  isDropdownOpen: false,
  setIsDropdownOpen: (open) => set({ isDropdownOpen: open }),
}));
