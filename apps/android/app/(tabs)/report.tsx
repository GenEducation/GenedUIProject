import React from "react";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard, fromProgressReport } from "@/components/report-card/ReportCard";
import { useReportData } from "@/hooks/useReportData";
import { useAuth } from "@/store/useAuthStore";
import { colors } from "@/theme/tokens";

export default function Report() {
  const { state } = useAuth();
  const { report, loading, error, refetch } = useReportData();

  if (loading) return <Screen background={colors.reportBg}><LoadingState message="Generating your report…" /></Screen>;
  if (error)   return <Screen background={colors.reportBg}><ErrorState message="Couldn't load your report." onRetry={refetch} /></Screen>;
  if (!report) return (
    <Screen background={colors.reportBg}>
      <EmptyState icon="📋" title="No report yet" message="Complete more sessions to generate your progress report." />
    </Screen>
  );

  const profile     = state.status === "authenticated" ? state.profile : null;
  const studentName = report.student_name ?? profile?.name ?? profile?.username ?? "Student";

  const data = fromProgressReport(report, studentName, profile?.grade, profile?.school_board);

  return (
    <Screen background={colors.reportBg}>
      <ReportCard data={data} />
    </Screen>
  );
}
