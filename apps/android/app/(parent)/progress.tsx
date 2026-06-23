/**
 * Analytics tab — Chapter mastery, Skill radar, and Skill progression
 * for the selected child. Mirrors the web app's StudentAnalyticsDashboard
 * in parent mode.
 */
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ChildSwitcherSheet } from "@/components/parent/ChildSwitcherSheet";
import { NotificationBell } from "@/components/parent/NotificationBell";
import { SpiderChart } from "@/components/analytics/SpiderChart";
import { ProgressionChart } from "@/components/analytics/ProgressionChart";
import { useLinkedChildren } from "@/hooks/useLinkedChildren";
import { useParentId } from "@/hooks/useParentId";
import { useParentStore } from "@/store/useParentStore";
import { studentService } from "@/services/studentService";
import { colors, fonts, radius } from "@/theme/tokens";
import type {
  ChapterMastery,
  SkillSummary,
  CGScore,
  SkillProgressionEntry,
  OverallHistoryPoint,
} from "@/types/api";

// ── Band helpers ──────────────────────────────────────────────────────────────

type Band = "PROFICIENT" | "DEVELOPING" | "NEEDS WORK";

const BAND: Record<Band, { color: string; bg: string }> = {
  "PROFICIENT": { color: "#059669", bg: "#ECFDF5" },
  "DEVELOPING": { color: "#D97706", bg: "#FFFBEB" },
  "NEEDS WORK": { color: "#E8635A", bg: "#FFF1F2" },
};

function getBand(pct: number): Band {
  if (pct >= 80) return "PROFICIENT";
  if (pct >= 50) return "DEVELOPING";
  return "NEEDS WORK";
}

