import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors, fonts } from "@/theme/tokens";
import type { TeacherOverview } from "@/types/teacher";

interface Props {
  overview: TeacherOverview | null;
  isLoading: boolean;
}

interface Chip {
  label: string;
  value: number | string;
  accent: string;
}

export function TeacherStatChips({ overview, isLoading }: Props) {
  const chips: Chip[] = [
    { label: "Total",    value: overview?.total_students ?? 0, accent: colors.navy },
    { label: "Pending",  value: overview?.pending ?? 0,        accent: colors.sun },
    { label: "Approved", value: overview?.approved ?? 0,       accent: colors.emerald },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((c) => (
        <View key={c.label} style={[styles.chip, { borderLeftColor: c.accent }]}>
          <Text style={styles.chipLabel}>{c.label}</Text>
          {isLoading ? (
            <View style={styles.skeleton} />
          ) : (
            <Text style={[styles.chipValue, { color: c.accent }]}>{c.value}</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 10, paddingVertical: 4 },
  chip: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 4,
    minWidth: 100,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  chipLabel: {
    fontFamily: fonts.dmBold,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 4,
  },
  chipValue: {
    fontFamily: fonts.nunito,
    fontSize: 28,
    lineHeight: 32,
  },
  skeleton: {
    height: 28,
    width: 40,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
});
