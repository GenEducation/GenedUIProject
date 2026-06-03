import React, { useState } from "react";
import { View, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, fonts } from "../../theme/tokens";

interface Props {
  onSend: (text: string) => void;
  onVoicePress?: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onVoicePress, disabled = false }: Props) {
  const [draft, setDraft] = useState("");

  const handleSend = () => {
    if (!draft.trim() || disabled) return;
    onSend(draft.trim());
    setDraft("");
  };

  const hasDraft = draft.trim().length > 0;

  return (
    <View style={styles.row}>
      {/* Mic button */}
      {onVoicePress && !hasDraft && (
        <Pressable style={styles.micBtn} onPress={onVoicePress} disabled={disabled}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke={colors.genPurple} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4m-4 0h8" stroke={colors.genPurple} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      )}

      <TextInput
        style={styles.input}
        placeholder="Ask anything…"
        placeholderTextColor={colors.textMuted}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={handleSend}
        returnKeyType="send"
        editable={!disabled}
        multiline
      />

      <Pressable
        style={[styles.sendBtn, (!hasDraft || disabled) && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!hasDraft || disabled}
      >
        {disabled ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M4 12l16-8-6 8 6 8z" fill="#fff" />
          </Svg>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    backgroundColor: colors.pageBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fonts.dm,
    fontSize: 13,
    color: colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.genPurple,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.genPurple + "12",
    borderWidth: 1.5,
    borderColor: colors.genPurple + "30",
    alignItems: "center",
    justifyContent: "center",
  },
});
