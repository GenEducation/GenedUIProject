import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookOpen, ChevronRight } from "lucide-react-native";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { RecordingSheet } from "@/components/chat/english/RecordingSheet";
import { SessionsSheet } from "@/components/chat/SessionsSheet";
import { PickerSheet } from "@/components/PickerSheet";
import { useChat } from "@/hooks/useChat";
import { useStudentId } from "@/hooks/useStudentId";
import { studentService } from "@/services/studentService";
import { pdfStore } from "@/store/usePdfStore";
import { colors, fonts } from "@/theme/tokens";
import type { ChatSession } from "@/types/api";
import { isVoiceSession, buildSessionRoute } from "@/utils/session";

export default function Chat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    subject?: string;
    grade?: string;
    sessionId?: string;
    agentId?: string;
  }>();

  const subject   = params.subject   ?? "mathematics";
  const grade     = parseInt(params.grade ?? "9", 10);
  const sessionId = params.sessionId;
  const agentId   = params.agentId;

  const studentId = useStudentId();

  const { messages, sessionId: chatSessionId, chapterName, sending, error, send, switchSession, clearError } = useChat({
    subject,
    grade,
    sessionId,
    agentId,
  });

  const [pickerOptions, setPickerOptions] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const shownOptionsRef = useRef(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // Load the session list once for the in-chat switcher
  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    studentService
      .fetchSessions(studentId)
      .then((r) => {
        if (cancelled) return;
        const list = r.sessions ?? (r as any) ?? [];
        setSessions(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
    if (!shownOptionsRef.current) {
      const opts = messages.find((m) => m.from === "ai" && m.options?.length)?.options;
      if (opts && opts.length > 0) {
        shownOptionsRef.current = true;
        setPickerOptions(opts);
        setPickerOpen(true);
      }
    }
  }, [messages]);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [{ text: "OK", onPress: clearError }]);
    }
  }, [error]);

  const openPdf = () => {
    if (!chapterName) return;
    pdfStore.openPdf(chapterName, grade, subject);
    router.push("/pdf-viewer" as any);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ChatHeader subject={subject} onOpenSessions={() => setSessionsOpen(true)} />

        {chapterName ? (
          <Pressable style={styles.docChip} onPress={openPdf}>
            <BookOpen size={14} color={colors.genPurple} />
            <Text style={styles.docChipText} numberOfLines={1}>{chapterName}</Text>
            <ChevronRight size={14} color={colors.genPurple} />
          </Pressable>
        ) : null}

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && !sending ? (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>
                Ask me anything about{" "}
                <Text style={styles.emptyChatSubject}>{subject}</Text>!
              </Text>
            </View>
          ) : null}

          {messages.map((m, i) => (
            <MessageBubble
              key={m.id ?? i}
              message={m}
              sessionId={chatSessionId ?? sessionId}
            />
          ))}
        </ScrollView>

        <View style={{ paddingBottom: insets.bottom + 6 }}>
          <ChatInput onSend={send} disabled={sending} />
        </View>
      </View>

      <RecordingSheet />

      <SessionsSheet
        visible={sessionsOpen}
        sessions={sessions}
        activeSessionId={chatSessionId ?? sessionId}
        onSelect={(s) => {
          if (isVoiceSession(s)) {
            setSessionsOpen(false);
            router.replace(buildSessionRoute(s, subject, grade) as any);
          } else {
            switchSession(s.session_id);
          }
        }}
        onNewChat={() => switchSession(null)}
        onClose={() => setSessionsOpen(false)}
      />

      <PickerSheet
        visible={pickerOpen}
        title="Select chapter"
        options={pickerOptions}
        selected=""
        onSelect={(opt) => {
          setPickerOpen(false);
          send(opt);
        }}
        onClose={() => setPickerOpen(false)}
        emptyText="No chapters available"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#fff" },
  messages: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyChatText: {
    fontFamily: fonts.dm,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyChatSubject: {
    fontFamily: fonts.dmBold,
    color: colors.genPurple,
    textTransform: "capitalize",
  },
  docChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.genPurple + "12",
    borderWidth: 1,
    borderColor: colors.genPurple + "30",
    alignSelf: "flex-start",
    maxWidth: "90%",
  },
  docChipText: {
    flex: 1,
    fontFamily: fonts.dmMedium,
    fontSize: 12,
    color: colors.genPurple,
  },
});
