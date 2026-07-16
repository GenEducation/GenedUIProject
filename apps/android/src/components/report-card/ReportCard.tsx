/**
 * Shared ReportCard rendering component.
 * Used by both the student tab (app/(tabs)/report.tsx) and
 * the parent tab (app/(parent)/report.tsx).
 *
 * Callers normalise their API response into ReportCardData and pass it in.
 * Use toReportCardData() / toParentReportCardData() adapters below.
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Markdown from "react-native-markdown-display";
import { colors, fonts } from "@/theme/tokens";

// ── Markdown renderer ──────────────────────────────────────────────────────────
// AI report fields (chapter_report, section bodies, evolution analyses) come back
// as markdown (####, ###, **bold**, - bullets). Render them instead of dumping raw.
const mdStyle: any = {
  body:        { fontFamily: fonts.dm, fontSize: 13, color: colors.ink2, lineHeight: 21 },
  heading1:    { fontFamily: fonts.serif, fontSize: 19, color: colors.ink, marginTop: 12, marginBottom: 6 },
  heading2:    { fontFamily: fonts.serif, fontSize: 17, color: colors.ink, marginTop: 12, marginBottom: 5 },
  heading3:    { fontFamily: fonts.serif, fontSize: 15, color: colors.ink, marginTop: 10, marginBottom: 4 },
  heading4:    { fontFamily: fonts.dmBold, fontSize: 12.5, color: colors.ink, marginTop: 8, marginBottom: 2, letterSpacing: 0.3 },
  strong:      { fontFamily: fonts.dmBold, color: colors.ink },
  em:          { fontFamily: fonts.dm, fontStyle: "italic" },
  paragraph:   { marginTop: 0, marginBottom: 8 },
  bullet_list: { marginVertical: 2 },
  ordered_list:{ marginVertical: 2 },
  list_item:   { marginVertical: 1 },
  hr:          { backgroundColor: colors.border, height: 1, marginVertical: 8 },
  code_inline: { fontFamily: fonts.mono, fontSize: 12, backgroundColor: colors.pageBg },
};

function Md({ children }: { children: string }) {
  return <Markdown style={mdStyle}>{children}</Markdown>;
}

// ── Normalised data shape ─────────────────────────────────────────────────────

export interface ReportSubject {
  subject: string;
  score:   number;  // 0–100
  band?:   string;
}

export interface ReportChapter {
  title:       string;
  subject?:    string;
  mastery:     number;  // 0–100
  completion?: number;  // 0–100
  sessions?:   number;
  chapter_report?: string;
}

export interface ReportSection {
  title: string;
  body:  string;
}

export interface ReportTestSubmission {
  document_title?:   string;
  subject?:          string;
  overall_score?:    number;  // 0–1
  overall_verdict?:  string;
  section_results?:  Record<string, { correct: number; total: number; score?: number }>;
  submitted_at?:     string;
}

export interface ReportAiInsights {
  strengths?:   string[];
  weaknesses?:  string[];
  focusAreas?:  { priority?: string; area?: string; topic?: string; rationale?: string; reason?: string }[];
}

export interface ReportCardData {
  studentName:    string;
  grade?:         string | number;
  board?:         string;
  totalSessions:  number;
  period?:        string;
  reportNumber?:  string;
  issued?:        string;
  headline?:      string;
  narrative?:     string;
  subjects:       ReportSubject[];
  chapters:       ReportChapter[];
  sections:       ReportSection[];
  testSubs?:      ReportTestSubmission[];
  aiInsights?:    ReportAiInsights;
  skillTree?:     any[];
  subjectEvolutions?: any[];
  chapterEvolutions?: any[];
}

// ── Adapters ──────────────────────────────────────────────────────────────────

/** Student portal: ProgressReport from GET /students/{id}/progress-report */
export function fromProgressReport(
  report: any,
  studentName: string,
  grade?: number,
  board?: string
): ReportCardData {
  return {
    studentName,
    grade,
    board,
    totalSessions: report?.total_sessions ?? 0,
    period:        report?.period,
    reportNumber:  report?.report_number,
    issued:        report?.issued,
    narrative:     report?.narrative,
    subjects: (report?.subject_kpis ?? []).map((k: any) => ({
      subject: k.subject,
      score:   k.score ?? 0,
      band:    k.band,
    })),
    chapters: (report?.chapters ?? []).map((c: any) => {
      const raw = c.mastery_score ?? c.mastery ?? 0;
      return {
        title:      c.chapter_title ?? c.document_title ?? "",
        subject:    c.subject,
        mastery:    raw <= 1 ? Math.round(raw * 100) : Math.round(raw),
        completion: c.completion_percentage,
        sessions:   c.sessions ?? c.study_count,
        chapter_report: c.chapter_report,
      };
    }),
    sections: (report?.sections ?? []).map((s: any) => ({ title: s.title, body: s.body })),
  };
}