function getIndexStatus(status?: string): { label: string; color: string } {
  if (!status) return { label: "—", color: colors.textMuted };
  const s = status.toLowerCase();
  if (s.includes("outperform") || s.includes("above"))
    return { label: "Outperforming", color: "#059669" };
  if (s.includes("grade") || s.includes("level"))
    return { label: "At Grade Level", color: "#1D4ED8" };
  return { label: "Struggling", color: "#E8635A" };
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, color: valueColor, progress, segmented,
}: {
  label: string; value: string; sub?: string;
  color?: string; progress?: number; segmented?: boolean;
}) {
  return (
    <View style={mc.card}>
      <Text style={mc.label}>{label}</Text>
      <Text style={[mc.value, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      {sub ? <Text style={mc.sub}>{sub}</Text> : null}
      {progress !== undefined && (
        <View style={mc.barBg}>
          {segmented ? (
            <>
              <View style={[mc.barSeg, { left: 0,     width: "33%", backgroundColor: "#EF4444" }]} />
              <View style={[mc.barSeg, { left: "33%", width: "34%", backgroundColor: "#3B82F6" }]} />
              <View style={[mc.barSeg, { left: "67%", width: "33%", backgroundColor: "#059669" }]} />
              <View style={[mc.barFlag, { left: `${Math.min(Math.max(progress, 0), 99)}%` as any }]} />
            </>
          ) : (
            <View style={[mc.barFill, {
              width: `${Math.min(progress, 100)}%` as any,
              backgroundColor: valueColor ?? colors.edGreen,
            }]} />
          )}
        </View>
      )}
    </View>
  );
}

const mc = StyleSheet.create({
  card:    { flex: 1, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  label:   { fontFamily: fonts.dmBold, fontSize: 9, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2 },
  value:   { fontFamily: fonts.nunito, fontSize: 22, color: colors.edGreen, lineHeight: 26 },
  sub:     { fontFamily: fonts.dm, fontSize: 10, color: colors.textMuted },
  barBg:   { height: 5, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden", marginTop: 6, position: "relative" as const },
  barFill: { height: "100%", borderRadius: 3 },
  barSeg:  { position: "absolute" as const, top: 0, bottom: 0 },
  barFlag: { position: "absolute" as const, top: -2, width: 2, height: 9, backgroundColor: "#1a3a2a", borderRadius: 1 },
});

// ── Chapter card ──────────────────────────────────────────────────────────────

function ChapterCard({ ch }: { ch: ChapterMastery }) {
  const raw  = ch.mastery_score ?? 0;
  const pct  = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
  const band = getBand(pct);
  const b    = BAND[band];
  const title    = ch.chapter_title ?? ch.document_title ?? "Chapter";
  const coverage = ch.completion_percentage ?? 0;
  const sessions = ch.study_count ?? (ch as any).sessions ?? 0;

  return (
    <View style={cc.card}>
      <View style={cc.top}>
        <Text style={cc.title} numberOfLines={2}>{title}</Text>
        <View style={[cc.badge, { backgroundColor: b.bg }]}>
          <Text style={[cc.badgeText, { color: b.color }]}>{band}</Text>
        </View>
      </View>

      <View style={cc.masteryRow}>
        <Text style={[cc.pct, { color: b.color }]}>{pct}%</Text>
        <Text style={cc.masteryLabel}>mastery</Text>
      </View>

      <View style={cc.barSection}>
        <View style={cc.barLabelRow}>
          <Text style={cc.barLabel}>Content Coverage</Text>
          <Text style={cc.barVal}>{Math.round(coverage)}%</Text>
        </View>
        <View style={cc.barBg}>
          <View style={[cc.barFill, {
            width: `${Math.min(coverage, 100)}%` as any,
            backgroundColor: b.color,
          }]} />
        </View>
      </View>

      <View style={cc.footer}>
        <Text style={cc.sessionText}>📚 {sessions} {sessions === 1 ? "session" : "sessions"}</Text>
      </View>
    </View>
  );
}

const cc = StyleSheet.create({
  card:        { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  top:         { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  title:       { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text, flex: 1, lineHeight: 20 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeText:   { fontFamily: fonts.dmBold, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase" },
  masteryRow:  { flexDirection: "row", alignItems: "baseline", gap: 5 },
  pct:         { fontFamily: fonts.nunito, fontSize: 28, lineHeight: 32 },
  masteryLabel:{ fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted },
  barSection:  { gap: 5 },
  barLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  barLabel:    { fontFamily: fonts.dmBold, fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  barVal:      { fontFamily: fonts.dmBold, fontSize: 10, color: colors.text },
  barBg:       { height: 5, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" },
  barFill:     { height: "100%", borderRadius: 3 },
  footer:      { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  sessionText: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted },
});

// ── CG list card (Skills tab, below radar) ────────────────────────────────────

function CGCard({ cg, index }: { cg: CGScore; index: number }) {
  const pct  = Math.round((cg.avg_mastery ?? 0) * 100);
  const band = getBand(pct);
  const b    = BAND[band];
  return (
    <View style={cgc.card}>
      <View style={cgc.left}>
        <Text style={cgc.idx}>CG-{index + 1}</Text>
        <Text style={cgc.name} numberOfLines={2}>{cg.cg_name}</Text>
      </View>
      <View style={cgc.right}>
        <Text style={[cgc.pct, { color: b.color }]}>{pct}%</Text>
        <View style={[cgc.badge, { backgroundColor: b.bg }]}>
          <Text style={[cgc.badgeText, { color: b.color }]}>{band}</Text>
        </View>
        <View style={cgc.barBg}>
          <View style={[cgc.barFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: b.color }]} />
        </View>
      </View>
    </View>
  );
}

const cgc = StyleSheet.create({
  card:      { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  left:      { flex: 1, gap: 3 },
  idx:       { fontFamily: fonts.dmBold, fontSize: 9, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  name:      { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text, lineHeight: 18 },
  right:     { width: 100, alignItems: "flex-end", gap: 4 },
  pct:       { fontFamily: fonts.nunito, fontSize: 20 },
  badge:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontFamily: fonts.dmBold, fontSize: 8, letterSpacing: 0.6, textTransform: "uppercase" },
  barBg:     { width: "100%", height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: "hidden" },
  barFill:   { height: "100%", borderRadius: 2 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

type AnalyticsTab = "chapters" | "skills" | "progression";

const TABS: { key: AnalyticsTab; label: string }[] = [
  { key: "chapters",    label: "Chapters"    },
  { key: "skills",      label: "Skills"      },
  { key: "progression", label: "Progression" },
];

export default function ProgressScreen() {
  const parentId = useParentId();
  const { approvedChildren, loading: childrenLoading } = useLinkedChildren();
  const { selectedChildId } = useParentStore();
  const [switcherOpen, setSwitcherOpen]       = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [activeTab, setActiveTab]             = useState<AnalyticsTab>("chapters");
  const [loading, setLoading]                 = useState(false);
  const [refreshing, setRefreshing]           = useState(false);
  const [progLoading, setProgLoading]         = useState(false);

  const [subjects, setSubjects]             = useState<string[]>([]);
  const [summary, setSummary]               = useState<SkillSummary | null>(null);
  const [chapters, setChapters]             = useState<ChapterMastery[]>([]);
  const [cgScores, setCGScores]             = useState<CGScore[]>([]);
  const [skillProg, setSkillProg]           = useState<SkillProgressionEntry[]>([]);
  const [overallHistory, setOverallHistory] = useState<OverallHistoryPoint[]>([]);

  const selectedChild = useMemo(
    () => approvedChildren.find((c) => c.id === selectedChildId) ?? approvedChildren[0] ?? null,
    [approvedChildren, selectedChildId]
  );

  // ── Subjects — same approach as web: extract from available-agents ──────────
  React.useEffect(() => {
    if (!selectedChild?.id) return;
    let cancelled = false;
    (async () => {
      try {
        // Primary: available-agents (same as web's useAnalyticsStore)
        const data = await studentService.fetchAvailableAgents(selectedChild.id);
        const names = new Set<string>();
        (data?.partners ?? []).forEach((p: any) => {
          (p.subjects ?? []).forEach((s: any) => {
            const name = s.subject ?? s.name;
            if (name && name !== "General") names.add(name);
          });
        });
        const list = Array.from(names).sort();
        if (!cancelled && list.length > 0) {
          setSubjects(list);
          setSelectedSubject((prev) => prev || list[0]);
          return;
        }
      } catch {}

      // Fallback: /students/{id}/subjects
      try {
        const res = await studentService.fetchAnalyticsSubjects(selectedChild.id);
        const list: string[] = Array.isArray(res)
          ? res.map((s: any) => s.subject ?? s)
          : ((res as any)?.subjects ?? []).map((s: any) => s.subject ?? s);
        if (!cancelled && list.length > 0) {
          setSubjects(list);
          setSelectedSubject((prev) => prev || list[0]);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [selectedChild?.id]);

  // ── Core analytics (summary + chapters + CGs) ────────────────────────────
  const loadCore = useCallback(async (subject: string, isRefresh = false) => {
    if (!selectedChild?.id || !subject) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [sumR, chapR, cgR] = await Promise.allSettled([
        studentService.fetchSkillSummary(selectedChild.id, subject),
        studentService.fetchChapterMastery(selectedChild.id, subject),
        studentService.fetchCGScores(selectedChild.id, subject),
      ]);
      if (sumR.status  === "fulfilled") setSummary(sumR.value);
      if (chapR.status === "fulfilled") setChapters(Array.isArray(chapR.value) ? chapR.value : []);
      if (cgR.status   === "fulfilled") setCGScores(Array.isArray(cgR.value)  ? cgR.value  : []);
    } catch {}
    isRefresh ? setRefreshing(false) : setLoading(false);
  }, [selectedChild?.id]);

  // ── Progression (lazy — only when tab is opened) ─────────────────────────
  const loadProgression = useCallback(async (subject: string) => {
    if (!selectedChild?.id || !subject) return;
    setProgLoading(true);
    try {
      const [progR, histR] = await Promise.allSettled([
        studentService.fetchSkillProgression(selectedChild.id, subject),
        studentService.fetchSkillProfileHistory(selectedChild.id, subject),
      ]);
      if (progR.status === "fulfilled") setSkillProg(Array.isArray(progR.value) ? progR.value : []);
      if (histR.status === "fulfilled") setOverallHistory(histR.value?.history ?? []);
    } catch {}
    setProgLoading(false);
  }, [selectedChild?.id]);

  React.useEffect(() => {
    if (selectedSubject) loadCore(selectedSubject);
  }, [selectedSubject, loadCore]);

  React.useEffect(() => {
    if (activeTab === "progression" && selectedSubject) loadProgression(selectedSubject);
  }, [activeTab, selectedSubject, loadProgression]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (childrenLoading && approvedChildren.length === 0) {
    return <Screen background={colors.pageBg}><LoadingState message="Loading…" /></Screen>;
  }
  if (approvedChildren.length === 0) {
    return (
      <Screen background={colors.pageBg}>
        <EmptyState icon="📊" title="No approved children" message="Approve a child link from the Children tab first." />
      </Screen>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const overallPct  = summary ? Math.round((summary.overall_score ?? 0) * 100) : null;
  const indexStatus = getIndexStatus(summary?.skill_index_status);
  const indexProg   = summary?.skill_index_progress ?? 0;
  const spiderData  = cgScores.map((cg) => ({
    label: cg.cg_name,
    value: Math.round((cg.avg_mastery ?? 0) * 100),
  }));

  return (
    <Screen background={colors.pageBg}>
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

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCore(selectedSubject, true)}
            tintColor={colors.edGreen}
          />
        }
      >
        <Text style={s.screenTitle}>Analytics</Text>

        {/* Subject pills */}
        {subjects.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
            {subjects.map((sub) => {
              const active = sub === selectedSubject;
              return (
                <Pressable
                  key={sub}
                  style={[s.pill, active && s.pillActive]}
                  onPress={() => setSelectedSubject(sub)}
                >
                  <Text style={[s.pillText, active && s.pillTextActive]}>
                    {sub.charAt(0).toUpperCase() + sub.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {loading ? (
          <ActivityIndicator color={colors.edGreen} style={{ marginTop: 40 }} size="large" />
        ) : (
          <>
            {/* Metric cards */}
            {summary && (
              <View style={s.metricsRow}>
                <MetricCard
                  label="Overall Mastery"
                  value={overallPct !== null ? `${overallPct}%` : "—"}
                  color={colors.edGreen}
                  progress={overallPct ?? 0}
                />
                <MetricCard
                  label="Skill Index"
                  value={summary.skill_index != null ? summary.skill_index.toFixed(2) : "—"}
                  sub={indexStatus.label}
                  color={indexStatus.color}
                  progress={indexProg}
                  segmented
                />
                <MetricCard
                  label="Sessions"
                  value={String(summary.session_count ?? 0)}
                  sub="this month"
                  color={colors.genBlue}
                />
              </View>
            )}

            {/* Tab bar */}
            <View style={s.tabBar}>
              {TABS.map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[s.tabBtn, activeTab === tab.key && s.tabBtnActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Chapters tab ── */}
            {activeTab === "chapters" && (
              chapters.length > 0 ? (
                <View style={s.list}>
                  {chapters.map((ch, i) => (
                    <ChapterCard key={ch.document_title ?? i} ch={ch} />
                  ))}
                </View>
              ) : (
                <EmptyCard text={`No chapter data for ${selectedSubject} yet.`} />
              )
            )}

            {/* ── Skills tab — radar + CG list ── */}
            {activeTab === "skills" && (
              cgScores.length > 0 ? (
                <View style={s.list}>
                  {/* Radar chart */}
                  {spiderData.length >= 3 && (
                    <View style={s.chartCard}>
                      <Text style={s.chartCardTitle}>Competency Radar</Text>
                      <SpiderChart data={spiderData} />
                    </View>
                  )}
                  {/* CG breakdown list */}
                  <Text style={s.subSectionTitle}>Competency Breakdown</Text>
                  {cgScores.map((cg, i) => (
                    <CGCard key={cg.cg_id ?? i} cg={cg} index={i} />
                  ))}
                </View>
              ) : (
                <EmptyCard text={`No skill data for ${selectedSubject} yet.`} />
              )
            )}

            {/* ── Progression tab — line chart ── */}
            {activeTab === "progression" && (
              progLoading ? (
                <ActivityIndicator color={colors.edGreen} style={{ marginTop: 40 }} size="large" />
              ) : (
                <View style={s.chartCard}>
                  <ProgressionChart
                    skillProgression={skillProg}
                    overallHistory={overallHistory}
                  />
                </View>
              )
            )}
          </>
        )}
      </ScrollView>

      <ChildSwitcherSheet
        visible={switcherOpen}
        children={approvedChildren}
        selectedChildId={selectedChildId}
        onClose={() => setSwitcherOpen(false)}
      />
    </Screen>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={s.emptyCard}>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  switcher:    { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 16 },
  childAvatar: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.edGreen + "20", alignItems: "center", justifyContent: "center" },
  childInitial:{ fontFamily: fonts.nunito, fontSize: 14, color: colors.edGreen },
  childName:   { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text, flex: 1 },
  chevron:     { fontSize: 18, color: colors.textMuted },

  content:     { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  screenTitle: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMid, textTransform: "uppercase", letterSpacing: 1 },

  pillRow:         { gap: 8, paddingBottom: 2 },
  pill:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  pillActive:      { borderColor: colors.edGreen, backgroundColor: colors.edGreen + "12" },
  pillText:        { fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMid },
  pillTextActive:  { color: colors.edGreen },

  metricsRow:  { flexDirection: "row", gap: 8 },

  tabBar:      { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 3, gap: 3 },
  tabBtn:      { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  tabBtnActive:{ backgroundColor: colors.edGreen },
  tabText:     { fontFamily: fonts.dmBold, fontSize: 11, color: colors.textMuted },
  tabTextActive:{ color: "#fff" },

  list:            { gap: 10 },
  subSectionTitle: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 },

  chartCard:      { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 14 },
  chartCardTitle: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMid, textTransform: "uppercase", letterSpacing: 0.8 },

  emptyCard: { backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: "center" },
  emptyText: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
