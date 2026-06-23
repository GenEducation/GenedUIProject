/**
 * Notification bell for the parent portal header.
 * Shows an unread badge and opens a bottom sheet of notifications.
 * Connects to the SSE stream on mount for live updates.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  Info,
  AlertCircle,
  X,
} from "lucide-react-native";
import { colors, fonts, radius } from "../../theme/tokens";
import {
  notificationStore,
  useNotificationStore,
} from "../../store/useNotificationStore";
import type { Notification } from "../../services/notificationService";

function timeAgo(dateStr: string): string {
  const now = new Date();
  const past = new Date(dateStr);
  const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diff < 60) return "just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getIcon(type?: string) {
  const size = 15;
  switch (type) {
    case "success": return <CheckCircle2 size={size} color={colors.edGreen} />;
    case "error":   return <AlertCircle  size={size} color={colors.coral}   />;
    case "message": return <MessageSquare size={size} color={colors.genBlue} />;
    default:        return <Info          size={size} color={colors.textMuted} />;
  }
}

interface Props {
  userId: string;
}

export function NotificationBell({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, isLoading } = useNotificationStore();
  const insets = useSafeAreaInsets();

  /* Fetch on mount + subscribe to SSE stream */
  useEffect(() => {
    if (!userId) return;
    notificationStore.fetchNotifications(userId);
    const unsub = notificationStore.initStream(userId);
    return unsub;
  }, [userId]);

  return (
    <>
      {/* Bell button */}
      <Pressable
        style={({ pressed }) => [styles.bellBtn, pressed && styles.bellPressed]}
        onPress={() => setOpen(true)}
        hitSlop={8}
      >
        <Bell size={20} color={colors.text} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? "9+" : String(unreadCount)}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Notification sheet */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />

          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Notifications</Text>
              <Text style={styles.sheetSub}>{unreadCount} unread</Text>
            </View>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {isLoading && notifications.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.edGreen} />
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(n) => n.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <NotificationItem
                  notification={item}
                  onMarkRead={() => notificationStore.markAsRead(item.id)}
                />
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Bell size={28} color={colors.textFaint} />
                  <Text style={styles.emptyText}>No notifications yet.</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: () => void;
}) {
  const unread = !notification.is_read;
  return (
    <View style={[styles.notifItem, unread && styles.notifItemUnread]}>
      <View style={styles.notifIcon}>{getIcon(notification.type)}</View>
      <View style={{ flex: 1 }}>
        {notification.title ? (
          <Text style={[styles.notifTitle, !unread && styles.notifTitleRead]}>
            {notification.title}
          </Text>
        ) : null}
        <Text style={[styles.notifMsg, !unread && styles.notifMsgRead]}>
          {notification.message}
        </Text>
        <View style={styles.notifFooter}>
          <Text style={styles.notifTime}>{timeAgo(notification.created_at)}</Text>
          {unread && (
            <Pressable onPress={onMarkRead} style={styles.markReadBtn}>
              <Text style={styles.markReadText}>Mark read</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.pageBg,
    alignItems: "center",
    justifyContent: "center",
  },
  bellPressed: { opacity: 0.7 },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.edGreen,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: { fontFamily: fonts.dmBold, fontSize: 9, color: "#fff" },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000055",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "75%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontFamily: fonts.dmBold,
    fontSize: 13,
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sheetSub: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted, marginTop: 2 },

  center: { paddingVertical: 40, alignItems: "center" },
  listContent: { paddingBottom: 8 },

  notifItem: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notifItemUnread: { backgroundColor: colors.edGreen + "06" },
  notifIcon: { marginTop: 2 },
  notifTitle: {
    fontFamily: fonts.dmBold,
    fontSize: 13,
    color: colors.text,
    marginBottom: 3,
  },
  notifTitleRead: { color: colors.textMid },
  notifMsg:       { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.text, lineHeight: 18 },
  notifMsgRead:   { color: colors.textMuted },
  notifFooter:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  notifTime:      { fontFamily: fonts.dm, fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  markReadBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.edGreen + "40",
    backgroundColor: colors.edGreen + "08",
  },
  markReadText: { fontFamily: fonts.dmBold, fontSize: 10, color: colors.edGreen, textTransform: "uppercase", letterSpacing: 0.5 },

  empty: { alignItems: "center", gap: 10, paddingVertical: 48 },
  emptyText: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted },
});
