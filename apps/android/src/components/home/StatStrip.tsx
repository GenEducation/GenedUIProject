import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../../theme/tokens";
import type { HomeStats } from "../../hooks/useHomeData";

interface Props {
  stats: HomeStats;
}

const STAT_CONFIG = [
  { icon: "🔥", key: "streak" as const,     unit: "Day Streak", bg: "#F0AD4E14" },
  { icon: "📚", key: "sessions" as const,    unit: "Sessions",   bg: "#4A90D912" },
  { icon: "⭐", key: "bestStreak" as const,  unit: "Best Streak", bg: "#2D6A4F12" },
];

export function StatStrip({ stats }: Props) {
  return (
    <View style={styles.row}>
      {STAT_CONFIG.map((s) => (
        <View key={s.unit} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: s.bg }]}>
            <Text style={styles.icon}>{s.icon}</Text>
          </View>
          <View>
            <Text style={styles.value}>{stats[s.key]}</Text>
            <Text style={styles.unit}>{s.unit}</Text>
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
  icon: { fontSize: 16 },
  value: { fontFamily: fonts.nunito, fontSize: 18, color: colors.text },
  unit: {
    fontFamily: fonts.dmBold,
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 3,
  },
});
