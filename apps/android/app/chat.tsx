import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";

type Msg = { from: "me" | "ai"; text: string };

const SEED: Msg[] = [
  { from: "me", text: "Can you explain how to solve 2x + 5 = 15?" },
  { from: "ai", text: "Of course! Subtract 5 from both sides → 2x = 10. Then divide by 2 → x = 5 ✅" },
  { from: "me", text: "Got it! What about 3x − 4 = 11?" },
];

export default function Chat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [draft, setDraft] = useState("");

  const send = () => {
    if (!draft.trim()) return;
    setMessages((m) => [...m, { from: "me", text: draft.trim() }]);
    setDraft("");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="m15 6-6 6 6 6" stroke={colors.text} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </Pressable>
          <View style={styles.avatar}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d="M12 3l2.2 4.8L19 9l-4.8 2.2L12 16l-2.2-4.8L5 9l4.8-1.2z" fill="#fff" />
            </Svg>
          </View>
          <View>
            <Text style={styles.name}>GenEd Tutor</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.online}>Online</Text>
            </View>
          </View>
        </View>

        {/* messages */}
        <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          <Text style={styles.day}>Today</Text>
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.from === "me" ? styles.me : styles.ai]}>
              <Text style={[styles.bubbleText, m.from === "me" && { color: "#fff" }]}>{m.text}</Text>
            </View>
          ))}
        </ScrollView>

        {/* input */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask anything…"
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable style={styles.send} onPress={send}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M4 12l16-8-6 8 6 8z" fill="#fff" />
            </Svg>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.genPurple, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.growth },
  online: { fontFamily: fonts.dm, fontSize: 11, color: colors.growth },
  messages: { padding: 16, gap: 12 },
  day: { textAlign: "center", fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted },
  bubble: { maxWidth: "82%", paddingVertical: 11, paddingHorizontal: 13, borderRadius: 16 },
  ai: { alignSelf: "flex-start", backgroundColor: colors.pageBg, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 5 },
  me: { alignSelf: "flex-end", backgroundColor: colors.genPurple, borderBottomRightRadius: 5 },
  bubbleText: { fontFamily: fonts.dm, fontSize: 13, lineHeight: 19, color: colors.text },
  inputBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.pageBg, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 16, height: 44, fontFamily: fonts.dm, fontSize: 13, color: colors.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.genPurple, alignItems: "center", justifyContent: "center" },
});
