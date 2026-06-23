/**
 * Notification store — mirrors the web useNotificationStore.ts.
 * Uses useSyncExternalStore (no extra deps), same pattern as usePrefsStore.ts.
 */
import { useSyncExternalStore } from "react";
import {
  notificationService,
  type Notification,
} from "../services/notificationService";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
}

const state: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
};

const listeners = new Set<() => void>();
let snapshot: NotificationState = { ...state };

function emit() {
  snapshot = { ...state };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const notificationStore = {
  fetchNotifications: async (userId: string) => {
    state.isLoading = true;
    emit();
    try {
      const list = await notificationService.fetchNotifications(userId);
      state.notifications = list;
      state.unreadCount = list.filter((n) => !n.is_read).length;
    } catch {
      /* keep previous state on error */
    } finally {
      state.isLoading = false;
      emit();
    }
  },

  markAsRead: async (notificationId: string) => {
    /* optimistic update */
    state.notifications = state.notifications.map((n) =>
      n.id === notificationId ? { ...n, is_read: true } : n
    );
    state.unreadCount = state.notifications.filter((n) => !n.is_read).length;
    emit();

    try {
      await notificationService.markAsRead(notificationId);
    } catch {
      /* rollback could go here; for now leave optimistic update */
    }
  },

  addNotification: (notification: Notification) => {
    const exists = state.notifications.some((n) => n.id === notification.id);
    if (exists) return;
    state.notifications = [notification, ...state.notifications];
    state.unreadCount = state.notifications.filter((n) => !n.is_read).length;
    emit();
  },

  initStream: (userId: string): (() => void) => {
    return notificationService.subscribeToStream(userId, (n) => {
      notificationStore.addNotification(n);
    });
  },

  get: () => snapshot,
};

export function useNotificationStore(): NotificationState {
  return useSyncExternalStore(subscribe, () => snapshot);
}
