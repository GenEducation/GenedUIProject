import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { SectionHead } from "@/components/SectionHead";
import { usePracticeData } from "@/hooks/usePracticeData";
import { useStudentId } from "@/hooks/useStudentId";
import { studentService } from "@/services/studentService";
import { colors, fonts, subjectVisual, radius } from "@/theme/tokens";
import type { SubjectInfo, TestSubmission } from "@/types/api";

export default function Practice() {
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const studentId = useStudentId();

  const { subjects, submissions, loading, error, refetch } =
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

  const handleStartTest = async (subject: SubjectInfo) => {
    if (!studentId || creating) return;
    setCreating(true);
    try {
      await studentService.createChapterTest({
        student_id: studentId,
        chapter_query: subject.subject,
        subject: subject.subject,
        grade: subject.grade ?? 9,
        questions_per_section: 5,
      });
      Alert.alert(
        "Test Created",
        "Your practice test is ready! (Test runner coming soon.)"
      );
      refetch();
    } catch {
      Alert.alert("Error", "Couldn't create test. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen background={colors.pageBg}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Practice</Text>
        <Text style={styles.sub}>Test yourself on your subjects.</Text>

        {/* Subject filter chips */}
        {subjects.length > 0 ? (
          <View style={styles.subjectRow}>
            <Pressable
              style={[styles.chip, !selectedSubject && styles.chipActive]}
              onPress={() => setSelectedSubject(undefined)}
            >
              <Text style={[styles.chipText, !selectedSubject && styles.chipTextActive]}>
                All
              </Text>
            </Pressable>
            {subjects.map((s) => (
              <Pressable
                key={s.subject}
                style={[
                  styles.chip,
                  selectedSubject === s.subject && styles.chipActive,
                ]}
                onPress={() =>
                  setSelectedSubject(
                    selectedSubject === s.subject ? undefined : s.subject
                  )
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedSubject === s.subject && styles.chipTextActive,
                  ]}
                >
                  {subjectVisual[s.subject.toLowerCase()]?.label ?? s.subject}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Start New Test cards */}
        {subjects.length > 0 ? (
          <>
            <SectionHead title="START NEW TEST" style={{ marginTop: 20 }} />
            <View style={{ gap: 10 }}>
              {(selectedSubject
                ? subjects.filter((s) => s.subject === selectedSubject)
                : subjects
              ).map((s) => {
                const visual = subjectVisual[s.subject.toLowerCase()] ?? {
                  color: colors.genPurple,
                  bg: "#EBF0FD",
                  icon: "📚",
                  label: s.subject,
                };
                return (
                  <View key={s.subject} style={styles.subjectCard}>
                    <View style={[styles.subjectIcon, { backgroundColor: visual.bg }]}>
                      <Text style={styles.subjectEmoji}>{visual.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectName}>{visual.label}</Text>
                      <Text style={styles.subjectMeta}>Grade {s.grade}</Text>
                    </View>
                    <Pressable
                      style={[styles.startBtn, { backgroundColor: visual.color }]}
                      onPress={() => handleStartTest(s)}
                      disabled={creating}
                    >
                      <Text style={styles.startBtnText}>
                        {creating ? "…" : "Start"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <EmptyState
            icon="📚"
            title="No subjects yet"
            message="Start chatting to enroll in subjects."
            fullScreen={false}
          />
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
  const visual = subjectVisual[submission.subject?.toLowerCase() ?? ""] ?? {
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
      <View
        style={[
          styles.scoreBadge,
          { backgroundColor: visual.color + "18", borderColor: visual.color + "44" },
        ]}
      >
        <Text style={[styles.scoreText, { color: visual.color }]}>{pct}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },
  heading: { fontFamily: fonts.nunito, fontSize: 26, color: colors.text, marginBottom: 4 },
  sub: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted, marginBottom: 16 },

  subjectRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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

  subjectCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectEmoji: { fontSize: 22 },
  subjectName: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  subjectMeta: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  startBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
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
  submIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  submEmoji: { fontSize: 18 },
  submSubject: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text },
  submChapter: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMid, marginTop: 1 },
  submDate: { fontFamily: fonts.dm, fontSize: 10, color: colors.textMuted, marginTop: 1 },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  scoreText: { fontFamily: fonts.dmBold, fontSize: 14 },
});
