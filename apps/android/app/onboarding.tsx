/**
 * Onboarding screen — a conversational interview that populates the learner's
 * profile traits before normal chat begins. Plain request/response (useOnboarding),
 * not the SSE chat. On completion it routes into the subject chat.
 */
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Sparkles, Clock, ShieldCheck } from "lucide-react-native";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useOnboarding } from "@/hooks/useOnboarding";
import { colors, fonts } from "@/theme/tokens";

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ subject?: string; grade?: string }>();

  const subject = params.subject ?? "mathematics";
  const grade = parseInt(params.grade ?? "9", 10);

  const { messages, isAITyping, isComplete, sending, error, send } = useOnboarding({
    subject,
    grade,
  });

  const scrollRef = useRef<ScrollView>(null);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (messages.length > 0 || isAITyping) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages, isAITyping]);

  useEffect(() => {
    if (error) Alert.alert("Onboarding", error);
  }, [error]);

  // When onboarding completes, hand off to the subject chat after a short beat
  useEffect(() => {
    if (!isComplete || navigatedRef.current) return;
    navigatedRef.current = true;
    const t = setTimeout(() => {
      router.replace({ pathname: "/chat", params: { subject, grade: String(grade) } });
    }, 1600);
    return () => clearTimeout(t);
  }, [isComplete]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              Getting to know you
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              <Text style={styles.subjectEm}>{subject}</Text> · Grade {grade}
            </Text>
          </View>
        </View>

        {/* Info strip */}
        <View style={styles.infoStrip}>
          <View style={styles.infoItem}>
            <Sparkles size={13} color={colors.genPurple} />
            <Text style={styles.infoText}>Personalized</Text>
          </View>
          <View style={styles.infoItem}>
            <Clock size={13} color={colors.genPurple} />
            <Text style={styles.infoText}>~5 min</Text>
          </View>
          <View style={styles.infoItem}>
            <ShieldCheck size={13} color={colors.genPurple} />
            <Text style={styles.infoText}>Private</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m, i) => (
            <MessageBubble key={m.id ?? i} message={m} sessionId={undefined} />
          ))}
          {isAITyping ? (
            <View style={styles.typingWrap}>
              <TypingIndicator />
            </View>
          ) : null}

          {isComplete ? (
            <View style={styles.doneCard}>
              <Text style={styles.doneEmoji}>🎉</Text>
              <Text style={styles.doneText}>All set! Taking you to your tutor…</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ paddingBottom: insets.bottom + 6 }}>
          <ChatInput onSend={send} disabled={sending || isAITyping || isComplete} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.pageBg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.dmBold, fontSize: 15, color: colors.text },
  subtitle: { fontFamily: fonts.dm, fontSize: 12, color: colors.textMuted, marginTop: 1 },
  subjectEm: { fontFamily: fonts.dmBold, color: colors.genPurple, textTransform: "capitalize" },
  infoStrip: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.genPurple + "08",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  infoText: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMid },
  messages: { padding: 16, gap: 12, flexGrow: 1 },
  typingWrap: { alignSelf: "flex-start", paddingLeft: 4 },
  doneCard: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  doneEmoji: { fontSize: 34 },
  doneText: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
});
