import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts, subjectVisual } from "../../theme/tokens";
import type { ChatSession } from "../../types/api";

interface Props {
  session: ChatSession;
}

export function ContinueLearning({ session }: Props) {
  const router = useRouter();
  const visual = subjectVisual[session.subject?.toLowerCase() ?? ""] ?? subjectVisual["mathematics"];

  const handlePress = () => {
    router.push({
      pathname: "/chat",
      params: {
        sessionId: session.session_id,
        subject: session.subject ?? "mathematics",
        grade: session.grade ?? 9,
      },
    });
  };

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <View style={[styles.bar, { backgroundColor: visual.color }]} />
      <View style={[styles.iconWrap, { backgroundColor: visual.bg }]}>
        <Text style={styles.icon}>{visual.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: visual.color }]}>CONTINUE LEARNING</Text>
        <Text style={styles.title} numberOfLines={1}>
          {session.title ?? `${visual.label} Session`}
        </Text>
        <Text style={styles.meta}>
          {session.last_active ? formatRelativeTime(session.last_active) : "Recent session"}
        </Text>
      </View>
      <View style={[styles.goBtn, { backgroundColor: visual.color }]}>
        <Text style={styles.goArrow}>→</Text>
      </View>
    </Pressable>
  );
}

function formatRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "Recently";
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    paddingLeft: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 22,
    overflow: "hidden",
  },
  bar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 26 },
  label: {
    fontFamily: fonts.dmBold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  title: { fontFamily: fonts.nunitoBold, fontSize: 15, color: colors.text },
  meta: {
    fontFamily: fonts.dm,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  goBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  goArrow: { color: "#fff", fontSize: 18, fontFamily: fonts.dmBold },
});
