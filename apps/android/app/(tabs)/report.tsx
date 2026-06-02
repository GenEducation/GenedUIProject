import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { useReportData } from "@/hooks/useReportData";
import { useAuth } from "@/store/useAuthStore";
import { colors, fonts } from "@/theme/tokens";

/** Display-only band color config — not data */
const BAND_STYLE: Record<string, {
  color: string; bg: string; bd: string; label: string;
}> = {
  Advanced:   { color: colors.advanced,    bg: "#F0FDF4",  bd: "#BBF7D0",  label: "Advanced"   },
  Proficient: { color: colors.proficient,  bg: colors.proficientBg,  bd: colors.proficientBd,  label: "Proficient"  },
  Approaching:{ color: colors.approaching, bg: colors.approachingBg, bd: colors.approachingBd, label: "Approaching" },
  Developing: { color: colors.developing,  bg: colors.developingBg,  bd: colors.developingBd,  label: "Developing"  },
};

const DEFAULT_BAND = BAND_STYLE["Proficient"];

export default function Report() {
  const { state } = useAuth();
  const { report, loading, error, refetch } = useReportData();

  if (loading) {
    return (
      <Screen background={colors.reportBg}>
        <LoadingState message="Generating your report…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen background={colors.reportBg}>
        <ErrorState message="Couldn't load your report." onRetry={refetch} />
      </Screen>
    );
  }

  if (!report) {
    return (
      <Screen background={colors.reportBg}>
        <EmptyState
          icon="📋"
          title="No report yet"
          message="Complete more sessions to generate your progress report."
        />
      </Screen>
    );
  }

  const profileState =
    state.status === "authenticated" ? state.profile : null;

  const studentName = report.student_name ?? profileState?.name ?? profileState?.username ?? "—";
  const grade       = report.grade ?? profileState?.grade;
  const board       = profileState?.school_board;
  const sessions    = report.total_sessions ?? "—";
  const period      = report.period ?? "—";
  const reportNo    = report.report_number ?? "—";

  const kpis     = report.subject_kpis ?? [];
  const chapters = report.chapters ?? [];
  const sections = report.sections ?? [];

  return (
    <Screen background={colors.reportBg}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header card */}
        <View style={styles.head}>
          <View style={styles.headTop}>
            <View style={styles.brand}>
              <View style={styles.mark}>
                <Text style={styles.markText}>G</Text>
              </View>
              <Text style={styles.brandText}>GenEducation</Text>
            </View>
            <Text style={styles.rep}>Report No. {reportNo}</Text>
          </View>
          <Text style={styles.pre}>LEARNER REPORT · {period.toUpperCase()}</Text>
          <Text style={styles.title}>
            {studentName},{" "}
            <Text style={styles.titleEm}>
              {report.narrative?.split(".")[0]?.toLowerCase() ?? "your progress report."}
            </Text>
          </Text>
          {report.narrative ? (
            <Text style={styles.deck}>{report.narrative}</Text>
          ) : null}
          <View style={styles.meta}>
            <Meta k="Student" v={studentName} />
            {grade ? <Meta k="Grade" v={`${grade}${board ? ` · ${board}` : ""}`} /> : null}
            <Meta k="Sessions" v={String(sessions)} />
            {report.issued ? <Meta k="Issued" v={report.issued} /> : null}
          </View>
        </View>

        {/* KPIs section */}
        {kpis.length > 0 ? (
          <View style={styles.sec}>
            <SecHead n="1" title="At a glance." sub="Subject scores and proficiency bands." />
            <View style={styles.sBody}>
              <View style={styles.kpi}>
                {kpis.map((k, i) => {
                  const band = BAND_STYLE[k.band] ?? DEFAULT_BAND;
                  return (
                    <View
                      key={k.subject}
                      style={[styles.kpiCell, i === 0 && styles.kpiCellBorder]}
                    >
                      <Text style={styles.kpiK}>{k.subject.toUpperCase()}</Text>
                      <Text style={styles.kpiV}>
                        {k.score}
                        <Text style={styles.kpiSmall}>%</Text>
                      </Text>
                      <Text style={[styles.kpiS, { color: band.color }]}>{k.band}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}

        {/* Chapters section */}
        {chapters.length > 0 ? (
          <View style={styles.sec}>
            <SecHead n={kpis.length > 0 ? "2" : "1"} title="Chapter progress." sub="Mastery by chapter." />
            <View style={styles.sBody}>
              {chapters.map((c) => {
                const band = BAND_STYLE[
                  c.mastery >= 80 ? "Advanced"
                    : c.mastery >= 60 ? "Proficient"
                    : c.mastery >= 40 ? "Approaching"
                    : "Developing"
                ] ?? DEFAULT_BAND;
                return (
                  <View key={c.chapter_title} style={styles.chap}>
                    <View style={styles.cTop}>
                      <Text style={styles.cT}>{c.chapter_title}</Text>
                      <View style={[styles.chip, { backgroundColor: band.bg, borderColor: band.bd }]}>
                        <Text style={[styles.chipText, { color: band.color }]}>{band.label}</Text>
                      </View>
                    </View>
                    <View style={styles.bar}>
                      <View
                        style={{ width: `${c.mastery}%`, height: "100%", backgroundColor: band.color, borderRadius: 2 }}
                      />
                    </View>
                    <View style={styles.cRow}>
                      {c.sessions ? (
                        <Text style={styles.cL}>{c.sessions} sessions</Text>
                      ) : <Text style={styles.cL}>—</Text>}
                      <Text style={styles.cPct}>{c.mastery}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Dynamic narrative sections */}
        {sections.map((sec, idx) => (
          <View key={sec.title} style={styles.sec}>
            <SecHead
              n={String((kpis.length > 0 ? 2 : 1) + (chapters.length > 0 ? 1 : 0) + idx)}
              title={sec.title}
              sub=""
            />
            <View style={styles.sBody}>
              <Text style={styles.p}>{sec.body}</Text>
            </View>
          </View>
        ))}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.btnDark]}>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 3v12M8 11l4 4 4-4M5 19h14"
                stroke="#fff"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.btnDarkText}>Download PDF</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnOut]}>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
              <Path
                d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v6H8z"
                stroke={colors.navy}
                strokeWidth={1.7}
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.btnOutText}>Print</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <Text style={styles.metaItem}>
      {k}
      <Text style={styles.metaB}> {v}</Text>
    </Text>
  );
}

function SecHead({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <View style={styles.sHead}>
      <View style={styles.n}>
        <Text style={styles.nText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sTitle}>{title}</Text>
        {sub ? <Text style={styles.sSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const surface = { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border } as const;

const styles = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24 },

  head: { ...surface, borderRadius: 12, padding: 18, marginBottom: 14 },
  headTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 6 },
  mark: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { color: "#fff", fontFamily: fonts.dmBold, fontSize: 12 },
  brandText: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.ink },
  rep: { fontFamily: fonts.mono, fontSize: 9, color: colors.muted },
  pre: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 2,
    color: colors.proficient,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 25,
    color: colors.ink,
    lineHeight: 28,
    marginBottom: 8,
  },
  titleEm: { fontFamily: fonts.serifItalic, color: colors.proficient },
  deck: {
    fontFamily: fonts.dm,
    fontSize: 12.5,
    color: colors.ink2,
    lineHeight: 19,
    marginBottom: 14,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaItem: { fontFamily: fonts.dm, fontSize: 11, color: colors.muted },
  metaB: { fontFamily: fonts.dmBold, color: colors.ink },

  sec: { ...surface, borderRadius: 12, marginBottom: 12, overflow: "hidden" },
  sHead: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  n: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  nText: { color: "#fff", fontFamily: fonts.dmBold, fontSize: 13 },
  sTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink },
  sSub: { fontFamily: fonts.dm, fontSize: 12, color: colors.muted, marginTop: 3 },
  sBody: { padding: 16 },
  p: { fontFamily: fonts.dm, fontSize: 13, color: colors.ink2, lineHeight: 21 },

  kpi: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  kpiCell: { flex: 1, padding: 12 },
  kpiCellBorder: { borderRightWidth: 1, borderRightColor: colors.border },
  kpiK: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: colors.muted,
    letterSpacing: 1,
  },
  kpiV: { fontFamily: fonts.serif, fontSize: 23, color: colors.ink, marginTop: 6 },
  kpiSmall: { fontFamily: fonts.dm, fontSize: 11, color: colors.muted },
  kpiS: { fontFamily: fonts.dm, fontSize: 11, marginTop: 4 },

  chap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 13,
    marginBottom: 10,
  },
  cTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },
  cT: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.ink, flex: 1 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: fonts.dmBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  bar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  cRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 9,
  },
  cL: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  cPct: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.ink },

  actions: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 44,
    borderRadius: 10,
  },
  btnDark: { backgroundColor: colors.navy },
  btnDarkText: { color: "#fff", fontFamily: fonts.dmBold, fontSize: 13 },
  btnOut: { ...surface },
  btnOutText: { color: colors.navy, fontFamily: fonts.dmBold, fontSize: 13 },
});
