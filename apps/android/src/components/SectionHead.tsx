import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../theme/tokens";

interface Props {
  title: string;
  link?: string;
  onLinkPress?: () => void;
  style?: object;
}

export function SectionHead({ title, link, onLinkPress, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {link ? (
        <Text style={styles.link} onPress={onLinkPress}>
          {link}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.dmBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.textMuted,
  },
  link: {
    fontFamily: fonts.dmBold,
    fontSize: 12,
    color: colors.genPurple,
  },
});
