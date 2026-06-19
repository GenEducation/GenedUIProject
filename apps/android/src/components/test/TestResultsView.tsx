/**
 * TestResultsView — native results screen: overall verdict + score, per-section
 * breakdown, and per-question AI feedback from graded_questions.
 */
import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { colors, fonts } from "../../theme/tokens";
import type { CreateChapterTestResponse, SubmitTestResponse, ZPDVerdict } from "../../types/test";

const VERDICT: Record<ZPDVerdict, { bg: string; fg: string; label: string }> = {
  ABOVE: { bg: "#E7F8F0", fg: colors.growth, label: "Above Expectations" },
  AT: { bg: "#EAF2FD", fg: colors.genBlue, label: "At Expectations" },
  BELOW: { bg: "#FFF1EC", fg: colors.coral, label: "Below Expectations" },
};

export function TestResultsView({ test, result, onClose }: { test: CreateChapterTestResponse; result: SubmitTestResponse; onClose: () => void }) {
  const v = VERDICT[result.overall_verdict] ?? VERDICT.AT;
  const sections = Object.entries(result.section_results);
  const allQuestions = (test.sections ?? []).flatMap((s) => s.questions ?? []);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.verdictChip, { backgroundColor: v.bg }]}>
        <Text style={[styles.verdictText, { color: v.fg }]}>{v.label}</Text>
      </View>
      <Text style={styles.score}>Overall Score: {Math.round(result.overall_score * 100)}%</Text>
      <Text style={styles.sub}>Here’s your breakdown for {test.document_title}.</Text>

      {sections.length > 0 ? (
        <View style={styles.block}>
          {sections.map(([name, data]) => {
            const sv = VERDICT[data.verdict] ?? VERDICT.AT;
            const pct = data.total_marks ? Math.round((data.marks_obtained / data.total_marks) * 100) : Math.round(data.actual_score * 100);
            return (
              <View key={name} style={styles.secCard}>
                <View style={styles.secTop}>
                  <Text style={styles.secName} numberOfLines={1}>{name}</Text>
                  <Text style={[styles.secPct, { color: sv.fg }]}>{Math.round(data.actual_score * 100)}%</Text>
                </View>
                {data.total_marks != null ? (
                  <>
                    <Text style={styles.secMarks}>{data.marks_obtained} / {data.total_marks} marks · target {Math.round(data.expected_score * 100)}%</Text>
                    <View style={styles.bar}>
                      <View style={[styles.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: sv.fg }]} />
                    </View>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      <Text style={styles.heading}>Detailed Feedback</Text>
      <View style={styles.block}>
        {result.graded_questions.map((g, i) => {
          const q = allQuestions.find((qq) => qq.question_id === g.question_id);
          if (!q) return null;
          const pct = Math.round(g.score_0_1 * 100);
          const tone = g.score_0_1 === 1 ? colors.growth : g.score_0_1 > 0 ? colors.sun : colors.coral;
          return (
            <View key={i} style={styles.fbCard}>
              <View style={styles.fbTop}>
                <Text style={styles.fbPrompt}>{q.prompt}</Text>
                <View style={[styles.fbPct, { backgroundColor: tone + "1E" }]}>
                  <Text style={[styles.fbPctText, { color: tone }]}>{pct}%</Text>
                </View>
              </View>
              <Text style={styles.fbReview}>AI Review: {g.rationale}</Text>
            </View>
          );
        })}
      </View>

      <Pressable style={styles.doneBtn} onPress={onClose}>
        <Text style={styles.doneText}>Continue Learning</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 10 },
  verdictChip: { alignSelf: "center", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7, marginTop: 4 },
  verdictText: { fontFamily: fonts.dmBold, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 },
  score: { fontFamily: fonts.nunito, fontSize: 24, color: colors.text, textAlign: "center", marginTop: 6 },
  sub: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted, textAlign: "center", marginBottom: 8 },
  block: { gap: 10 },
  secCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 6 },
  secTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  secName: { flex: 1, fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  secPct: { fontFamily: fonts.dmBold, fontSize: 18 },
  secMarks: { fontFamily: fonts.dm, fontSize: 12, color: colors.textMuted },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.pageBg, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  heading: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text, marginTop: 12 },
  fbCard: { backgroundColor: colors.pageBg, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 },
  fbTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  fbPrompt: { flex: 1, fontFamily: fonts.dmMedium, fontSize: 14, color: colors.text, lineHeight: 20 },
  fbPct: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  fbPctText: { fontFamily: fonts.dmBold, fontSize: 12 },
  fbReview: { fontFamily: fonts.dm, fontSize: 13, lineHeight: 19, color: colors.textMid, fontStyle: "italic" },
  doneBtn: { marginTop: 16, backgroundColor: colors.genPurple, borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  doneText: { fontFamily: fonts.dmBold, fontSize: 15, color: "#fff" },
});
