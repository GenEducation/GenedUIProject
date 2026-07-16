import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../../theme/tokens";
import type { LabDeviceHealth } from "../../types/lab";

function resolveStyle(status: LabDeviceHealth) {
  switch (status) {
    case "ONLINE":
      return { bg: colors.edGreen + "18", text: colors.edGreen, label: "Online" };
    case "NEEDS_ATTENTION":
      return { bg: colors.sun + "22", text: "#B45309", label: "Needs attention" };
    case "OFFLINE":
    default:
      return { bg: colors.coral + "18", text: colors.coral, label: "Offline" };
  }
}

export function DeviceStatusBadge({ status }: { status: LabDeviceHealth }) {
  const { bg, text, label } = resolveStyle(status);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  label: { fontFamily: fonts.dmBold, fontSize: 11 },
});
