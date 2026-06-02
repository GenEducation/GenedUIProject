import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { useMeData } from "@/hooks/useMeData";
import { useAuth } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { studentService } from "@/services/studentService";
import { colors, fonts } from "@/theme/tokens";
import type { VoiceOption } from "@/types/api";

const AVATAR_COLORS = [
  colors.genPurple,
  colors.genBlue,
  colors.edGreen,
  colors.coral,
  colors.sun,
];

export default function Me() {
  const { state, logout } = useAuth();
  const router = useRouter();
  const { profile, streak, voices, loading, error, refetch } = useMeData();

  const handleLogout = async () => {
    await logout();
    router.replace("/sign-in");
  };
  const [avatarColor, setAvatarColor] = useState<string>(colors.genPurple);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [voiceUpdating, setVoiceUpdating] = useState(false);

  if (loading) {
    return (
      <Screen background={colors.pageBg}>
        <LoadingState message="Loading your profile…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen background={colors.pageBg}>
        <ErrorState message="Couldn't load your profile." onRetry={refetch} />
      </Screen>
    );
  }

  const displayProfile =
    profile ??
    (state.status === "authenticated" ? state.profile : null);

  const firstName = (displayProfile?.name ?? displayProfile?.username ?? "?")
    .split(" ")[0];
  const initial = firstName[0]?.toUpperCase() ?? "?";
  const grade = displayProfile?.grade;
  const board = displayProfile?.school_board;
  const aiName = displayProfile?.ai_name ?? "Nia";
  const currentVoice = selectedVoice ?? displayProfile?.preferred_voice ?? "—";

  const statItems = [
    { icon: "🔥", val: streak?.current_streak ?? 0,  label: "day streak", color: colors.sun },
    { icon: "📚", val: streak?.total_sessions ?? 0,   label: "sessions",   color: colors.genBlue },
    { icon: "⭐", val: streak?.longest_streak ?? 0,  label: "best streak", color: colors.genPurple },
  ];

  const handleVoiceChange = async (voice: VoiceOption) => {
    if (!displayProfile?.user_id || voiceUpdating) return;
    setSelectedVoice(voice.id);
    setVoiceUpdating(true);
    try {
      await studentService.updateProfile({
        user_id: displayProfile.user_id,
        preferred_voice: voice.id,
      });
    } catch {
      // revert on failure
      setSelectedVoice(displayProfile?.preferred_voice ?? null);
    } finally {
      setVoiceUpdating(false);
    }
  };

  return (
    <Screen background={colors.pageBg}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.dots}>
            {AVATAR_COLORS.map((c) => {
              const active = c === avatarColor;
              return (
                <Pressable
                  key={c}
                  onPress={() => setAvatarColor(c)}
                  style={[
                    styles.dot,
                    { backgroundColor: c, width: active ? 20 : 16, height: active ? 20 : 16 },
                    active && { borderWidth: 2, borderColor: "#fff" },
                  ]}
                />
              );
            })}
          </View>
          <Text style={styles.name}>
            {displayProfile?.name ?? displayProfile?.username ?? "—"}
          </Text>
          {(grade || board) ? (
            <Text style={styles.grade}>
              {grade ? `Grade ${grade}` : ""}
              {grade && board ? " · " : ""}
              {board ?? ""}
            </Text>
          ) : null}
          <Text style={styles.tutor}>AI Tutor: {aiName}</Text>

          <View style={styles.statRow}>
            {statItems.map((s) => (
              <View key={s.label} style={styles.statCell}>
                <Text style={[styles.statV, { color: s.color }]}>
                  {s.icon} {s.val}
                </Text>
                <Text style={styles.statL}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tutor Voice */}
        {voices.length > 0 ? (
          <View style={styles.voiceSection}>
            <View style={styles.voiceHeader}>
              <Text style={{ fontSize: 17 }}>🎙️</Text>
              <Text style={styles.voiceLabel}>TUTOR VOICE</Text>
              <Text style={styles.voiceVal}>
                {voices.find((v) => v.id === currentVoice)?.label ?? currentVoice}
              </Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="m6 9 6 6 6-6"
                  stroke={colors.textMuted}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <View style={styles.voiceList}>
              {voices.map((v) => (
                <Pressable
                  key={v.id}
                  style={[
                    styles.voiceChip,
                    currentVoice === v.id && styles.voiceChipActive,
                  ]}
                  onPress={() => handleVoiceChange(v)}
                  disabled={voiceUpdating}
                >
                  <Text
                    style={[
                      styles.voiceChipText,
                      currentVoice === v.id && styles.voiceChipTextActive,
                    ]}
                  >
                    {v.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          /* Fallback if voices API not available */
          <View style={styles.voiceSection}>
            <View style={styles.voiceHeader}>
              <Text style={{ fontSize: 17 }}>🎙️</Text>
              <Text style={styles.voiceLabel}>TUTOR VOICE</Text>
              <Text style={styles.voiceVal}>{currentVoice}</Text>
            </View>
          </View>
        )}

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },

  hero: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarText: { color: "#fff", fontFamily: fonts.nunito, fontSize: 32 },
  dots: { flexDirection: "row", gap: 6, marginTop: 12, alignItems: "center" },
  dot: { borderRadius: 999 },
  name: {
    fontFamily: fonts.nunito,
    fontSize: 24,
    color: colors.text,
    marginTop: 13,
  },
  grade: {
    fontFamily: fonts.dmBold,
    fontSize: 13,
    color: colors.textMid,
    marginTop: 4,
  },
  tutor: {
    fontFamily: fonts.dmBold,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  statRow: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: "100%",
    justifyContent: "space-around",
  },
  statCell: { alignItems: "center", flex: 1 },
  statV: { fontFamily: fonts.nunito, fontSize: 19 },
  statL: {
    fontFamily: fonts.dmBold,
    fontSize: 9.5,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },

  voiceSection: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  voiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  voiceLabel: {
    flex: 1,
    fontFamily: fonts.dmBold,
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 1.4,
  },
  voiceVal: {
    fontFamily: fonts.dmBold,
    fontSize: 14,
    color: colors.genPurple,
  },
  voiceList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  voiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
  },
  voiceChipActive: {
    borderColor: colors.genPurple,
    backgroundColor: colors.genPurple + "12",
  },
  voiceChipText: {
    fontFamily: fonts.dmBold,
    fontSize: 12,
    color: colors.textMid,
  },
  voiceChipTextActive: { color: colors.genPurple },

  logoutBtn: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: colors.coral + "66",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.coral + "0a",
  },
  logoutText: {
    fontFamily: fonts.dmBold,
    fontSize: 14,
    color: colors.coral,
  },
});
