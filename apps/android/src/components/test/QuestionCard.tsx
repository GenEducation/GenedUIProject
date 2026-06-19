/**
 * QuestionCard — memoized dispatcher for one question in the runner FlatList.
 * Renders mobile-native inputs per question.type. The composite types
 * (true_false + justification, match_the_following) encode into the single
 * `value` string via answerUtils so the runner only tracks answers[qid].
 */
import React, { memo, useCallback } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { colors, fonts } from "../../theme/tokens";
import type { Question } from "../../types/test";
import { encodeTrueFalse, marksLabel } from "./answerUtils";
import { MatchTheFollowing } from "./MatchTheFollowing";

interface Props {
  question: Question;
  questionNumber: number;
  value?: string;
  onChange: (questionId: string, value: string) => void;
}

function QuestionCardImpl({ question, questionNumber, value, onChange }: Props) {
  const set = useCallback((v: string) => onChange(question.question_id, v), [onChange, question.question_id]);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.qNum}>Q{questionNumber}</Text>
        <View style={styles.marksChip}>
          <Text style={styles.marksText}>{marksLabel(question.marks)}</Text>
        </View>
      </View>
      {renderBody(question, value, set)}
    </View>
  );
}

function renderBody(question: Question, value: string | undefined, set: (v: string) => void) {
  switch (question.type) {
    case "multiple_choice":
    case "assertion_reasoning":
      return <ChoiceQuestion question={question} value={value} onSelect={set} />;
    case "true_false":
      return <TrueFalse question={question} value={value} onChange={set} />;
    case "match_the_following":
      return <MatchTheFollowing question={question} value={value} onChange={set} />;
    case "extract_based":
      return <TextAnswer question={question} value={value} onChange={set} extract />;
    default:
      // short_answer | long_answer | open_ended | application | fill_in_the_blank
      return <TextAnswer question={question} value={value} onChange={set} />;
  }
}

/** Radio-style single select (MCQ + assertion/reasoning). */
function ChoiceQuestion({ question, value, onSelect }: { question: Question; value?: string; onSelect: (v: string) => void }) {
  const isAR = question.type === "assertion_reasoning";
  return (
    <View style={{ gap: 12 }}>
      {isAR && question.assertion && question.reason ? (
        <View style={{ gap: 8 }}>
          <View style={[styles.arBox, { backgroundColor: "#EFF4FF", borderColor: "#BFD3FF" }]}>
            <Text style={[styles.arLabel, { color: "#2563EB" }]}>ASSERTION (A)</Text>
            <Text style={styles.arText}>{question.assertion}</Text>
          </View>
          <View style={[styles.arBox, { backgroundColor: "#FFF8EC", borderColor: "#FCE3B5" }]}>
            <Text style={[styles.arLabel, { color: "#B45309" }]}>REASON (R)</Text>
            <Text style={styles.arText}>{question.reason}</Text>
          </View>
          <Text style={styles.hint}>Choose the correct option</Text>
        </View>
      ) : (
        <Text style={styles.prompt}>{question.prompt}</Text>
      )}
      <View style={{ gap: 10 }}>
        {(question.options ?? []).map((opt, i) => {
          const selected = value === opt;
          return (
            <Pressable
              key={i}
              onPress={() => onSelect(opt)}
              style={[styles.option, selected && styles.optionSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              hitSlop={4}
            >
              <View style={[styles.radio, selected && styles.radioOn]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TrueFalse({ question, value, onChange }: { question: Question; value?: string; onChange: (v: string) => void }) {
  const verdict = value?.startsWith("True") ? "True" : value?.startsWith("False") ? "False" : "";
  const justification = verdict ? (value ?? "").slice(verdict.length).replace(/^\.\s*/, "") : "";

  const pick = (v: string) => onChange(encodeTrueFalse(v, justification));
  const setJustification = (j: string) => onChange(encodeTrueFalse(verdict || "True", j));

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.prompt}>{question.prompt}</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {["True", "False"].map((opt) => {
          const selected = verdict === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => pick(opt)}
              style={[styles.tfBtn, selected && styles.optionSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.tfText, selected && styles.optionTextSelected]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {question.justification_required && verdict ? (
        <View style={{ gap: 6 }}>
          <Text style={styles.hint}>Explain your answer</Text>
          <TextInput
            value={justification}
            onChangeText={setJustification}
            placeholder="Write your justification…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.input}
          />
        </View>
      ) : null}
    </View>
  );
}

function TextAnswer({ question, value, onChange, extract }: { question: Question; value?: string; onChange: (v: string) => void; extract?: boolean }) {
  return (
    <View style={{ gap: 12 }}>
      {extract && question.extract_passage ? (
        <View style={styles.passage}>
          <Text style={styles.passageLabel}>PASSAGE</Text>
          <Text style={styles.passageText}>{question.extract_passage}</Text>
        </View>
      ) : null}
      <Text style={styles.prompt}>{question.prompt}</Text>
      <TextInput
        value={value ?? ""}
        onChangeText={onChange}
        placeholder="Type your answer…"
        placeholderTextColor={colors.textMuted}
        multiline
        style={[styles.input, styles.inputTall]}
      />
    </View>
  );
}

export const QuestionCard = memo(QuestionCardImpl);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qNum: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMuted, letterSpacing: 1 },
  marksChip: { backgroundColor: colors.pageBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  marksText: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.textMid, textTransform: "uppercase", letterSpacing: 0.5 },
  prompt: { fontFamily: fonts.dmMedium, fontSize: 15, lineHeight: 22, color: colors.text },
  hint: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMid, textTransform: "uppercase", letterSpacing: 0.5 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  optionSelected: { borderColor: colors.genPurple, backgroundColor: colors.genPurple + "0E" },
  optionText: { flex: 1, fontFamily: fonts.dmMedium, fontSize: 14, color: colors.textMid },
  optionTextSelected: { color: colors.text },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.textFaint, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: colors.genPurple, backgroundColor: colors.genPurple },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff" },
  tfBtn: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  tfText: { fontFamily: fonts.dmBold, fontSize: 15, color: colors.textMid },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    fontFamily: fonts.dm,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.card,
    minHeight: 48,
    textAlignVertical: "top",
  },
  inputTall: { minHeight: 90 },
  arBox: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 4 },
  arLabel: { fontFamily: fonts.dmBold, fontSize: 10, letterSpacing: 1 },
  arText: { fontFamily: fonts.dmMedium, fontSize: 14, lineHeight: 21, color: colors.text },
  passage: { backgroundColor: colors.pageBg, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 6 },
  passageLabel: { fontFamily: fonts.dmBold, fontSize: 10, letterSpacing: 1, color: colors.textMuted },
  passageText: { fontFamily: fonts.dm, fontSize: 13, lineHeight: 20, color: colors.textMid },
});
