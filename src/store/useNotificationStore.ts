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
      const notifications = await notificationService.fetchNotifications(userId);
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
      // Handle the data format from backend. 
      // If data is a notification object, add it.
      if (data && typeof data === 'object') {
        get().addNotification(data as Notification);
      }
    });
    
    return unsub;
  },

  isDropdownOpen: false,
  setIsDropdownOpen: (open) => set({ isDropdownOpen: open }),
}));
