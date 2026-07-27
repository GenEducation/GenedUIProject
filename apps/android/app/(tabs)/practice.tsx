import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { SectionHead } from "@/components/SectionHead";
import { usePracticeData } from "@/hooks/usePracticeData";
import { useStudentId } from "@/hooks/useStudentId";
import { studentService } from "@/services/studentService";
import { colors, fonts, subjectVisual, radius, normalizeSubjectKey } from "@/theme/tokens";
import type { ChapterMastery, TestSubmission } from "@/types/api";

export default function Practice() {
  const router = useRouter();
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const studentId = useStudentId();

  const { subjects, chapters, submissions, loading, error, refetch } =
    usePracticeData(selectedSubject);

  if (loading) {
    return (
      <Screen background={colors.pageBg}>
        <LoadingState message="Loading practice tests…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen background={colors.pageBg}>
        <ErrorState message="Couldn't load practice tests." onRetry={refetch} />
      </Screen>
    );
  }

  const handleStartTest = async (chapter: ChapterMastery) => {
    if (!studentId || creatingId) return;
    const key = chapter.document_title;
    setCreatingId(key);
    try {
      const test = await studentService.createChapterTest({
        student_id: studentId,
        chapter_query: chapter.document_title,
        subject: chapter.subject,
        grade: chapter.grade ?? 9,
        questions_per_section: 3,
      });
      router.push({
        pathname: "/test",
        params: { testId: test.test_id, testData: JSON.stringify(test) },
      });
    } catch {
      Alert.alert("Error", "Couldn't create test. Please try again.");
    } finally {
      setCreatingId(null);
    }
  };

  const filteredChapters = selectedSubject
    ? chapters.filter((c) => c.subject?.toLowerCase() === selectedSubject.toLowerCase())
    : chapters;

  return (
    <Screen background={colors.pageBg}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Practice</Text>
        <Text style={styles.sub}>Test yourself on your chapters.</Text>

        {/* Subject filter chips */}
        {subjects.length > 0 && (
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, !selectedSubject && styles.chipActive]}
              onPress={() => setSelectedSubject(undefined)}
            >
              <Text style={[styles.chipText, !selectedSubject && styles.chipTextActive]}>
                All
              </Text>
            </Pressable>
            {subjects.map((s, i) => (
              <Pressable
                key={s.subject ?? i}
                style={[styles.chip, selectedSubject === s.subject && styles.chipActive]}
                onPress={() =>
                  setSelectedSubject(selectedSubject === s.subject ? undefined : s.subject)
                }
              >
                <Text style={[styles.chipText, selectedSubject === s.subject && styles.chipTextActive]}>
                  {subjectVisual[normalizeSubjectKey(s.subject)]?.label ?? s.subject}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Chapter cards */}
        <SectionHead title="START NEW TEST" style={{ marginTop: 20 }} />
        {filteredChapters.length === 0 ? (
          <EmptyState
            icon="📚"
            title="No chapters yet"
            message="Start chatting about a subject to unlock chapters."
            fullScreen={false}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {filteredChapters.map((c, i) => {
              const visual = subjectVisual[normalizeSubjectKey(c.subject)] ?? {
                color: colors.genPurple,
                bg: "#EBF0FD",
                icon: "📚",
                label: c.subject,
              };
              const mastery = Math.round(
                ((c.mastery_score ?? c.mastery ?? 0) * 100)
              );
              return (
                <View key={`${c.subject}-${c.document_title}-${i}`} style={styles.chapterCard}>
                  <View style={[styles.chapterIcon, { backgroundColor: visual.bg }]}>
                    <Text style={styles.chapterEmoji}>{visual.icon}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.chapterTitle} numberOfLines={2}>
                      {c.document_title}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.subjectBadge, { backgroundColor: visual.color + "18" }]}>
                        <Text style={[styles.subjectBadgeText, { color: visual.color }]}>
                          {visual.label}
                        </Text>
                      </View>
                      {mastery > 0 && (
                        <Text style={styles.masteryText}>{mastery}% mastery</Text>
                      )}
                    </View>
                  </View>
                  <Pressable
                    style={[styles.startBtn, { backgroundColor: visual.color }, !!creatingId && styles.startBtnDisabled]}
                    onPress={() => handleStartTest(c)}
                    disabled={!!creatingId}
                  >
                    <Text style={styles.startBtnText}>{creatingId === c.document_title ? "…" : "Test"}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* Past submissions */}
        <SectionHead title="PAST TESTS" style={{ marginTop: 22 }} />
        {submissions.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No tests yet"
            message="Take your first practice test above."
            fullScreen={false}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {submissions.map((sub) => (
              <SubmissionCard key={sub.submission_id} submission={sub} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function SubmissionCard({ submission }: { submission: TestSubmission }) {
  const visual = subjectVisual[normalizeSubjectKey(submission.subject)] ?? {
    color: colors.genPurple,
    bg: "#EBF0FD",
    icon: "📚",
    label: submission.subject,
  };
  const pct = submission.percentage ?? 0;

  return (
    <View style={styles.submCard}>
      <View style={[styles.submIcon, { backgroundColor: visual.bg }]}>
        <Text style={styles.submEmoji}>{visual.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.submSubject}>{visual.label}</Text>
        {submission.chapter ? (
          <Text style={styles.submChapter}>{submission.chapter}</Text>
        ) : null}
        {submission.submitted_at ? (
          <Text style={styles.submDate}>
            {new Date(submission.submitted_at).toLocaleDateString()}
          </Text>
        ) : null}
      </View>
      <View style={[styles.scoreBadge, { backgroundColor: visual.color + "18", borderColor: visual.color + "44" }]}>
        <Text style={[styles.scoreText, { color: visual.color }]}>{pct}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },
  heading: { fontFamily: fonts.nunito, fontSize: 26, color: colors.text, marginBottom: 4 },
  sub: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted, marginBottom: 16 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.genPurple, backgroundColor: colors.genPurple + "12" },
  chipText: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMid },
  chipTextActive: { color: colors.genPurple },

  chapterCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chapterIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chapterEmoji: { fontSize: 20 },
  chapterTitle: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text, lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  subjectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subjectBadgeText: { fontFamily: fonts.dmBold, fontSize: 10 },
  masteryText: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted },
  startBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { fontFamily: fonts.dmBold, fontSize: 12, color: "#fff" },

  submCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  submIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  submEmoji: { fontSize: 18 },
  submSubject: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text },
  submChapter: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMid, marginTop: 1 },
  submDate: { fontFamily: fonts.dm, fontSize: 10, color: colors.textMuted, marginTop: 1 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  scoreText: { fontFamily: fonts.dmBold, fontSize: 14 },
});
