import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts, subjectVisual } from "../../theme/tokens";
import type { SubjectInfo } from "../../types/api";

interface Props {
  subject: SubjectInfo;
}

export function SubjectCard({ subject }: Props) {
  const router = useRouter();

  // The API may use different field names — try all common variants
  const raw = subject as any;
  const subjectKey: string =
    raw.subject ?? raw.subject_name ?? raw.name ?? raw.subject_id ?? "";

  // Fuzzy match: "english_language" → "english", "maths" → "mathematics"
  const visualKey = resolveVisualKey(subjectKey);
  const visual = subjectVisual[visualKey] ?? {
    color: colors.genPurple,
    bg: "#EBF0FD",
    icon: "📚",
    label: formatLabel(subjectKey),
  };

  // mastery may live under different field names too
  const mastery: number =
    raw.mastery ?? raw.mastery_percentage ?? raw.overall_mastery ?? 0;

  // chapters count
  const chapters: number | undefined =
    raw.total_chapters ?? raw.chapters_count ?? raw.chapter_count ?? undefined;

  const grade: number | undefined = raw.grade ?? raw.grade_level ?? undefined;

  const agentId: string | undefined = raw.agent_id ?? undefined;

  const handleChat = () => {
    router.push({
      pathname: "/chat",
      params: {
        subject: subjectKey,
        grade: grade ?? 9,
        ...(agentId ? { agentId } : {}),
      },
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: visual.bg }]}>
          <Text style={styles.icon}>{visual.icon}</Text>
        </View>
        <View>
          <Text style={styles.name}>{visual.label}</Text>
          <Text style={styles.meta}>
            {grade ? `Grade ${grade}` : ""}
            {chapters ? `${grade ? " · " : ""}${chapters} chapters` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.barRow}>
        <View style={styles.barTrack}>
          <View
            style={{
              width: `${mastery}%`,
              height: "100%",
              borderRadius: 999,
              backgroundColor: visual.color,
            }}
          />
        </View>
        <Text style={[styles.masteryPct, { color: visual.color }]}>{mastery}%</Text>
      </View>

      <View style={styles.btns}>
        <Pressable
          style={[styles.btn, styles.btnOutline, { borderColor: visual.color + "66" }]}
          onPress={handleChat}
        >
          <Text style={[styles.btnText, { color: visual.color }]}>Chat</Text>
        </Pressable>
        <Pressable style={[styles.btn, { backgroundColor: visual.color }]}>
          <Text style={[styles.btnText, { color: "#fff" }]}>Voice</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Map messy API keys → our subjectVisual keys */
function resolveVisualKey(raw: string): string {
  if (!raw) return "";
  const s = raw.toLowerCase().replace(/[_\s-]/g, "");
  if (s.includes("math"))    return "mathematics";
  if (s.includes("english")) return "english";
  if (s.includes("science")) return "science";
  if (s.includes("hindi"))   return "hindi";
  // Try direct match first
  return raw.toLowerCase();
}

/** Title-case a snake_case or camelCase key */
function formatLabel(raw: string): string {
  if (!raw) return "Subject";
  return raw
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 22 },
  name: { fontFamily: fonts.nunitoBold, fontSize: 15, color: colors.text },
  meta: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  barTrack: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#EEF0F5",
    overflow: "hidden",
  },
  masteryPct: { fontFamily: fonts.dmBold, fontSize: 13 },
  btns: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutline: { borderWidth: 1.5, backgroundColor: "transparent" },
  btnText: { fontFamily: fonts.dmBold, fontSize: 12 },
});
