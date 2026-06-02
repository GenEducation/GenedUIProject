/**
 * Chat message bubble — mirrors ChatMessageBubble.tsx from the web.
 *
 * Three render states (matching web lines 241–352):
 *  1. isStreaming + no text + no statusText → pulsing "Processing…"
 *  2. statusText + no text               → pulsing planning status
 *  3. has text                           → rendered message content
 *
 * AI messages show the Favicon1.jpg avatar (matches web).
 */
import React, { useEffect, useRef } from "react";
import { View, Text, Image, StyleSheet, Animated } from "react-native";
import { colors, fonts } from "../../theme/tokens";
import type { ChatMessage } from "../../types/api";

const FAVICON = require("../../../assets/Favicon1.jpg");

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isMe = message.from === "me";
  const isEmpty = !message.text && !message.statusText;
  const isStatusOnly = !!message.statusText && !message.text;

  return (
    <View style={[styles.row, isMe ? styles.rowMe : styles.rowAi]}>
      {/* AI avatar — shown left of AI bubbles (matches web) */}
      {!isMe && (
        <View style={styles.avatarWrap}>
          <Image source={FAVICON} style={styles.avatarImg} resizeMode="cover" />
        </View>
      )}

      <View style={[styles.bubble, isMe ? styles.me : styles.ai]}>
        {isEmpty && message.isStreaming ? (
          <PulsingText text="Processing…" />
        ) : isStatusOnly ? (
          <PulsingText text={message.statusText!} />
        ) : (
          <Text style={[styles.text, isMe && styles.textMe]}>
            {message.text}
          </Text>
        )}
      </View>
    </View>
  );
}

/** Animates text opacity 1→0.3→1 — matches web's `animate-pulse` */
function PulsingText({ text }: { text: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.Text style={[styles.statusText, { opacity }]}>
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  rowAi: { justifyContent: "flex-start" },
  rowMe: { justifyContent: "flex-end" },

  avatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  avatarImg: { width: 28, height: 28 },

  bubble: {
    maxWidth: "80%",
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 16,
  },
  ai: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 5,
    // subtle shadow matching web
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  me: {
    backgroundColor: colors.genPurple,
    borderBottomRightRadius: 5,
    shadowColor: colors.genPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },
  text: {
    fontFamily: fonts.dm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  textMe: { color: "#fff" },
  statusText: {
    fontFamily: fonts.dmMedium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
});
