/**
 * Voice chat screen — full-screen voice mode with orb, transcript, and controls.
 *
 * Layout (top-to-bottom):
 *  1. Header (back + subject + connection quality)
 *  2. Scrollable transcript (reuses MessageBubble)
 *  3. Voice orb (animated, tap to start)
 *  4. Controls bar (mute / PTT / end)
 */
import React, { useEffect, useRef } from "react";
import { View, ScrollView, StyleSheet, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { VoiceChatHeader } from "@/components/voice/VoiceChatHeader";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { VoiceControls } from "@/components/voice/VoiceControls";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { RecordingSheet } from "@/components/chat/english/RecordingSheet";
import { colors, fonts } from "@/theme/tokens";

const STATUS_CAPTIONS: Record<string, string> = {
  idle: "Tap to start voice chat",
  connecting: "Connecting…",
  active_listening: "Listening…",
  active_muted: "Muted — hold to talk",
  active_speaking: "AI is speaking…",
  active_ptt: "Listening…",
  error: "Connection error — tap to retry",
};

export default function VoiceChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    subject?: string;
    grade?: string;
    sessionId?: string;
    agentId?: string;
  }>();

  const subject = params.subject ?? "mathematics";
  const grade = parseInt(params.grade ?? "9", 10);

  const {
    messages,
    sessionId: voiceSessionId,
    subject: resolvedSubject,
    voiceStatus,
    connectionQuality,
    isMuted,
    pttHeld,
    isAISpeaking,
    isThinking,
    startSession,
    stopSession,
    toggleMute,
    beginPtt,
    endPtt,
  } = useVoiceChat({
    subject,
    grade,
    sessionId: params.sessionId,
    agentId: params.agentId,
  });

  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0 || isThinking) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages, isThinking]);

  // Determine orb phase and caption
  let orbPhase: "idle" | "listening" | "speaking" | "pttHeld" = "idle";
  // Reopening a session with loaded transcript: the orb resumes the same session,
  // so label it "Continue" instead of "start" (mirrors the web's Continue CTA).
  const isResumable = voiceStatus === "idle" && messages.length > 0;
  let caption = isResumable ? "Continue voice session" : STATUS_CAPTIONS.idle;

  if (voiceStatus === "connecting") {
    orbPhase = "idle";
    caption = STATUS_CAPTIONS.connecting;
  } else if (voiceStatus === "active") {
    if (pttHeld) {
      orbPhase = "pttHeld";
      caption = STATUS_CAPTIONS.active_ptt;
    } else if (isAISpeaking) {
      orbPhase = "speaking";
      caption = STATUS_CAPTIONS.active_speaking;
    } else if (isMuted) {
      orbPhase = "idle";
      caption = STATUS_CAPTIONS.active_muted;
    } else {
      orbPhase = "listening";
      caption = STATUS_CAPTIONS.active_listening;
    }
  } else if (voiceStatus === "error") {
    orbPhase = "idle";
    caption = STATUS_CAPTIONS.error;
  }

  const handleOrbTap = () => {
    if (voiceStatus === "idle" || voiceStatus === "error") {
      startSession();
    }
  };

  const handleOrbPressIn = () => {
    if (voiceStatus === "active" && isMuted) {
      beginPtt();
    }
  };

  const handleOrbPressOut = () => {
    if (pttHeld) {
      endPtt();
    }
  };

  const handleEnd = () => {
    stopSession();
    router.back();
  };

  return (
    <Screen background={colors.pageBg}>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {/* Header */}
        <VoiceChatHeader
          subject={resolvedSubject || subject}
          connectionQuality={connectionQuality}
          onBack={handleEnd}
        />

        {/* Transcript */}
        <ScrollView
          ref={scrollRef}
          style={styles.transcript}
          contentContainerStyle={styles.transcriptContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎙️</Text>
              <Text style={styles.emptyTitle}>Voice Chat</Text>
              <Text style={styles.emptySubtitle}>
                Tap the orb below to start a voice conversation with your AI tutor
              </Text>
            </View>
          ) : (
            messages.map((msg, i) => (
              <View key={msg.id ?? `msg-${i}`} style={styles.messageWrap}>
                <MessageBubble message={msg} sessionId={voiceSessionId ?? params.sessionId} />
              </View>
            ))
          )}

          {/* Single, state-driven thinking indicator. Rendered outside the message
              list so it can never duplicate or get stuck out of order. */}
          {isThinking && (
            <View style={styles.messageWrap}>
              <MessageBubble message={{ from: "ai", text: "", isStreaming: true }} />
            </View>
          )}
        </ScrollView>

        {/* Voice Orb — only shown before the session is active */}
        {voiceStatus !== "active" && (
          <View style={styles.orbSection}>
            <VoiceOrb
              phase={orbPhase}
              caption={caption}
              onTap={handleOrbTap}
            />
          </View>
        )}

        {/* Controls — only visible during active session */}
        {voiceStatus === "active" && (
          <VoiceControls
            isMuted={isMuted}
            pttHeld={pttHeld}
            sessionActive={voiceStatus === "active"}
            onToggleMute={toggleMute}
            onPttStart={beginPtt}
            onPttEnd={endPtt}
            onEnd={handleEnd}
          />
        )}
      </View>

      <RecordingSheet />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  transcript: {
    flex: 1,
  },
  transcriptContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexGrow: 1,
  },
  messageWrap: {
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: fonts.nunito,
    fontSize: 22,
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: fonts.dm,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  orbSection: {
    alignItems: "center",
    paddingVertical: 8,
  },
});
