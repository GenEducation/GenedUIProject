/**
 * Personalize screen — General Onboarding on mobile.
 *
 * Collects the four learner-profile traits (learning style, interests, strengths,
 * weaknesses) in a single scrollable form and submits them via
 * studentService.completeGeneralOnboarding (POST /api/onboarding/general/complete).
 * On success it routes back; the Me screen's focus-refetch repopulates the
 * "How {ai} Sees You" card.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Sparkles, Clock, ShieldCheck } from "lucide-react-native";
import { useAuth } from "@/store/useAuthStore";
import { studentService } from "@/services/studentService";
import { colors, fonts } from "@/theme/tokens";

/* Four free-text prompts — ported from the web GeneralOnboarding constants. */
const QUESTIONS = [
  {
    id: "learning_preferences",
    title: "How you learn best",
    prompt:
      "Do you learn best by watching videos, listening to explanations, or getting hands-on?",
    placeholder: "I learn best when I see diagrams or watch videos…",
  },
  {
    id: "interests",
    title: "What excites you",
    prompt: "What subjects or hobbies excite you the most?",
    placeholder: "I'm really into space exploration and solving math puzzles…",
  },
  {
    id: "strengths",
    title: "Your strengths",
    prompt: "What are your best academic or personal skills?",
    placeholder: "I'm good at explaining things and I have a strong memory…",
  },
  {
    id: "weaknesses",
    title: "Where you want to grow",
    prompt: "What areas do you find most challenging?",
    placeholder: "I sometimes struggle with time management and long writing…",
  },
] as const;

type AnswerKey = (typeof QUESTIONS)[number]["id"];

export default function Personalize() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useAuth();

  const profile = state.status === "authenticated" ? state.profile : null;
  const aiName = profile?.ai_name ?? "Nia";

  const [answers, setAnswers] = useState<Record<AnswerKey, string>>({
    learning_preferences: "",
    interests: "",
    strengths: "",
    weaknesses: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (id: AnswerKey, value: string) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const allFilled = QUESTIONS.every((q) => answers[q.id].trim().length > 0);

  const handleSubmit = async () => {
    if (!profile?.user_id || submitting || !allFilled) return;
    setSubmitting(true);
    setError(null);
    try {
      await studentService.completeGeneralOnboarding({
        student_id: profile.user_id,
        name: profile.name ?? profile.username,
        // Android UserProfile has no typed `age`; read it defensively (matches web's fallback to 0).
        age: Number((profile as { age?: number | string }).age) || 0,
        grade: Number(profile.grade) || 0,
        learning_preferences: [answers.learning_preferences.trim()],
        interests: [answers.interests.trim()],
        strengths: [answers.strengths.trim()],
        weaknesses: [answers.weaknesses.trim()],
      });
      router.back();
    } catch {
      setError("Couldn't save your answers. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10} focusable={false}>
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              Help {aiName} get to know you
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              Answer a few questions to personalize your tutor
            </Text>
          </View>
        </View>

        {/* Info strip */}
        <View style={styles.infoStrip}>
          <View style={styles.infoItem}>
            <Sparkles size={13} color={colors.genPurple} />
            <Text style={styles.infoText}>Personalized</Text>
          </View>
          <View style={styles.infoItem}>
            <Clock size={13} color={colors.genPurple} />
            <Text style={styles.infoText}>~2 min</Text>
          </View>
          <View style={styles.infoItem}>
            <ShieldCheck size={13} color={colors.genPurple} />
            <Text style={styles.infoText}>Private</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {QUESTIONS.map((q) => (
            <View key={q.id} style={styles.field}>
              <Text style={styles.fieldTitle}>{q.title}</Text>
              <Text style={styles.fieldPrompt}>{q.prompt}</Text>
              <TextInput
                style={styles.input}
                placeholder={q.placeholder}
                placeholderTextColor={colors.textMuted}
                value={answers[q.id]}
                onChangeText={(t) => update(q.id, t)}
                editable={!submitting}
                multiline
                textAlignVertical="top"
              />
            </View>
          ))}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.submitBtn, (!allFilled || submitting) && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!allFilled || submitting}
            focusable={false}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>Save & personalize</Text>
            )}
          </Pressable>

          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.pageBg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.dmBold, fontSize: 15, color: colors.text },
  subtitle: { fontFamily: fonts.dm, fontSize: 12, color: colors.textMuted, marginTop: 1 },
  infoStrip: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.genPurple + "08",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  infoText: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMid },
  content: { padding: 16, gap: 18 },
  field: { gap: 6 },
  fieldTitle: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  fieldPrompt: { fontFamily: fonts.dm, fontSize: 12, color: colors.textMid, lineHeight: 17 },
  input: {
    marginTop: 4,
    minHeight: 84,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontFamily: fonts.dm,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.pageBg,
  },
  error: { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.coral, textAlign: "center" },
  submitBtn: {
    backgroundColor: colors.genPurple,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { fontFamily: fonts.dmBold, fontSize: 14, color: "#fff" },
});
