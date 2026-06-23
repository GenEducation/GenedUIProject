/**
 * Teacher Chat History — read-only view of a student's session history.
 * Two states: session list (no sessionId param) → message thread (with sessionId).
 *
 * Launched via router.push('/teacher-chat', { studentId, studentName }).
 * Tap a session → pushes with sessionId to show the read-only transcript.
 */
import React, { useEffect } from "react";
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
import { useTeacherStore } from "@/store/useTeacherStore";
import { useTeacherId } from "@/hooks/useTeacherId";
import { colors, fonts, radius } from "@/theme/tokens";

export default function TeacherChat() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const teacherId = useTeacherId();

  const params = useLocalSearchParams<{
    studentId: string;
    studentName?: string;
    sessionId?: string;
  }>();
  const { studentId, studentName = "Student", sessionId } = params;

  const {
    chats, isFetchingChats,
    chatMessages, isFetchingMessages,
    selectedStudent,
    openChats, openSession,
  } = useTeacherStore();

  // Load sessions if arriving fresh (no selectedStudent from roster navigate)
  useEffect(() => {
    if (!sessionId && !selectedStudent && studentId && teacherId) {
      openChats(teacherId, { student_id: studentId } as any);
    }
  }, [studentId, teacherId]);

  // Load messages when sessionId param is set
  useEffect(() => {
    if (sessionId && studentId && teacherId) {
      openSession(teacherId, studentId, sessionId);
    }
  }, [sessionId, studentId, teacherId]);

  const title = sessionId
    ? (chats.find((c) => c.session_id === sessionId)?.subject ?? "Session")
    : `${studentName}'s Chats`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <MessageSquare size={16} color={colors.emerald} />
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Read-only badge */}
      <View style={styles.readOnlyBanner}>
        <Text style={styles.readOnlyText}>
          👁 Read-only · Viewing {studentName}&apos;s learning history
        </Text>
      </View>

      {sessionId ? (
        /* Message thread */
        isFetchingMessages ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.emerald} />
          </View>
        ) : chatMessages.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No messages in this session.</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.historyContent}
            showsVerticalScrollIndicator={false}
          >
            {chatMessages.map((msg, i) => {
              const role = (msg.role ?? "").toLowerCase();
              const isUser = role === "user" || role === "student";
              // Backend may return content in different fields depending on message type
              const text: string =
                msg.content ?? msg.text ?? msg.message ?? msg.body ?? "";
              return (
                <View key={msg.message_id ?? i} style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                  <Text style={styles.bubbleRole}>
                    {isUser ? "Student" : "AI Tutor"}
                  </Text>
                  <Markdown
                    style={{
                      body: {
                        fontFamily: fonts.dm,
                        fontSize: 14,
                        color: isUser ? "#fff" : colors.text,
                        lineHeight: 21,
                      },
                      strong: { fontFamily: fonts.dmBold },
                      code_inline: { fontFamily: fonts.mono, fontSize: 12 },
                    }}
                  >
                    {text}
                  </Markdown>
                  {!text ? (
                    <Text style={{ fontFamily: fonts.dm, fontSize: 13, color: isUser ? "rgba(255,255,255,0.5)" : colors.textMuted, fontStyle: "italic" }}>
                      [media or interactive content]
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        )
      ) : (
        /* Session list */
        isFetchingChats ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.emerald} />
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.center}>
            <MessageSquare size={32} color={colors.textFaint} />
            <Text style={styles.emptyText}>No sessions found for {studentName}.</Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(s) => s.session_id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.sessRow, pressed && styles.sessRowPressed]}
                onPress={() =>
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  router.push({ pathname: "/teacher-chat" as any, params: { studentId, studentName, sessionId: item.session_id } })
                }
              >
                <View style={styles.sessIcon}>
                  <MessageSquare size={16} color={colors.emerald} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessTitle}>{item.title ?? item.subject ?? "Session"}</Text>
                  <Text style={styles.sessMeta}>
                    {[
                      item.subject,
                      item.message_count ? `${item.message_count} messages` : null,
                      item.last_active
                        ? new Date(item.last_active).toLocaleDateString()
                        : null,
                    ].filter(Boolean).join(" · ")}
                  </Text>
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
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.pageBg,
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 7,
  },
  headerTitle: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text },

  readOnlyBanner: {
    backgroundColor: colors.emerald + "10",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.emerald + "20",
  },
  readOnlyText: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.emerald },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted },

  historyContent: { padding: 16, gap: 12, paddingBottom: 32 },
  bubble: { maxWidth: "85%", padding: 12, borderRadius: radius.md, gap: 4 },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: colors.navy,
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
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.emerald + "14",
    alignItems: "center", justifyContent: "center",
  },
  sessTitle: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  sessMeta:  { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  sessArrow: { fontSize: 20, color: colors.textMuted },
});