/** Parent/Teacher portal: aggregate from GET /parent/students/{id}/report */
export function fromParentReport(
  data: any,
  studentName: string,
  grade?: string | number,
  board?: string
): ReportCardData {
  const pr = data?.progress_report ?? null;
  const rj = pr?.report_json ?? {};

  return {
    studentName,
    grade:         grade ?? data?.profile?.grade,
    board:         board ?? data?.profile?.board ?? data?.profile?.school_board,
    totalSessions: data?.total_sessions ?? 0,
    period:        pr?.updated_at
      ? new Date(pr.updated_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
      : undefined,
    headline:  pr?.headline ?? undefined,
    narrative: pr?.overall_assessment ?? undefined,
    subjects: (data?.subjects ?? []).map((s: any) => {
      const raw = s.overall_score ?? 0;
      const pct = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
      return { subject: s.subject, score: pct };
    }),
    chapters: (data?.chapters ?? []).map((c: any) => {
      const raw = c.mastery_score ?? c.mastery ?? 0;
      return {
        title:      c.document_title ?? c.chapter_title ?? "",
        subject:    c.subject,
        mastery:    raw <= 1 ? Math.round(raw * 100) : Math.round(raw),
        completion: c.completion_percentage,
        sessions:   c.study_count ?? c.sessions,
        chapter_report: c.chapter_report,
      };
    }),
    sections: [],
    testSubs:      data?.test_submissions?.length > 0 ? data.test_submissions : undefined,
    aiInsights: (rj.universal_strengths?.length || rj.universal_weaknesses?.length || rj.focus_areas?.length) ? {
      strengths:  rj.universal_strengths  ?? [],
      weaknesses: rj.universal_weaknesses ?? [],
      focusAreas: rj.focus_areas          ?? [],
    } : undefined,
    skillTree:         data?.skill_tree ?? undefined,
    subjectEvolutions: data?.subject_evolutions ?? undefined,
    chapterEvolutions: data?.chapter_evolutions ?? undefined,
  };
}

// ── Band helpers ──────────────────────────────────────────────────────────────

type Band = "Advanced" | "Proficient" | "Approaching" | "Developing";

function bandFor(score: number): Band {
  if (score >= 80) return "Advanced";
  if (score >= 60) return "Proficient";
  if (score >= 40) return "Approaching";
  return "Developing";
}

const BAND: Record<Band, { fg: string; bg: string; bd: string }> = {
  Advanced:    { fg: "#047857", bg: "#ECFDF5", bd: "#A7F3D0" },
  Proficient:  { fg: "#1D4ED8", bg: "#EFF6FF", bd: "#BFDBFE" },
  Approaching: { fg: "#B45309", bg: "#FFFBEB", bd: "#FDE68A" },
  Developing:  { fg: "#BE123C", bg: "#FFF1F2", bd: "#FECDD3" },
};

function resolveBand(score: number, hint?: string): Band {
  if (hint && hint in BAND) return hint as Band;
  return bandFor(score);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BandChip({ score, hint }: { score: number; hint?: string }) {
  const band = resolveBand(score, hint);
  const b = BAND[band];
  return (
    <View style={[chip.wrap, { backgroundColor: b.bg, borderColor: b.bd }]}>
      <Text style={[chip.text, { color: b.fg }]}>{band}</Text>
    </View>
  );
}
const chip = StyleSheet.create({
  wrap: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  text: { fontFamily: fonts.dmBold, fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase" },
});

function SectionCard({ n, title, sub, children }: {
  n: string; title: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <View style={sc.card}>
      <View style={sc.head}>
        <View style={sc.numBox}><Text style={sc.numText}>{n}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={sc.title}>{title}</Text>
          {sub ? <Text style={sc.sub}>{sub}</Text> : null}
        </View>
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}
const sc = StyleSheet.create({
  card:    { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 12 },
  head:    { flexDirection: "row", gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: "flex-start" },
  numBox:  { width: 26, height: 26, borderRadius: 6, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  numText: { fontFamily: fonts.dmBold, fontSize: 12, color: "#fff" },
  title:   { fontFamily: fonts.serif, fontSize: 18, color: colors.ink },
  sub:     { fontFamily: fonts.dm, fontSize: 12, color: colors.muted, marginTop: 3 },
  body:    { padding: 16, gap: 12 },
});

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  data: ReportCardData;
  refreshControl?: React.ReactElement<any>;
}

export function ReportCard({ data, refreshControl }: Props) {
  const {
    studentName, grade, board, totalSessions,
    period, reportNumber, issued,
    headline, narrative,
    subjects, chapters, sections,
    testSubs, aiInsights,
    skillTree, subjectEvolutions, chapterEvolutions,
  } = data;

  const generatedAt = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const reportPeriod = period ?? generatedAt;
  const initials = studentName
    .split(" ")
    .map((n) => n[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  let secNum = 0;
  const nextN = () => String(++secNum);

  return (
    <ScrollView contentContainerStyle={r.content} showsVerticalScrollIndicator={false} refreshControl={refreshControl ?? undefined}>

      {/* ── HEADER ── */}
      <View style={r.head}>
        <View style={r.headTop}>
          <View style={r.brand}>
            <View style={r.brandMark}><Text style={r.brandMarkText}>G</Text></View>
            <Text style={r.brandText}>GenEducation</Text>
          </View>
          {reportNumber ? (
            <Text style={r.repNo}>Report No. {reportNumber}</Text>
          ) : (
            <Text style={r.repNo}>AR-{generatedAt.replace(/\s|,/g, "").toUpperCase()}</Text>
          )}
        </View>

        <Text style={r.pre}>LEARNER REPORT · {reportPeriod.toUpperCase()}</Text>

        <Text style={r.headTitle}>
          {studentName},{" "}
          <Text style={r.headTitleEm}>
            {headline
              ? headline.toLowerCase()
              : narrative
                ? narrative.split(".")[0]?.toLowerCase() + "."
                : "your progress report."}
          </Text>
        </Text>

        {narrative ? <Text style={r.deck}>{narrative}</Text> : null}

        <View style={r.meta}>
          <MetaItem k="Student"  v={studentName} />
          {grade  ? <MetaItem k="Grade"    v={`${grade}${board ? ` · ${board}` : ""}`} /> : null}
          <MetaItem k="Sessions" v={String(totalSessions)} />
          {issued ? <MetaItem k="Issued"   v={issued} /> : null}
        </View>
      </View>

      {/* ── 1. SUBJECTS ── */}
      {subjects.length > 0 && (
        <SectionCard n={nextN()} title="At a glance." sub="Subject scores and proficiency bands.">
          <View style={r.kpiGrid}>
            {subjects.map((s, i) => {
              const band = resolveBand(s.score, s.band);
              const b = BAND[band];
              return (
                <View key={s.subject} style={[r.kpiCell, i < subjects.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
                  <Text style={r.kpiK}>{s.subject.toUpperCase()}</Text>
                  <Text style={[r.kpiV, { color: b.fg }]}>{s.score}<Text style={r.kpiSm}>%</Text></Text>
                  <Text style={[r.kpiB, { color: b.fg }]}>{band}</Text>
                </View>
              );
            })}
          </View>
        </SectionCard>
      )}

      {/* ── 2. CHAPTERS ── */}
      {chapters.length > 0 && (
        <SectionCard n={nextN()} title="Chapter progress." sub="Mastery and coverage by chapter.">
          {chapters.map((c, i) => {
            const band = bandFor(c.mastery);
            const b = BAND[band];
            const coverage = c.completion ?? c.mastery;
            return (
              <View key={`${c.title}-${i}`} style={r.chap}>
                <View style={r.chapTop}>
                  <Text style={r.chapTitle} numberOfLines={2}>{c.title}</Text>
                  <BandChip score={c.mastery} />
                </View>
                {c.subject ? <Text style={r.chapMeta}>{c.subject}{c.sessions ? ` · ${c.sessions} sessions` : ""}</Text> : null}
                <View style={r.barLabelRow}>
                  <Text style={r.barLabel}>Completion</Text>
                  <Text style={[r.barVal, { color: b.fg }]}>{Math.round(coverage)}%</Text>
                </View>
                <View style={r.bar}>
                  <View style={[r.barFill, { width: `${Math.min(coverage, 100)}%` as any, backgroundColor: b.fg }]} />
                </View>
                {c.chapter_report ? (
                  <View style={r.chapReport}>
                    <Md>{c.chapter_report}</Md>
                  </View>
                ) : null}
              </View>
            );
          })}
        </SectionCard>
      )}

      {/* ── 2.5 SKILL MASTERY ── */}
      {skillTree && skillTree.length > 0 && (
        <SectionCard n={nextN()} title="Skill Mastery." sub="Concept Groups & Learning Outcomes.">
          <View style={{ gap: 12 }}>
            {skillTree.map((cg: any, i: number) => {
              const cgScore = cg.avg_mastery ?? 0;
              const cgBand = resolveBand(cgScore * 100);
              const cgB = BAND[cgBand];
              return (
                <View key={i} style={r.skillCg}>
                  <View style={r.skillCgTop}>
                    <Text style={r.skillCgTitle}>{cg.cg_name}</Text>
                    <BandChip score={cgScore * 100} />
                  </View>
                  <Text style={r.skillCgSubj}>{cg.subject}</Text>
                  
                  {(cg.concepts ?? []).map((conc: any, j: number) => (
                    <View key={j} style={r.skillConcept}>
                      <Text style={r.skillConceptTitle}>{conc.c_name}</Text>
                      <View style={{ gap: 6, marginTop: 6 }}>
                        {(conc.los ?? []).map((lo: any, k: number) => {
                          const loScore = lo.mastery_level ?? 0;
                          const loBand = resolveBand(loScore * 100);
                          return (
                            <View key={k} style={r.skillLo}>
                              <View style={[r.skillLoDot, { backgroundColor: BAND[loBand].fg }]} />
                              <Text style={r.skillLoTitle}>{lo.skill_name}</Text>
                              <Text style={[r.skillLoScore, { color: BAND[loBand].fg }]}>{Math.round(loScore * 100)}%</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </SectionCard>
      )}

      {/* ── 3. TESTS (parent only) ── */}
      {testSubs && testSubs.length > 0 && (
        <SectionCard n={nextN()} title="Chapter Test Results" sub="ZPD-calibrated assessments.">
          {testSubs.map((t: ReportTestSubmission, i: number) => {
            const pct  = Math.round((t.overall_score ?? 0) * 100);
            const pass = t.overall_verdict === "PASS";
            const band = bandFor(pct);
            const b    = BAND[band];
            const secs = Object.entries(t.section_results ?? {}) as [string, any][];
            return (
              <View key={i} style={r.testCard}>
                <View style={r.testLeft}>
                  <Text style={r.testTitle} numberOfLines={1}>{t.document_title}</Text>
                  <Text style={r.testSubj}>{t.subject}</Text>
                  {secs.length > 0 && (
                    <View style={r.testSecs}>
                      {secs.map(([name, res]) => (
                        <View key={name} style={r.testSecPill}>
                          <Text style={r.testSecText}>{name} {res.correct}/{res.total}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <View style={r.testRight}>
                  <Text style={[r.testPct, { color: b.fg }]}>{pct}<Text style={r.testPctU}>%</Text></Text>
                  <View style={[r.verdict, { backgroundColor: pass ? BAND.Advanced.bg : BAND.Developing.bg }]}>
                    <Text style={[r.verdictText, { color: pass ? BAND.Advanced.fg : BAND.Developing.fg }]}>
                      {t.overall_verdict}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </SectionCard>
      )}

      {/* ── 5. AI INSIGHTS (parent only) ── */}
      {aiInsights && (
        <SectionCard n={nextN()} title="AI Insights" sub="Personalised analysis from session data.">
          {aiInsights.strengths && aiInsights.strengths.length > 0 && (
            <InsightGroup label="Strengths" items={aiInsights.strengths} type="strength" />
          )}
          {aiInsights.weaknesses && aiInsights.weaknesses.length > 0 && (
            <InsightGroup label="Areas to Improve" items={aiInsights.weaknesses} type="weakness" />
          )}
          {aiInsights.focusAreas && aiInsights.focusAreas.length > 0 && (
            <InsightGroup
              label="Focus Areas"
              items={aiInsights.focusAreas.map((fa) =>
                `${fa.priority ? `[${fa.priority}] ` : ""}${fa.area ?? fa.topic ?? ""}${(fa.rationale ?? fa.reason) ? ` — ${fa.rationale ?? fa.reason}` : ""}`
              )}
              type="focus"
            />
          )}
        </SectionCard>
      )}

      {/* ── NARRATIVE SECTIONS (student report) ── */}
      {sections.map((sec) => (
        <SectionCard key={sec.title} n={nextN()} title={sec.title} sub="">
          <Md>{sec.body}</Md>
        </SectionCard>
      ))}

      {/* ── 6. SUBJECT LEARNING TRENDS ── */}
      {subjectEvolutions && subjectEvolutions.length > 0 && (
        <SectionCard n={nextN()} title="Subject Trends." sub="Learning evolution across chapters.">
          <View style={{ gap: 12 }}>
            {subjectEvolutions.map((se: any, i: number) => (
              <View key={i} style={r.evoCard}>
                <View style={r.evoTop}>
                  <Text style={r.evoSubj}>{se.subject}</Text>
                  <Text style={r.evoMeta}>{se.chapter_count} chapters</Text>
                </View>
                {se.headline ? <Text style={r.evoHeadline}>{se.headline}</Text> : null}
                {se.subject_skill_trajectory ? (
                  <View style={r.evoBox}>
                    <Text style={r.evoBoxLabel}>TRAJECTORY</Text>
                    <Text style={r.evoBoxText}>{se.subject_skill_trajectory}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      {/* ── 7. CHAPTER LEARNING EVOLUTION ── */}
      {chapterEvolutions && chapterEvolutions.length > 0 && (
        <SectionCard n={nextN()} title="Chapter Evolution." sub="AI analysis of session progress.">
          <View style={{ gap: 12 }}>
            {chapterEvolutions.map((ce: any, i: number) => (
              <View key={i} style={r.evoCard}>
                <View style={r.evoTop}>
                  <Text style={r.evoSubj}>{ce.document_title}</Text>
                  <Text style={r.evoMeta}>{ce.subject}</Text>
                </View>
                {ce.headline ? <Text style={r.evoHeadline}>{ce.headline}</Text> : null}
                {ce.skill_score_trajectory ? (
                  <View style={[r.evoBox, { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" }]}>
                    <Text style={[r.evoBoxLabel, { color: "#C2410C" }]}>PROGRESS</Text>
                    <Text style={r.evoBoxText}>{ce.skill_score_trajectory}</Text>
                  </View>
                ) : null}
                {ce.analysis_json?.recommendations?.length > 0 && (
                  <View style={{ marginTop: 8, gap: 4 }}>
                    <Text style={r.insightLabel}>Recommendations</Text>
                    {ce.analysis_json.recommendations.map((rec: string, k: number) => (
                      <View key={k} style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                        <Text style={{ color: "#F97316", marginTop: 2 }}>›</Text>
                        <Text style={r.p}>{rec}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </SectionCard>
      )}

    </ScrollView>
  );
}

function MetaItem({ k, v }: { k: string; v: string }) {
  return (
    <Text style={r.metaItem}>{k}<Text style={r.metaB}> {v}</Text></Text>
  );
}

function InsightGroup({ label, items, type }: {
  label: string;
  items: string[];
  type: "strength" | "weakness" | "focus";
}) {
  const c = { strength: { bg: "#ECFDF5", fg: "#047857" }, weakness: { bg: "#FFF1F2", fg: "#BE123C" }, focus: { bg: "#FFFBEB", fg: "#B45309" } }[type];
  return (
    <View style={{ gap: 4 }}>
      <Text style={r.insightLabel}>{label}</Text>
      {items.map((item, i) => (
        <View key={i} style={[r.insightPill, { backgroundColor: c.bg }]}>
          <View style={[r.insightDot, { backgroundColor: c.fg }]} />
          <Text style={[r.insightText, { color: c.fg }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const r = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 32 },

  // Header
  head:         { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 12 },
  headTop:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  brand:        { flexDirection: "row", alignItems: "center", gap: 6 },
  brandMark:    { width: 20, height: 20, borderRadius: 5, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  brandMarkText:{ color: "#fff", fontFamily: fonts.dmBold, fontSize: 12 },
  brandText:    { fontFamily: fonts.dmBold, fontSize: 13, color: colors.ink },
  repNo:        { fontFamily: fonts.mono, fontSize: 9, color: colors.muted },
  pre:          { fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 2, color: colors.proficient, marginBottom: 8 },
  headTitle:    { fontFamily: fonts.serif, fontSize: 24, color: colors.ink, lineHeight: 30, marginBottom: 8 },
  headTitleEm:  { fontFamily: fonts.serifItalic, color: colors.proficient },
  deck:         { fontFamily: fonts.dm, fontSize: 12.5, color: colors.ink2, lineHeight: 19, marginBottom: 14 },
  meta:         { flexDirection: "row", flexWrap: "wrap", gap: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  metaItem:     { fontFamily: fonts.dm, fontSize: 11, color: colors.muted },
  metaB:        { fontFamily: fonts.dmBold, color: colors.ink },

  // Subjects KPI grid
  kpiGrid:      { flexDirection: "row", borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: "hidden" },
  kpiCell:      { flex: 1, padding: 12 },
  kpiK:         { fontFamily: fonts.mono, fontSize: 9.5, color: colors.muted, letterSpacing: 1 },
  kpiV:         { fontFamily: fonts.serif, fontSize: 23, marginTop: 6 },
  kpiSm:        { fontFamily: fonts.dm, fontSize: 11, color: colors.muted },
  kpiB:         { fontFamily: fonts.dm, fontSize: 11, marginTop: 4 },

  // Chapters
  chap:         { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 13, gap: 8 },
  chapTop:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  chapTitle:    { fontFamily: fonts.dmBold, fontSize: 14, color: colors.ink, flex: 1 },
  chapMeta:     { fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 0.6, textTransform: "uppercase" },
  barLabelRow:  { flexDirection: "row", justifyContent: "space-between" },
  barLabel:     { fontFamily: fonts.dmBold, fontSize: 10, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  barVal:       { fontFamily: fonts.dmBold, fontSize: 13 },
  bar:          { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: "hidden" },
  barFill:      { height: "100%", borderRadius: 2 },

  // Tests
  testCard:     { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 13, gap: 12 },
  testLeft:     { flex: 1, gap: 4 },
  testTitle:    { fontFamily: fonts.dmBold, fontSize: 14, color: colors.ink },
  testSubj:     { fontFamily: fonts.mono, fontSize: 9, color: colors.muted, letterSpacing: 0.8, textTransform: "uppercase" },
  testSecs:     { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  testSecPill:  { backgroundColor: colors.pageBg, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  testSecText:  { fontFamily: fonts.dm, fontSize: 11, color: colors.ink2 },
  testRight:    { alignItems: "center", gap: 6 },
  testPct:      { fontFamily: fonts.nunito, fontSize: 30, lineHeight: 34 },
  testPctU:     { fontSize: 13, color: colors.muted },
  verdict:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  verdictText:  { fontFamily: fonts.dmBold, fontSize: 8, letterSpacing: 1, textTransform: "uppercase" },

  // AI insights
  insightLabel: { fontFamily: fonts.dmBold, fontSize: 10, color: colors.muted, textTransform: "uppercase", letterSpacing: 1 },
  insightPill:  { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 8 },
  insightDot:   { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  insightText:  { flex: 1, fontFamily: fonts.dm, fontSize: 13, lineHeight: 19 },

  // Narrative sections (student)
  p: { fontFamily: fonts.dm, fontSize: 13, color: colors.ink2, lineHeight: 21 },

  // New features
  chapReport:   { marginTop: 12, padding: 12, backgroundColor: colors.pageBg, borderRadius: 8 },
  chapReportText:{ fontFamily: fonts.dm, fontSize: 12, color: colors.ink2, lineHeight: 18 },
  
  skillCg:      { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12 },
  skillCgTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 },
  skillCgTitle: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.ink, flex: 1 },
  skillCgSubj:  { fontFamily: fonts.mono, fontSize: 9, color: colors.muted, textTransform: "uppercase" },
  skillConcept: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  skillConceptTitle: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.ink2 },
  skillLo:      { flexDirection: "row", alignItems: "center", gap: 8 },
  skillLoDot:   { width: 6, height: 6, borderRadius: 3 },
  skillLoTitle: { fontFamily: fonts.dm, fontSize: 12, color: colors.ink2, flex: 1 },
  skillLoScore: { fontFamily: fonts.dmBold, fontSize: 11 },

  evoCard:      { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12 },
  evoTop:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  evoSubj:      { fontFamily: fonts.dmBold, fontSize: 14, color: colors.ink },
  evoMeta:      { fontFamily: fonts.mono, fontSize: 10, color: colors.muted, textTransform: "uppercase" },
  evoHeadline:  { fontFamily: fonts.dm, fontSize: 13, color: colors.ink2, marginBottom: 8 },
  evoBox:       { backgroundColor: "#F0FDF4", borderColor: "#DCFCE7", borderWidth: 1, borderRadius: 6, padding: 10 },
  evoBoxLabel:  { fontFamily: fonts.dmBold, fontSize: 9, color: "#166534", letterSpacing: 1, marginBottom: 4 },
  evoBoxText:   { fontFamily: fonts.dm, fontSize: 12, color: colors.ink2, lineHeight: 18 },
});
