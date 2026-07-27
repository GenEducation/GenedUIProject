import React from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import { History } from "lucide-react-native";
import { colors, fonts } from "../../theme/tokens";

// Favicon1.jpg — the circular AI avatar used on the web in ChatMessageBubble
const FAVICON = require("../../../assets/Favicon1.jpg");

export type ChatConnectionQuality = "good" | "poor" | "reconnecting";

interface Props {
  subject?: string;
  /** True while the AI is generating a reply — shows "Thinking…" over the status dot. */
  isThinking?: boolean;
  /** Real connection state, not a decorative always-on dot. */
  connectionQuality?: ChatConnectionQuality;
  /** When provided, shows a history button on the right that opens the sessions sheet. */
  onOpenSessions?: () => void;
}

export function ChatHeader({ subject, isThinking = false, connectionQuality = "good", onOpenSessions }: Props) {
  const router = useRouter();

  const statusColor =
    connectionQuality === "poor" ? colors.coral : connectionQuality === "reconnecting" ? colors.sun : colors.growth;
  const statusLabel = isThinking
    ? "Thinking…"
    : connectionQuality === "poor"
    ? "Poor connection"
    : connectionQuality === "reconnecting"
    ? "Reconnecting…"
    : "Active";

  return (
    <View style={styles.row}>
      {/* Back button */}
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="m15 6-6 6 6 6"
            stroke={colors.text}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      </Pressable>

      {/* AI avatar — Favicon1.jpg (matches web ChatMessageBubble) */}
      <View style={styles.avatarWrap}>
        <Image source={FAVICON} style={styles.avatarImg} resizeMode="cover" />
      </View>

      {/* Name + status */}
      <View style={styles.info}>
        <Text style={styles.name}>
          {subject ? `${capitalize(subject)} Tutor` : "GenEd Tutor"}
        </Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Sessions / history button */}
      {onOpenSessions ? (
        <Pressable onPress={onOpenSessions} hitSlop={10} style={styles.histBtn}>
          <History size={20} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#fff",
  },
  back: { padding: 2 },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarImg: {
    width: 36,
    height: 36,
  },
  info: { flex: 1 },
  histBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.pageBg,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  status: { fontFamily: fonts.dm, fontSize: 11 },
});
