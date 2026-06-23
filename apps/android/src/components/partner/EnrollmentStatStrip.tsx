import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../../theme/tokens";
import type { EnrollmentStats } from "../../types/partner";

interface Props {
  stats: EnrollmentStats;
}

const STAT_CONFIG = [
  { icon: "👥", key: "total"    as const, label: "Total Students", bg: colors.genPurple + "12" },
  { icon: "✅", key: "approved" as const, label: "Approved",       bg: colors.edGreen   + "12" },
  { icon: "⏳", key: "pending"  as const, label: "Pending",        bg: colors.sun       + "18" },
];

export function EnrollmentStatStrip({ stats }: Props) {
  return (
    <View style={styles.row}>
      {STAT_CONFIG.map((s) => (
        <View key={s.key} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: s.bg }]}>
            <Text style={styles.icon}>{s.icon}</Text>
          </View>
          <View>
            <Text style={styles.value}>{stats[s.key]}</Text>
            <Text style={styles.label}>{s.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginBottom: 18 },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  icon:  { fontSize: 16 },
  value: { fontFamily: fonts.nunito, fontSize: 18, color: colors.text },
  label: { fontFamily: fonts.dmBold, fontSize: 9, color: colors.textMuted, marginTop: 2 },
});
