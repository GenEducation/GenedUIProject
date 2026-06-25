/**
 * Test runner — mobile-first, one section per screen.
 * Section navigation via pills (A / B / C). Timer auto-submits.
 * Receives full testData JSON from practice to skip re-fetch.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, LayoutGrid, Send } from "lucide-react-native";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { QuestionCard } from "@/components/test/QuestionCard";
import { PaperHeader, SectionDivider } from "@/components/test/PaperHeader";
import { TestTimer } from "@/components/test/TestTimer";
import { QuestionNavSheet } from "@/components/test/QuestionNavSheet";
import { TestResultsView } from "@/components/test/TestResultsView";
import { studentService } from "@/services/studentService";
import { colors, fonts } from "@/theme/tokens";
import type {
  CreateChapterTestResponse,
  GroupedSection,
  PaperSection,
  SubmitTestResponse,
  Question,
} from "@/types/test";

const SCREEN_H = Dimensions.get("window").height;

export default function TestRunner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { testId, testData } = useLocalSearchParams<{ testId?: string; testData?: string }>();

  const [test, setTest] = useState<CreateChapterTestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitTestResponse | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const listRef = useRef<FlatList<Question>>(null);

  const load = useCallback(async () => {
    // If full test data was passed as param (from practice), parse it directly
    if (testData) {
      try {
        const parsed = JSON.parse(testData) as CreateChapterTestResponse;
        setTest(parsed);
        setLoading(false);
        return;
      } catch {
        // Fall through to network fetch
      }
    }
    if (!testId) { setLoadError(true); setLoading(false); return; }
    setLoading(true);
    setLoadError(false);
    try {
      const t = await studentService.getTest(testId);
      setTest(t);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [testId, testData]);

  useEffect(() => { load(); }, [load]);

  const groups: GroupedSection[] = useMemo(() => {
    if (!test) return [];
    const sections = test.sections ?? [];
    const all = sections.flatMap((s) => s.questions ?? []);
    if (!all.length) return [];
    const hasPaper = !!test.paper_meta?.sections?.length;
    if (hasPaper) {
      return (["A", "B", "C"] as PaperSection[])
        .map((label) => ({ label, questions: all.filter((q) => q.paper_section === label) }))
        .filter((g) => g.questions.length > 0);
    }
    return sections.map((s, i) => ({
      label: String.fromCharCode(65 + i) as PaperSection,
      questions: s.questions ?? [],
    })).filter((g) => g.questions.length > 0);
  }, [test]);

  const totalQuestions = useMemo(() => groups.reduce((n, g) => n + g.questions.length, 0), [groups]);
  const answeredCount = useMemo(
    () => groups.flatMap((g) => g.questions).filter((q) => !!answers[q.question_id]).length,
    [groups, answers]
  );

  const setAnswer = useCallback((qid: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }, []);

  const doSubmit = useCallback(async () => {
    if (!test || submitting) return;
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const all = (test.sections ?? []).flatMap((s) => s.questions ?? []);
      const payload = all
        .filter((q) => answers[q.question_id])
        .map((q) => ({ question_id: q.question_id, student_answer: answers[q.question_id] }));
      const res = await studentService.submitTest(test.test_id, payload);
      setResult(res);
    } catch {
      setLoadError(true);
    } finally {
      setSubmitting(false);
    }
  }, [test, answers, submitting]);

  const handleSubmitClick = () => {
    if (totalQuestions - answeredCount > 0) setConfirmOpen(true);
    else doSubmit();
  };

  const jumpToSection = (idx: number) => {
    setSectionIdx(idx);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <LoadingState message="Preparing your assessment…" />
      </View>
    );
  }
  if (loadError || !test) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ErrorState message="Couldn't load this test." onRetry={load} />
      </View>
    );
  }

  if (result) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.resultHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.resultHeaderTitle} numberOfLines={1}>{test.document_title}</Text>
        </View>
        <TestResultsView test={test} result={result} onClose={() => router.back()} />
      </View>
    );
  }

  const group = groups[sectionIdx];
  const isLast = sectionIdx === groups.length - 1;
  const startNum = groups.slice(0, sectionIdx).reduce((n, g) => n + g.questions.length, 0);
  const sectionMeta = test.paper_meta?.sections?.find((s) => s.label === group?.label);
  const timerSeconds = (test.paper_meta?.suggested_time_minutes ?? 30) * 60;
  const progressPct = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={{ paddingTop: insets.top, flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{test.document_title || "Assessment"}</Text>
          <TestTimer seconds={timerSeconds} onExpire={doSubmit} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
        </View>
        <Text style={styles.progressLabel}>{answeredCount} of {totalQuestions} answered</Text>

        {/* Section pills */}
        {groups.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            {groups.map((g, i) => {
              const sectionAnswered = g.questions.filter((q) => !!answers[q.question_id]).length;
              const isActive = i === sectionIdx;
              return (
                <Pressable
                  key={g.label}
                  onPress={() => jumpToSection(i)}
                  style={[styles.pill, isActive && styles.pillActive]}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {g.label}
                  </Text>
                  <Text style={[styles.pillCount, isActive && styles.pillCountActive]}>
                    {sectionAnswered}/{g.questions.length}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Questions */}
        <FlatList
          ref={listRef}
          data={group?.questions ?? []}
          keyExtractor={(q) => q.question_id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              {sectionIdx === 0 ? (
                <PaperHeader
                  title={test.document_title}
                  subject={test.subject}
                  grade={test.grade}
                  paperMeta={test.paper_meta}
                />
              ) : null}
              {group ? <SectionDivider label={group.label} meta={sectionMeta} /> : null}
            </View>
          }
          renderItem={({ item, index }) => (
            <QuestionCard
              question={item}
              questionNumber={startNum + index + 1}
              value={answers[item.question_id]}
              onChange={setAnswer}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable onPress={() => setNavOpen(true)} style={styles.gridBtn}>
            <LayoutGrid size={18} color={colors.genPurple} />
          </Pressable>

          {isLast ? (
            <Pressable
              onPress={handleSubmitClick}
              disabled={submitting}
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
            >
              <Text style={styles.primaryText}>{submitting ? "Submitting…" : "Submit Test"}</Text>
              {!submitting ? <Send size={16} color="#fff" /> : null}
            </Pressable>
          ) : (
            <Pressable
              onPress={() => jumpToSection(sectionIdx + 1)}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryText}>Next Section</Text>
              <Text style={styles.primarySub}>→ Section {groups[sectionIdx + 1]?.label}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <QuestionNavSheet
        visible={navOpen}
        sections={groups}
        answers={answers}
        onClose={() => setNavOpen(false)}
        onJump={(sIdx) => { jumpToSection(sIdx); setNavOpen(false); }}
      />

      <ConfirmSheet
        visible={confirmOpen}
        unanswered={totalQuestions - answeredCount}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
      />
    </KeyboardAvoidingView>
  );
}

function ConfirmSheet({ visible, unanswered, onCancel, onConfirm }: {
  visible: boolean; unanswered: number; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={styles.confirmSheet}>
          <View style={styles.grabber} />
          <Text style={styles.confirmTitle}>
            {unanswered} {unanswered === 1 ? "question" : "questions"} unanswered
          </Text>
          <Text style={styles.confirmBody}>
            Unanswered questions score 0. Submit anyway?
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
            <Pressable style={[styles.confirmBtn, styles.confirmGhost]} onPress={onCancel}>
              <Text style={styles.confirmGhostText}>Go Back</Text>
            </Pressable>
            <Pressable style={[styles.confirmBtn, styles.confirmSolid]} onPress={onConfirm}>
              <Text style={styles.confirmSolidText}>Submit</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.pageBg,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { flex: 1, fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  resultHeaderTitle: { flex: 1, fontFamily: fonts.dmBold, fontSize: 15, color: colors.text },

  progressTrack: { height: 4, backgroundColor: colors.border },
  progressFill: { height: 4, backgroundColor: colors.genPurple },
  progressLabel: {
    fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted,
    textAlign: "right", paddingHorizontal: 14, paddingVertical: 4,
  },

  pillRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexDirection: "row" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  pillActive: { borderColor: colors.genPurple, backgroundColor: colors.genPurple + "10" },
  pillText: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMid },
  pillTextActive: { color: colors.genPurple },
  pillCount: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted },
  pillCountActive: { color: colors.genPurple },

  listContent: { padding: 16, gap: 12, paddingBottom: 24 },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  gridBtn: {
    width: 46, height: 46, borderRadius: 13,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.genPurple,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryText: { fontFamily: fonts.dmBold, fontSize: 14, color: "#fff" },
  primarySub: { fontFamily: fonts.dmBold, fontSize: 13, color: "rgba(255,255,255,0.7)" },

  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  grabber: {
    alignSelf: "center", width: 40, height: 4,
    borderRadius: 2, backgroundColor: colors.border, marginBottom: 16,
  },
  confirmSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 22, paddingBottom: 34,
    maxHeight: SCREEN_H * 0.5, gap: 8,
  },
  confirmTitle: { fontFamily: fonts.dmBold, fontSize: 17, color: colors.text, textAlign: "center" },
  confirmBody: { fontFamily: fonts.dm, fontSize: 14, color: colors.textMid, textAlign: "center", marginBottom: 6 },
  confirmBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  confirmGhost: { backgroundColor: colors.pageBg },
  confirmGhostText: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  confirmSolid: { backgroundColor: colors.genPurple },
  confirmSolidText: { fontFamily: fonts.dmBold, fontSize: 14, color: "#fff" },
});
