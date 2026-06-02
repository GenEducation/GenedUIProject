import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../theme/tokens";

interface Props {
  message?: string;
  /** Fill the parent container vertically */
  fullScreen?: boolean;
}

export function LoadingState({ message, fullScreen = true }: Props) {
  return (
    <View style={[styles.container, fullScreen && styles.full]}>
      <ActivityIndicator size="large" color={colors.genPurple} />
      {message ? <Text style={styles.msg}>{message}</Text> : null}
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
  msg: {
    fontFamily: fonts.dm,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
});
