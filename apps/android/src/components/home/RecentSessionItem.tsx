import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ProgressRing } from "../ProgressRing";
import { colors, fonts, subjectVisual } from "../../theme/tokens";
import type { ChatSession } from "../../types/api";

interface Props {
  session: ChatSession;
}

export function RecentSessionItem({ session }: Props) {
  const router = useRouter();
  const raw = session as any;
  const subjectKey = resolveVisualKey(
    raw.subject ?? raw.subject_name ?? raw.name ?? ""
  );
  const visual = subjectVisual[subjectKey] ?? {
    color: colors.genPurple,
    bg: "#EBF0FD",
    icon: "💬",
    label: raw.subject ?? raw.subject_name ?? "Session",
  };

  const mastery = raw.message_count ? Math.min(100, raw.message_count * 4) : 50;

  const handlePress = () => {
    router.push({
      pathname: "/chat",
      params: {
        sessionId: raw.session_id ?? raw.id,
        subject: subjectKey || "mathematics",
        grade: raw.grade ?? 9,
      },
    });
  };

  return (
    <Pressable style={styles.row} onPress={handlePress}>
      <View style={[styles.iconWrap, { backgroundColor: visual.bg }]}>
        <Text style={styles.icon}>{visual.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {raw.title ?? raw.last_message ?? raw.session_title ?? `${visual.label} session`}
        </Text>
        <Text style={styles.meta}>
          {visual.label}
          {raw.last_active ? ` · ${formatRelativeTime(raw.last_active)}` : ""}
        </Text>
      </View>
      <ProgressRing percent={mastery} size={38} stroke={3.5} color={visual.color} fontSize={10} />
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

function resolveVisualKey(raw: string): string {
  if (!raw) return "";
  const s = raw.toLowerCase().replace(/[_\s-]/g, "");
  if (s.includes("math"))    return "mathematics";
  if (s.includes("english")) return "english";
  if (s.includes("science")) return "science";
  if (s.includes("hindi"))   return "hindi";
  return raw.toLowerCase();
}

function formatRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  } catch {
    return "Recently";
  }
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 17 },
  title: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text },
  meta: { fontFamily: fonts.dm, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  chev: { color: colors.textFaint, fontSize: 18 },
});
