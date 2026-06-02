import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, fonts, radius } from "../theme/tokens";

interface Props {
  message?: string;
  onRetry?: () => void;
  /** Fill the parent container vertically */
  fullScreen?: boolean;
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
  fullScreen = true,
}: Props) {
  return (
    <View style={[styles.container, fullScreen && styles.full]}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.msg}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.btn} onPress={onRetry}>
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  full: { flex: 1 },
  icon: { fontSize: 32 },
  msg: {
    fontFamily: fonts.dm,
    fontSize: 14,
    color: colors.textMid,
    textAlign: "center",
    lineHeight: 20,
  },
  btn: {
    marginTop: 4,
    backgroundColor: colors.genPurple,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  btnText: {
    fontFamily: fonts.dmBold,
    fontSize: 13,
    color: "#fff",
  },
});
