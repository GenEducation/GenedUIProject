/**
 * Post-period class report: attendance/completion stats, per-student status
 * table, follow-up list, and common learning gaps. Mirrors the web app's
 * src/features/lab/components/ClassReport.tsx.
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Users, CheckCircle2, TriangleAlert, UserX, Circle, TrendingDown, type LucideIcon } from "lucide-react-native";
import { labStore, useLabStore } from "@/store/useLabStore";
import { colors, fonts, radius } from "@/theme/tokens";
import type { ReportStatus } from "@/types/lab";

const STATUS_STYLES: Record<ReportStatus, { bg: string; text: string; icon: LucideIcon; label: string }> = {
  completed: { bg: colors.edGreen + "18", text: colors.edGreen, icon: CheckCircle2, label: "Completed" },
  incomplete: { bg: "#FFFBEB", text: "#92400E", icon: TriangleAlert, label: "Incomplete" },
  absent: { bg: colors.border, text: colors.textFaint, icon: UserX, label: "Absent" },
  not_served: { bg: colors.coral + "18", text: colors.coral, icon: Circle, label: "Not served" },
};

export function ClassReport({ slotId }: { slotId: string }) {
  const { report, isLoadingReport } = useLabStore();

  useEffect(() => {
    labStore.fetchReport(slotId);
  }, [slotId]);

  if (isLoadingReport && !report) {
    return <Text style={styles.loading}>Loading report…</Text>;
  }
  if (!report) return null;

  const { counts, students, interventions, common_gaps, allow_transcript_access } = report;

  const stats = [
    { label: "Total", value: counts.total, icon: Users, tint: colors.pageBg, iconColor: colors.text },
    { label: "Attended", value: counts.attended, icon: CheckCircle2, tint: "#E6F0FB", iconColor: "#1D4ED8" },
    { label: "Completed", value: counts.completed, icon: CheckCircle2, tint: colors.edGreen + "18", iconColor: colors.edGreen },
    { label: "Incomplete", value: counts.incomplete, icon: TriangleAlert, tint: "#FFFBEB", iconColor: "#92400E" },
    { label: "Absent/Not served", value: counts.absent + counts.not_served, icon: UserX, tint: colors.coral + "18", iconColor: colors.coral },
  ];

  return (
    <View>
      <View style={styles.statsGrid}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <View key={stat.label} style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: stat.tint }]}>
                <Icon size={14} color={stat.iconColor} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Class Roster</Text>
      <View style={styles.rosterCard}>
        {students.map((s, i) => {
          const style = STATUS_STYLES[s.status];
          const StatusIcon = style.icon;
          return (
            <View key={s.student_id} style={[styles.rosterRow, i > 0 && styles.rosterRowBorder]}>
              <Text style={styles.rosterName} numberOfLines={1}>#{s.roll_no} {s.student_name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
                <StatusIcon size={10} color={style.text} />
                <Text style={[styles.statusBadgeText, { color: style.text }]}>{style.label}</Text>
              </View>
              <Text style={styles.rosterDevice} numberOfLines={1}>{s.device_label || "—"}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Follow-up List</Text>
      {interventions.length === 0 ? (
        <Text style={styles.mutedNote}>Everyone completed the objective.</Text>
      ) : (
        <View style={{ gap: 6 }}>
          {interventions.map((s) => (
            <View key={s.student_id} style={styles.interventionRow}>
              <Text style={styles.interventionName}>{s.student_name}</Text>
              <Text style={styles.interventionStatus}>{STATUS_STYLES[s.status].label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.gapsHead}>
        <TrendingDown size={13} color={colors.textMuted} />
        <Text style={styles.sectionTitle}>Common Gaps</Text>
      </View>
      {common_gaps.length === 0 ? (
        <Text style={styles.mutedNote}>No common gaps detected.</Text>
      ) : (
        <View style={{ gap: 6 }}>
          {common_gaps.map((g) => (
            <View key={g.document_title} style={styles.gapCard}>
              <Text style={styles.gapTitle}>{g.document_title}</Text>
              <Text style={styles.gapMeta}>
                Avg mastery {Math.round(g.avg_mastery * 100)}% · {g.students} student{g.students === 1 ? "" : "s"}
              </Text>
            </View>
          ))}
        </View>
      )}

      {!allow_transcript_access ? (
        <Text style={styles.transcriptNote}>Transcript drill-down is disabled for this school.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { fontFamily: fonts.dmMedium, fontSize: 13, color: colors.textMuted },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  statCard: {
    flexBasis: "18.5%", flexGrow: 1, minWidth: 90,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    padding: 12, alignItems: "center", backgroundColor: "#fff",
  },
  statIconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  statValue: { fontFamily: fonts.nunito, fontSize: 22, color: colors.text },
  statLabel: { fontFamily: fonts.dmBold, fontSize: 9, color: colors.textFaint, textTransform: "uppercase", textAlign: "center", marginTop: 4 },

  sectionTitle: { fontFamily: fonts.dmBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted, marginBottom: 8, marginTop: 4 },

  rosterCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: "hidden", marginBottom: 20, backgroundColor: "#fff" },
  rosterRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  rosterRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rosterName: { flex: 1, fontFamily: fonts.dmBold, fontSize: 12.5, color: colors.text },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  statusBadgeText: { fontFamily: fonts.dmBold, fontSize: 10 },
  rosterDevice: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted, maxWidth: 80 },

  mutedNote: { fontFamily: fonts.dmMedium, fontSize: 12.5, color: colors.textMuted, marginBottom: 20 },
  interventionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFFBEB", borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9,
  },
  interventionName: { fontFamily: fonts.dmBold, fontSize: 12.5, color: "#92400E" },
  interventionStatus: { fontFamily: fonts.dmBold, fontSize: 10, color: "#92400E", textTransform: "uppercase" },

  gapsHead: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 20 },
  gapCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9 },
  gapTitle: { fontFamily: fonts.dmBold, fontSize: 12.5, color: colors.text },
  gapMeta: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted, marginTop: 3 },

  transcriptNote: { fontFamily: fonts.dmMedium, fontSize: 10.5, color: colors.textFaint, marginTop: 16 },
});
