/**
 * Chat message bubble — mirrors ChatMessageBubble.tsx from the web.
 *
 * Three render states (matching web lines 241–352):
 *  1. isStreaming + no text + no statusText → pulsing "Processing…"
 *  2. statusText + no text               → pulsing planning status
 *  3. has text                           → rendered message content
 *
 * AI messages render markdown (bold, italic, lists, code, headings, blockquotes).
 * User messages stay as plain text.
 */
import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, Image, StyleSheet, Animated } from "react-native";
import { colors, fonts } from "../../theme/tokens";
import type { ChatMessage } from "../../types/api";
import { ChatElementRenderer } from "./ChatElementRenderer";

const FAVICON = require("../../../assets/Favicon1.jpg");

interface Props {
  message: ChatMessage;
  sessionId?: string;
}

/** Strip audio directives and unwrap bare $math$ inline so it reads naturally */
function cleanContent(text: string): string {
  return text
    .replace(/<<(?:SPEAK_PARA|KARAOKE|PRONUNCIATION):[\s\S]*?>>/g, "")
    .replace(/`(\$.+?\$)`/g, "$1")
    // Unwrap inline $...$ so "say $1/3$" becomes "say 1/3" — no LaTeX renderer on Android
    .replace(/\$([^$\n]+?)\$/g, "$1")
    .trim();
}

export function MessageBubble({ message, sessionId }: Props) {
  const isMe = message.from === "me";
  const isEmpty = !message.text && !message.statusText && (!message.elements || message.elements.length === 0);
  const isStatusOnly = !!message.statusText && !message.text && (!message.elements || message.elements.length === 0);
  const cleaned = useMemo(
    () => (message.text ? cleanContent(message.text) : ""),
    [message.text]
  );

  return (
    <View style={[styles.row, isMe ? styles.rowMe : styles.rowAi]}>
      {!isMe && (
        <View style={styles.avatarWrap}>
          <Image source={FAVICON} style={styles.avatarImg} resizeMode="cover" />
        </View>
      )}

      <View style={[styles.bubble, isMe ? styles.me : styles.ai, message.elements && message.elements.length > 0 && styles.richBubble]}>
        {isEmpty && message.isStreaming ? (
          <PulsingText text="Processing…" />
        ) : isStatusOnly ? (
          <PulsingText text={message.statusText!} />
        ) : isMe ? (
          <Text style={styles.textMe}>{message.text}</Text>
        ) : (
          <ChatElementRenderer
            elements={message.elements || [{ id: "fallback-txt", type: "text", content: cleaned }]}
            sessionId={sessionId}
            isReadOnly={!message.isStreaming}
          />
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
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  rowAi: { justifyContent: "flex-start" },
  rowMe: { justifyContent: "flex-end" },

  avatarWrap: {
    width: 28, height: 28, borderRadius: 14,
    overflow: "hidden", borderWidth: 1, borderColor: colors.border, flexShrink: 0,
  },
  avatarImg: { width: 28, height: 28 },

  bubble: {
    maxWidth: "80%",
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 16,
  },
  richBubble: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  ai: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 5,
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
  textMe: {
    fontFamily: fonts.dm,
    fontSize: 13,
    lineHeight: 19,
    color: "#fff",
  },
  statusText: {
    fontFamily: fonts.dmMedium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
});

/** Markdown styles for AI bubbles — mirrors MarkdownRenderer.tsx on the web */
const mdStyles = {
  body: {
    fontFamily: fonts.dm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
    fontFamily: fonts.dm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  heading1: {
    fontFamily: fonts.dmBold,
    fontSize: 17,
    color: "#1a3a2a",
    marginTop: 10,
    marginBottom: 4,
  },
  heading2: {
    fontFamily: fonts.dmBold,
    fontSize: 15,
    color: "#1a3a2a",
    marginTop: 8,
    marginBottom: 3,
  },
  heading3: {
    fontFamily: fonts.dmBold,
    fontSize: 13,
    color: "#1a3a2a",
    marginTop: 6,
    marginBottom: 2,
  },
  strong: {
    fontFamily: fonts.dmBold,
    color: colors.text,
  },
  em: {
    fontStyle: "italic" as const,
    color: colors.textMid,
  },
  bullet_list: { marginBottom: 6 },
  ordered_list: { marginBottom: 6 },
  list_item: {
    fontFamily: fonts.dm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
    marginBottom: 2,
  },
  code_inline: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: "#334155",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  fence: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
  },
  code_block: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.edGreen,
    paddingLeft: 10,
    marginLeft: 0,
    marginVertical: 6,
    backgroundColor: "#F0FBF6",
    borderRadius: 4,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 8,
  },
};
