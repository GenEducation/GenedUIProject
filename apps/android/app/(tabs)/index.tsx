import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/Screen";
import { ProgressRing } from "@/components/ProgressRing";
import { AprilAvatar } from "@/components/AprilAvatar";
import { colors, fonts, subjectVisual } from "@/theme/tokens";

const STATS = [
  { icon: "🔥", val: "7", unit: "Day Streak", bg: "#F0AD4E14" },
  { icon: "📚", val: "24", unit: "Sessions", bg: "#4A90D912" },
  { icon: "⭐", val: "9", unit: "Best Streak", bg: "#2D6A4F12" },
];

const SUBJECTS = [
  { key: "mathematics", grade: 9, chapters: 12, mastery: 74 },
  { key: "english", grade: 9, chapters: 8, mastery: 58 },
];

const SESSIONS = [
  { key: "science", title: "Newton's Laws of Motion", when: "Yesterday", mastery: 80 },
  { key: "hindi", title: "Essay Writing Basics", when: "2 days ago", mastery: 55 },
];

export default function Home() {
  const router = useRouter();

  return (
    <Screen background={colors.pageBg}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* greeting */}
        <View style={styles.greet}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>Morning, Aarav!</Text>
            <Text style={styles.sub}>What would you like to learn today?</Text>
          </View>
          <AprilAvatar size={52} />
        </View>

        {/* stat strip */}
        <View style={styles.stats}>
          {STATS.map((s) => (
            <View key={s.unit} style={styles.stat}>
              <View style={[styles.statIc, { backgroundColor: s.bg }]}>
                <Text style={{ fontSize: 16 }}>{s.icon}</Text>
              </View>
              <View>
                <Text style={styles.statV}>{s.val}</Text>
                <Text style={styles.statU}>{s.unit}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* continue learning */}
        <View style={styles.cont}>
          <View style={styles.contBar} />
          <ProgressRing percent={68} size={60} stroke={5} color={colors.genPurple} />
          <View style={{ flex: 1 }}>
            <Text style={styles.contLabel}>CONTINUE LEARNING</Text>
            <Text style={styles.contTitle} numberOfLines={1}>Quadratic Equations — Mathematics</Text>
            <Text style={styles.contMeta}>Last studied 2h ago</Text>
          </View>
          <View style={styles.contGo}>
            <Text style={styles.contGoText}>→</Text>
          </View>
        </View>

        {/* my subjects */}
        <SectionHead title="MY SUBJECTS" link="See all (4) →" />
        <View style={{ gap: 12 }}>
          {SUBJECTS.map((s) => {
            const v = subjectVisual[s.key];
            return (
              <View key={s.key} style={styles.subjCard}>
                <View style={styles.subjTop}>
                  <View style={[styles.subjIc, { backgroundColor: v.bg }]}>
                    <Text style={{ fontSize: 22 }}>{v.icon}</Text>
                  </View>
                  <View>
                    <Text style={styles.subjName}>{v.label}</Text>
                    <Text style={styles.subjMeta}>Grade {s.grade} · {s.chapters} chapters</Text>
                  </View>
                </View>
                <View style={styles.subjBarRow}>
                  <View style={styles.subjBar}>
                    <View style={{ width: `${s.mastery}%`, height: "100%", borderRadius: 999, backgroundColor: v.color }} />
                  </View>
                  <Text style={{ fontFamily: fonts.dmBold, fontSize: 13, color: v.color }}>{s.mastery}%</Text>
                </View>
                <View style={styles.subjBtns}>
                  <Pressable style={[styles.sbtn, styles.sbtnOut, { borderColor: v.color + "66" }]} onPress={() => router.push("/chat")}>
                    <Text style={[styles.sbtnText, { color: v.color }]}>Chat</Text>
                  </Pressable>
                  <Pressable style={[styles.sbtn, { backgroundColor: v.color }]}>
                    <Text style={[styles.sbtnText, { color: "#fff" }]}>Voice</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* recent sessions */}
        <SectionHead title="RECENT SESSIONS" link="See all →" style={{ marginTop: 22 }} />
        <View style={{ gap: 8 }}>
          {SESSIONS.map((s) => {
            const v = subjectVisual[s.key];
            return (
              <Pressable key={s.title} style={styles.sess} onPress={() => router.push("/chat")}>
                <View style={[styles.sessIc, { backgroundColor: v.bg }]}>
                  <Text style={{ fontSize: 17 }}>{v.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.sessMeta}>{v.label} · {s.when}</Text>
                </View>
                <ProgressRing percent={s.mastery} size={38} stroke={3.5} color={v.color} fontSize={10} />
                <Text style={styles.chev}>›</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionHead({ title, link, style }: { title: string; link: string; style?: object }) {
  return (
    <View style={[styles.secHead, style]}>
      <Text style={styles.secT}>{title}</Text>
      <Text style={styles.secLink}>{link}</Text>
    </View>
  );
}

const card = {
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
} as const;

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  greet: { flexDirection: "row", alignItems: "flex-start", marginBottom: 18 },
  h1: { fontFamily: fonts.nunito, fontSize: 22, color: colors.text },
  sub: { fontFamily: fonts.dmMedium, fontSize: 13, color: colors.textMid, marginTop: 5 },

  stats: { flexDirection: "row", gap: 8, marginBottom: 18 },
  stat: { ...card, flex: 1, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  statIc: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statV: { fontFamily: fonts.nunito, fontSize: 18, color: colors.text },
  statU: { fontFamily: fonts.dmBold, fontSize: 9.5, color: colors.textMuted, marginTop: 3 },

  cont: { ...card, borderRadius: 20, padding: 18, paddingLeft: 22, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 22, overflow: "hidden" },
  contBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.genPurple },
  contLabel: { fontFamily: fonts.dmBold, fontSize: 9, letterSpacing: 1.2, color: colors.genPurple, marginBottom: 3 },
  contTitle: { fontFamily: fonts.nunitoBold, fontSize: 15, color: colors.text },
  contMeta: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted, marginTop: 3 },
  contGo: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.genPurple, alignItems: "center", justifyContent: "center" },
  contGoText: { color: "#fff", fontSize: 18, fontFamily: fonts.dmBold },

  secHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  secT: { fontFamily: fonts.dmBold, fontSize: 10, letterSpacing: 1.5, color: colors.textMuted },
  secLink: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.genPurple },

  subjCard: { ...card, borderRadius: 18, padding: 16 },
  subjTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  subjIc: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  subjName: { fontFamily: fonts.nunitoBold, fontSize: 15, color: colors.text },
  subjMeta: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  subjBarRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  subjBar: { flex: 1, height: 7, borderRadius: 999, backgroundColor: "#EEF0F5", overflow: "hidden" },
  subjBtns: { flexDirection: "row", gap: 8 },
  sbtn: { flex: 1, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  sbtnOut: { borderWidth: 1.5, backgroundColor: "transparent" },
  sbtnText: { fontFamily: fonts.dmBold, fontSize: 12 },

  sess: { ...card, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  sessIc: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  sessTitle: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text },
  sessMeta: { fontFamily: fonts.dm, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  chev: { color: colors.textFaint, fontSize: 18 },
});
