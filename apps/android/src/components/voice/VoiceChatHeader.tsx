/**
 * Compact header for the voice chat screen.
 * Shows back button, subject name, and connection quality dot.
 */
import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, fonts } from "../../theme/tokens";
import type { ConnectionQuality } from "../../hooks/useVoiceChat";

interface Props {
  subject: string;
  connectionQuality: ConnectionQuality;
  onBack: () => void;
}

const QUALITY_COLORS: Record<ConnectionQuality, string> = {
  good: "#34C759",
  poor: "#F0AD4E",
  reconnecting: "#EF4444",
};

export function VoiceChatHeader({ subject, connectionQuality, onBack }: Props) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backBtn} onPress={onBack}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M19 12H5m0 0l7 7m-7-7l7-7" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>
          {subject.charAt(0).toUpperCase() + subject.slice(1)}
        </Text>
        <View style={styles.qualityRow}>
          <View style={[styles.qualityDot, { backgroundColor: QUALITY_COLORS[connectionQuality] }]} />
          <Text style={styles.qualityText}>
            {connectionQuality === "good" ? "Connected" : connectionQuality === "poor" ? "Poor connection" : "Reconnecting…"}
          </Text>
        </View>
      </View>

      {/* Spacer to balance the back button */}
      <View style={{ width: 44 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#fff",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.nunito,
    fontSize: 16,
    color: colors.text,
  },
  qualityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  qualityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  qualityText: {
    fontFamily: fonts.dm,
    fontSize: 11,
    color: colors.textMuted,
  },
});
