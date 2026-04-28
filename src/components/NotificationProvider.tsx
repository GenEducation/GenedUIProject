"use client";

import React, { useEffect } from "react";
import { useNotificationStore } from "@/store/useNotificationStore";

interface NotificationProviderProps {
  userId: string | null;
  children: React.ReactNode;
}

/**
 * NotificationProvider handles the persistent SSE stream for notifications.
 * By placing this in a high-level layout, the stream stays alive during
 * internal navigation, preventing unnecessary reconnections.
 */
export function NotificationProvider({ userId, children }: NotificationProviderProps) {
  const initStream = useNotificationStore((state) => state.initStream);

  useEffect(() => {
    if (!userId) return;

    console.log("Global NotificationProvider: Initializing stream for", userId);
    const unsub = initStream(userId);
    
    return () => {
      console.log("Global NotificationProvider: Cleaning up stream for", userId);
      unsub();
    };
  }, [userId, initStream]);

  return <>{children}</>;
}
