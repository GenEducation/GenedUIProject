import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChat } from "@/hooks/useChat";
import { colors, fonts } from "@/theme/tokens";

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

  const { messages, sessionId: chatSessionId, sending, error, send, clearError } = useChat({
    subject,
    grade,
    sessionId,
    agentId,
  });

  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom whenever messages update or streaming progresses
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  // Show critical errors as alerts
  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [{ text: "OK", onPress: clearError }]);
    }
  }, [error]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ChatHeader subject={subject} />

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

          {/* MessageBubble handles all states internally:
              - empty + isStreaming → pulsing "Processing…"
              - statusText only     → pulsing planning text
              - has text            → rendered content               */}
          {messages.map((m, i) => (
            <MessageBubble key={m.id ?? i} message={m} />
          ))}
        </ScrollView>

        <View style={{ paddingBottom: insets.bottom + 6 }}>
          <ChatInput
            onSend={send}
            disabled={sending}
            onVoicePress={() => {
              router.push({
                pathname: "/voice-chat",
                params: { subject, grade: String(grade), sessionId: chatSessionId ?? sessionId ?? undefined, agentId },
              });
            }}
          />
        </View>
      </View>
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
});
