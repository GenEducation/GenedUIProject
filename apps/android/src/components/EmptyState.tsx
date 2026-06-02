import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../theme/tokens";

interface Props {
  icon?: string;
  title?: string;
  message?: string;
  /** Fill the parent container vertically */
  fullScreen?: boolean;
}

export function EmptyState({
  icon = "📭",
  title = "Nothing here yet",
  message,
  fullScreen = true,
}: Props) {
  return (
    <View style={[styles.container, fullScreen && styles.full]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.msg}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  full: { flex: 1 },
  icon: { fontSize: 36, marginBottom: 4 },
  title: {
    fontFamily: fonts.dmBold,
    fontSize: 15,
    color: colors.textMid,
    textAlign: "center",
  },
  msg: {
    fontFamily: fonts.dm,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
});
