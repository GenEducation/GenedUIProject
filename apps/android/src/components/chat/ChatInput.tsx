import React, { useState } from "react";
import { View, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, fonts } from "../../theme/tokens";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: Props) {
  const [draft, setDraft] = useState("");

  const handleSend = () => {
    if (!draft.trim() || disabled) return;
    onSend(draft.trim());
    setDraft("");
  };

  const hasDraft = draft.trim().length > 0;

  return (
    <View style={styles.row}>

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
            <Path d="M12 19V5M5 12l7-7 7 7" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
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
});
