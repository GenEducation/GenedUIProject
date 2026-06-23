import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, fonts } from "../../theme/tokens";
import { StatusBadge } from "./StatusBadge";
import type { LinkedChild } from "../../types/parent";

interface Props {
  child: LinkedChild;
  onPress: (child: LinkedChild) => void;
}

export function ChildRow({ child, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(child)}
    >
      <View style={styles.avatar}>
        <Text style={styles.initials}>{child.initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{child.name}</Text>
        {child.grade ? (
          <Text style={styles.grade}>Grade {child.grade}</Text>
        ) : null}
      </View>
      <StatusBadge status={child.status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.pageBg },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.edGreen + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontFamily: fonts.nunito, fontSize: 14, color: colors.edGreen },
  info:     { flex: 1 },
  name:     { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  grade:    { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
