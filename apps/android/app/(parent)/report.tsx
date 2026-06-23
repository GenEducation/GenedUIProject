import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ChildSwitcherSheet } from "@/components/parent/ChildSwitcherSheet";
import { NotificationBell } from "@/components/parent/NotificationBell";
import { ReportCard, fromParentReport } from "@/components/report-card/ReportCard";
import { useLinkedChildren } from "@/hooks/useLinkedChildren";
import { useParentId } from "@/hooks/useParentId";
import { useParentStore } from "@/store/useParentStore";
import { useApi } from "@/hooks/useApi";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { parentService } from "@/services/parentService";
import { colors, fonts } from "@/theme/tokens";

export default function ReportCardScreen() {
  const parentId = useParentId();
  const { approvedChildren, loading: childrenLoading } = useLinkedChildren();
  const { selectedChildId } = useParentStore();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const selectedChild = useMemo(
    () => approvedChildren.find((c) => c.id === selectedChildId) ?? approvedChildren[0] ?? null,
    [approvedChildren, selectedChildId]
  );

  const fetchReport = useMemo(
    () => (_signal: AbortSignal) =>
      parentId && selectedChild
        ? parentService.fetchParentReport(parentId, selectedChild.id)
        : Promise.resolve(null),
    [parentId, selectedChild?.id]
  );
  const { data: rawData, loading, refetch } = useApi(fetchReport, [parentId, selectedChild?.id]);
  useRefreshOnFocus(refetch);

  if (childrenLoading && approvedChildren.length === 0) {
    return <Screen background={colors.reportBg}><LoadingState message="Loading…" /></Screen>;
  }
  if (approvedChildren.length === 0) {
    return (
      <Screen background={colors.reportBg}>
        <EmptyState icon="📋" title="No approved children" message="Approve a child link from the Children tab first." />
      </Screen>
    );
  }

  const d = rawData as any;
  const hasContent = d && (
    (d.subjects?.length > 0) || d.progress_report || (d.total_sessions > 0)
  );

  return (
    <Screen background={colors.reportBg}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.switcher} onPress={() => setSwitcherOpen(true)}>
          <View style={s.childAvatar}>
            <Text style={s.childInitial}>{selectedChild?.initials ?? "?"}</Text>
          </View>
          <Text style={s.childName} numberOfLines={1}>{selectedChild?.name ?? "—"}</Text>
          <Text style={s.chevron}>⌄</Text>
        </Pressable>
        <NotificationBell userId={parentId} />
      </View>

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.edGreen} size="large" />
          <Text style={s.loaderText}>Generating report card…</Text>
          <Text style={s.loaderSub}>Aggregating data across all subjects</Text>
        </View>
      ) : !hasContent ? (
        <ScrollView
          contentContainerStyle={s.emptyWrap}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.edGreen} />}
        >
          <EmptyState
            icon="📋"
            title="No report yet"
            message={`${selectedChild?.name?.split(" ")[0] ?? "Their"}'s report will appear here after the first learning session.`}
          />
        </ScrollView>
      ) : (
        <ReportCard
          data={fromParentReport(
            d,
            selectedChild?.name ?? d?.profile?.name ?? "Student",
            d?.profile?.grade ?? selectedChild?.grade,
            d?.profile?.board ?? d?.profile?.school_board,
          )}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.edGreen} />
          }
        />
      )}

      <ChildSwitcherSheet
        visible={switcherOpen}
        children={approvedChildren}
        selectedChildId={selectedChildId}
        onClose={() => setSwitcherOpen(false)}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  switcher:     { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 16 },
  childAvatar:  { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.edGreen + "20", alignItems: "center", justifyContent: "center" },
  childInitial: { fontFamily: fonts.nunito, fontSize: 14, color: colors.edGreen },
  childName:    { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text, flex: 1 },
  chevron:      { fontSize: 18, color: colors.textMuted },
  loader:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderText:   { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  loaderSub:    { fontFamily: fonts.dm, fontSize: 12, color: colors.textMuted },
  emptyWrap:    { flexGrow: 1, justifyContent: "center" },
});
