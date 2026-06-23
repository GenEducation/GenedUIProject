/**
 * Teacher Report Card — read-only view of a student's report.
 * Pushed full-screen from the teacher portal when tapping "View Report Card".
 * Uses the same ReportCard component as the parent portal.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, BarChart2 } from "lucide-react-native";
import { ReportCard, fromParentReport } from "@/components/report-card/ReportCard";
import { teacherService } from "@/services/teacherService";
import { useTeacherId } from "@/hooks/useTeacherId";
import { colors, fonts } from "@/theme/tokens";

export default function TeacherReportScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const teacherId = useTeacherId();

  const { studentId, studentName } = useLocalSearchParams<{
    studentId: string;
    studentName?: string;
  }>();

  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = async () => {
    if (!teacherId || !studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await teacherService.getStudentReport(teacherId, studentId);
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [teacherId, studentId]);

  const name = studentName ?? "Student";

  const hasContent = data && (
    (data.subjects?.length > 0) || data.progress_report || (data.total_sessions > 0)
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <BarChart2 size={16} color={colors.navy} />
          <Text style={styles.headerTitle} numberOfLines={1}>{name}'s Report</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Read-only badge */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>📋 Read-only — viewing {name}'s report card</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.navy} size="large" />
          <Text style={styles.loaderText}>Generating report card…</Text>
          <Text style={styles.loaderSub}>Aggregating data across all subjects</Text>
        </View>
      ) : error ? (
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.navy} />}
        >
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </ScrollView>
      ) : !hasContent ? (
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.navy} />}
        >
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No report yet</Text>
          <Text style={styles.emptyMsg}>
            {name.split(" ")[0]}'s report will appear here after the first learning session.
          </Text>
        </ScrollView>
      ) : (
        <ReportCard
          data={fromParentReport(
            data,
            name,
            data?.profile?.grade,
            data?.profile?.board ?? data?.profile?.school_board,
          )}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={load} tintColor={colors.navy} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.reportBg ?? colors.pageBg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.pageBg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  headerTitle: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text },

  banner: {
    backgroundColor: colors.navy + "10",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.navy + "20",
  },
  bannerText: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.navy },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },

  loaderText: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  loaderSub:  { fontFamily: fonts.dm,     fontSize: 12, color: colors.textMuted },

  errorText: { fontFamily: fonts.dm, fontSize: 14, color: colors.coral, textAlign: "center" },
  retryBtn:  { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.navy, borderRadius: 10 },
  retryLabel: { fontFamily: fonts.dmBold, fontSize: 14, color: "#fff" },

  emptyIcon:  { fontSize: 40 },
  emptyTitle: { fontFamily: fonts.dmBold,   fontSize: 16, color: colors.text,     textAlign: "center" },
  emptyMsg:   { fontFamily: fonts.dm,       fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
