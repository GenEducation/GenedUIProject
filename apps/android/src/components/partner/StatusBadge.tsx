import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../../theme/tokens";

type Status = "APPROVED" | "PENDING" | "active" | "in-progress" | "failed" | string;

interface Props {
  status: Status;
}

function resolveStyle(status: Status) {
  switch (status) {
    case "APPROVED":
    case "active":
      return { bg: colors.edGreen + "18", text: colors.edGreen, label: status === "APPROVED" ? "Approved" : "Active" };
    case "PENDING":
    case "in-progress":
      return { bg: colors.sun + "22", text: "#B45309", label: status === "PENDING" ? "Pending" : "In Progress" };
    case "failed":
      return { bg: colors.coral + "18", text: colors.coral, label: "Failed" };
    default:
      return { bg: colors.border, text: colors.textMuted, label: status };
  }
}

export function StatusBadge({ status }: Props) {
  const { bg, text, label } = resolveStyle(status);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  label: {
    fontFamily: fonts.dmBold,
    fontSize: 11,
  },
});
