import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/Screen";
import { colors, fonts } from "@/theme/tokens";

const AVATAR_COLORS = [colors.genPurple, colors.genBlue, colors.edGreen, colors.coral, colors.sun];

const STATS = [
  { icon: "🔥", val: 7, label: "day streak", color: colors.sun },
  { icon: "📚", val: 24, label: "sessions", color: colors.genBlue },
  { icon: "⭐", val: 9, label: "longest streak", color: colors.genPurple },
];

const TRAITS = [
  { icon: "🎧", title: "Learning Style", desc: "Visual, learns by examples" },
  { icon: "✨", title: "Interests", desc: "Space, cricket, video games" },
  { icon: "💪", title: "Strengths", desc: "Reading comprehension, curiosity" },
  { icon: "🎯", title: "Growing On", desc: "Algebra, time management" },
];

const BADGES = [
  { icon: "🎯", label: "First Session", earned: true, color: colors.genPurple },
  { icon: "🔥", label: "3-Day Streak", earned: true, color: colors.sun },
  { icon: "📖", label: "Explorer", earned: true, color: colors.genBlue },
  { icon: "🏆", label: "Quiz Champion", earned: false, color: colors.edGreen },
  { icon: "⭐", label: "Shapes Master", earned: false, color: colors.sun },
  { icon: "🚀", label: "7-Day Streak", earned: true, color: colors.coral },
];

export default function Me() {
  const [avatarColor, setAvatarColor] = useState<string>(colors.genPurple);

  return (
    <Screen background={colors.pageBg}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* hero */}
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <View style={styles.dots}>
            {AVATAR_COLORS.map((c) => {
              const active = c === avatarColor;
              return (
                <Pressable
                  key={c}
                  onPress={() => setAvatarColor(c)}
                  style={[styles.dot, { backgroundColor: c, width: active ? 20 : 16, height: active ? 20 : 16 }, active && { borderWidth: 2, borderColor: "#fff" }]}
                />
              );
            })}
          </View>
          <Text style={styles.name}>Aarav Sharma</Text>
          <Text style={styles.grade}>Grade 9 · CBSE</Text>
          <Text style={styles.tutor}>AI Tutor: Nia</Text>
          <View style={styles.statRow}>
            {STATS.map((s) => (
              <View key={s.label} style={styles.statCell}>
                <Text style={[styles.statV, { color: s.color }]}>{s.icon} {s.val}</Text>
                <Text style={styles.statL}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* how nia sees you */}
        <View style={styles.sees}>
          <View style={styles.seesHead}>
            <Text style={{ fontSize: 15 }}>🧠</Text>
            <Text style={styles.seesLabel}>HOW NIA SEES YOU</Text>
          </View>
          {TRAITS.map((t) => (
            <View key={t.title} style={styles.trait}>
              <Text style={{ fontSize: 18 }}>{t.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.traitTitle}>{t.title}</Text>
                <Text style={styles.traitDesc}>{t.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* tutor voice */}
        <View style={styles.voice}>
          <Text style={{ fontSize: 17 }}>🎙️</Text>
          <Text style={styles.voiceLabel}>TUTOR VOICE</Text>
          <Text style={styles.voiceVal}>Kore</Text>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="m6 9 6 6 6-6" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </View>

        {/* badges */}
        <Text style={styles.badgeHead}>🏅 Achievements</Text>
        <View style={styles.badges}>
          {BADGES.map((b) => (
            <View
              key={b.label}
              style={[
                styles.badge,
                b.earned
                  ? { backgroundColor: b.color + "14", borderColor: b.color + "40" }
                  : { backgroundColor: colors.reportBg, borderColor: colors.border, opacity: 0.6 },
              ]}
            >
              <View style={[styles.badgeIc, b.earned && { backgroundColor: b.color + "26" }]}>
                <Text style={{ fontSize: 20 }}>{b.icon}</Text>
              </View>
              <Text style={[styles.badgeLabel, { color: b.earned ? b.color : colors.textMuted }]}>{b.label}</Text>
              {!b.earned && <Text style={styles.lock}>🔒</Text>}
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },
  hero: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 24, alignItems: "center", marginBottom: 14 },
  avatar: { width: 80, height: 80, borderRadius: 26, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff" },
  avatarText: { color: "#fff", fontFamily: fonts.nunito, fontSize: 32 },
  dots: { flexDirection: "row", gap: 6, marginTop: 12, alignItems: "center" },
  dot: { borderRadius: 999 },
  name: { fontFamily: fonts.nunito, fontSize: 24, color: colors.text, marginTop: 13 },
  grade: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMid, marginTop: 4 },
  tutor: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMuted, marginTop: 4 },
  statRow: { flexDirection: "row", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, width: "100%", justifyContent: "space-around" },
  statCell: { alignItems: "center", flex: 1 },
  statV: { fontFamily: fonts.nunito, fontSize: 19 },
  statL: { fontFamily: fonts.dmBold, fontSize: 9.5, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },

  sees: { backgroundColor: "#5B4DC70a", borderWidth: 1, borderColor: "#5B4DC712", borderRadius: 24, padding: 20, marginBottom: 14 },
  seesHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  seesLabel: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.genPurple, letterSpacing: 1.2 },
  trait: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, marginBottom: 10 },
  traitTitle: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text },
  traitDesc: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMid, marginTop: 2, lineHeight: 16 },

  voice: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: 24, paddingHorizontal: 22, paddingVertical: 18, marginBottom: 14 },
  voiceLabel: { flex: 1, fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMuted, letterSpacing: 1.4 },
  voiceVal: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.genPurple },

  badgeHead: { fontFamily: fonts.nunito, fontSize: 14, color: colors.text, marginBottom: 12, marginLeft: 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badge: { width: "31%", flexGrow: 1, alignItems: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 18, borderWidth: 1.5 },
  badgeIc: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#EDF2F7" },
  badgeLabel: { fontFamily: fonts.dmBold, fontSize: 9.5, textAlign: "center", lineHeight: 13 },
  lock: { position: "absolute", top: 8, right: 10, fontSize: 9 },
});
