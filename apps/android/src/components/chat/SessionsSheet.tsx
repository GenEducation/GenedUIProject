/**
 * SessionsSheet — bottom sheet listing the student's past chat sessions.
 * Selecting one switches the active session in place (useChat.switchSession).
 * A "New chat" row at the top starts a fresh session.
 */
import React from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet, Dimensions } from "react-native";
import { Plus, Check } from "lucide-react-native";
import { colors, fonts, subjectVisual } from "../../theme/tokens";
import type { ChatSession } from "../../types/api";

const SCREEN_H = Dimensions.get("window").height;

interface Props {
  visible: boolean;
  sessions: ChatSession[];
  activeSessionId?: string | null;
  onSelect: (session: ChatSession) => void;
  onNewChat: () => void;
  onClose: () => void;
}

export function SessionsSheet({ visible, sessions, activeSessionId, onSelect, onNewChat, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Your conversations</Text>

          <Pressable style={styles.newRow} onPress={() => { onNewChat(); onClose(); }}>
            <View style={styles.newIcon}>
              <Plus size={18} color={colors.genPurple} />
            </View>
            <Text style={styles.newText}>New chat</Text>
          </Pressable>

          {sessions.length === 0 ? (
            <Text style={styles.empty}>No past conversations yet.</Text>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(s, i) => s.session_id ?? `s-${i}`}
              style={{ maxHeight: SCREEN_H * 0.55 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const key = resolveVisualKey(item.subject ?? "");
                const visual = subjectVisual[key] ?? {
                  color: colors.genPurple,
                  bg: "#EBF0FD",
                  icon: "💬",
                  label: item.subject ?? "Session",
                };
                const isActive = item.session_id === activeSessionId;
                const title =
                  item.title ?? item.last_message ?? `${visual.label} session`;
                return (
                  <Pressable
                    style={[styles.row, isActive && styles.rowActive]}
                    onPress={() => { onSelect(item); onClose(); }}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: visual.bg }]}>
                      <Text style={styles.icon}>{visual.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowText, isActive && styles.rowTextActive]} numberOfLines={1}>
                        {title}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {visual.label}
                        {item.last_active ? ` · ${formatRelativeTime(item.last_active)}` : ""}
                      </Text>
                    </View>
                    {isActive ? <Check size={18} color={colors.genPurple} /> : null}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function resolveVisualKey(raw: string): string {
  if (!raw) return "";
  const s = raw.toLowerCase().replace(/[_\s-]/g, "");
  if (s.includes("math")) return "mathematics";
  if (s.includes("english")) return "english";
  if (s.includes("science")) return "science";
  if (s.includes("hindi")) return "hindi";
  return raw.toLowerCase();
}

function formatRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  } catch {
    return "Recently";
  }
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, maxHeight: SCREEN_H * 0.78 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 },
  title: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text, marginBottom: 12 },
  newRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "80",
  },
  newIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.genPurple + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  newText: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.genPurple },
  empty: { fontFamily: fonts.dm, fontSize: 14, color: colors.textMuted, paddingVertical: 20, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "80",
  },
  rowActive: { backgroundColor: colors.genPurple + "08", borderRadius: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 18 },
  rowText: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  rowTextActive: { color: colors.genPurple },
  meta: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
