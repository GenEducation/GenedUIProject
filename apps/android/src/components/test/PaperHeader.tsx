/**
 * PaperHeader (intro card with marks/time/instructions) + SectionDivider.
 * Rendered as FlatList headers in the runner.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../../theme/tokens";
import type { PaperMeta, PaperSectionMeta } from "../../types/test";

export function PaperHeader({ title, subject, grade, paperMeta }: { title: string; subject: string; grade: number; paperMeta: PaperMeta | null }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>
        {subject ? `${subject} · ` : ""}Grade {grade}
      </Text>
      {paperMeta ? (
        <View style={styles.row}>
          {paperMeta.total_marks ? <Pill label={`${paperMeta.total_marks} marks`} /> : null}
          {paperMeta.suggested_time_minutes ? <Pill label={`${paperMeta.suggested_time_minutes} min`} /> : null}
        </View>
      ) : null}
      {paperMeta?.general_instructions?.length ? (
        <View style={styles.instructions}>
          {paperMeta.general_instructions.map((ins, i) => (
            <Text key={i} style={styles.insText}>• {ins}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function SectionDivider({ label, meta }: { label: string; meta?: PaperSectionMeta }) {
  return (
    <View style={styles.divider}>
      <Text style={styles.divLabel}>SECTION {label}</Text>
      {meta?.title ? <Text style={styles.divTitle}>{meta.title}</Text> : null}
      {meta ? (
        <Text style={styles.divMeta}>
          {meta.question_count} questions · {meta.marks_per_question}
        </Text>
      ) : null}
    </View>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8, marginBottom: 4 },
  title: { fontFamily: fonts.nunito, fontSize: 20, color: colors.text },
  meta: { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMuted },
  row: { flexDirection: "row", gap: 8, marginTop: 4 },
  pill: { backgroundColor: colors.genPurple + "12", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.genPurple },
  instructions: { marginTop: 6, gap: 3 },
  insText: { fontFamily: fonts.dm, fontSize: 12, lineHeight: 18, color: colors.textMid },
  divider: { paddingVertical: 6, gap: 2 },
  divLabel: { fontFamily: fonts.dmBold, fontSize: 12, letterSpacing: 1.2, color: colors.genPurple },
  divTitle: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  divMeta: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted },
});
