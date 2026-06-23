/**
 * Parent Chat Exploration — read-only view of a child's session history.
 * Two states: session list (no sessionId param) and history detail (with sessionId).
 *
 * Launched from the Children tab via router.push('/parent-chat', { childId, childName }).
 * Tap a session → pushes with sessionId to show the read-only transcript.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, MessageSquare } from "lucide-react-native";
import Markdown from "react-native-markdown-display";
import { studentService } from "@/services/studentService";
import { colors, fonts, radius } from "@/theme/tokens";
import type { ChatSession, HistoryMessage } from "@/types/api";

export default function ParentChat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    childId: string;
    childName?: string;
    sessionId?: string;
  }>();

  const { childId, childName = "Child", sessionId } = params;

  /* ── Session List ── */
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    if (!childId || sessionId) return;
    setSessionsLoading(true);
    studentService
      .fetchSessions(childId)
      .then((res) => setSessions(res?.sessions ?? []))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, [childId, sessionId]);

  /* ── History Detail ── */
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!childId || !sessionId) return;
    setHistoryLoading(true);
    studentService
      .fetchChatHistory(childId, sessionId)
      .then((res) => {
        console.log("[parent-chat] get-history raw:", JSON.stringify(res));
        const msgs =
          res?.messages ??
          (res as any)?.history ??
          (res as any)?.chat_history ??
          (Array.isArray(res) ? res : []);
        console.log("[parent-chat] msgs count:", msgs.length, "first:", JSON.stringify(msgs[0]));
        setMessages(msgs);
      })
      .catch((e) => console.error("[parent-chat] error:", e))
      .finally(() => setHistoryLoading(false));
  }, [childId, sessionId]);

  const title = sessionId
    ? sessions.find((s) => s.session_id === sessionId)?.subject ?? "Session"
    : `${childName}'s Chats`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <MessageSquare size={16} color={colors.edGreen} />
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Read-only badge */}
      <View style={styles.readOnlyBanner}>
        <Text style={styles.readOnlyText}>👁 Read-only — viewing {childName}'s learning history</Text>
      </View>

      {sessionId ? (
        /* History detail view */
        historyLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.edGreen} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No messages in this session.</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.historyContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg, i) => (
              <View key={i} style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleAi]}>
                <Text style={styles.bubbleRole}>
                  {msg.role === "user" ? "Student" : "April"}
                </Text>
                <Markdown
                  style={{
                    body: { fontFamily: fonts.dm, fontSize: 14, color: msg.role === "user" ? "#fff" : colors.text, lineHeight: 21 },
                    strong: { fontFamily: fonts.dmBold },
                    em: { fontFamily: fonts.dm },
                    code_inline: { fontFamily: fonts.mono, fontSize: 12 },
                  }}
                >
                  {msg.content}
                </Markdown>
                {msg.timestamp ? (
                  <Text style={styles.timestamp}>
                    {new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        )
      ) : (
        /* Session list */
        sessionsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.edGreen} />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.center}>
            <MessageSquare size={32} color={colors.textFaint} />
            <Text style={styles.emptyText}>No sessions found for {childName}.</Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(s) => s.session_id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.sessRow, pressed && styles.sessRowPressed]}
                onPress={() =>
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  router.push({ pathname: "/parent-chat" as any, params: { childId, childName, sessionId: item.session_id } })
                }
              >
                <View style={styles.sessIcon}>
                  <MessageSquare size={16} color={colors.edGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessSubject}>{item.subject ?? "Session"}</Text>
                  {item.grade ? (
                    <Text style={styles.sessMeta}>Grade {item.grade}</Text>
                  ) : null}
                </View>
                <Text style={styles.sessArrow}>›</Text>
              </Pressable>
            )}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.pageBg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  headerTitle: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text },

  readOnlyBanner: {
    backgroundColor: colors.edGreen + "10",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.edGreen + "20",
  },
  readOnlyText: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.edGreen },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted },

  historyContent: { padding: 16, gap: 12, paddingBottom: 32 },
  bubble: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: radius.md,
    gap: 4,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: colors.edGreen,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleRole: {
    fontFamily: fonts.dmBold,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textMuted,
    marginBottom: 2,
  },
  timestamp: {
    fontFamily: fonts.dm,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: "right",
    marginTop: 4,
  },

  listContent: { padding: 16, gap: 0 },
  sessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sessRowPressed: { backgroundColor: colors.pageBg },
  sessIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.edGreen + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  sessSubject: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  sessMeta:    { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  sessArrow:   { fontSize: 20, color: colors.textMuted },
});
