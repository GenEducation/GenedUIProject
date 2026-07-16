import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { CalendarClock, ChevronRight } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { AprilAvatar } from "@/components/AprilAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { SectionHead } from "@/components/SectionHead";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { StatStrip } from "@/components/home/StatStrip";
import { ContinueLearning } from "@/components/home/ContinueLearning";
import { SubjectCard } from "@/components/home/SubjectCard";
import { RecentSessionItem } from "@/components/home/RecentSessionItem";
import { useHomeData } from "@/hooks/useHomeData";
import { useStudentId } from "@/hooks/useStudentId";
import { useAuth } from "@/store/useAuthStore";
import { colors, fonts } from "@/theme/tokens";

export default function Home() {
  const router = useRouter();
  const { state } = useAuth();
  const studentId = useStudentId();

  const { stats, subjects, recentSessions, loading, refreshing, hasData, error, refetch } = useHomeData();
  const [showAllSessions, setShowAllSessions] = useState(false);

  const firstName =
    state.status === "authenticated"
      ? (state.profile.name ?? state.profile.username).split(" ")[0]
      : "";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  if (loading) {
    return (
      <Screen background={colors.pageBg}>
        <LoadingState message="Loading your dashboard…" />
      </Screen>
    );
  }

  // Only fall back to the error screen when there's no cached data to show.
  if (error && !hasData) {
    return (
      <Screen background={colors.pageBg}>
        <ErrorState message="Couldn't load your dashboard." onRetry={refetch} />
      </Screen>
    );
  }

  const continueLearning = recentSessions[0] ?? null;

  return (
    <Screen background={colors.pageBg}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greet}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>{greeting}, {firstName}!</Text>
            {refreshing ? (
              <View style={styles.refreshRow}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={styles.refreshText}>Updating…</Text>
              </View>
            ) : (
              <Text style={styles.sub}>What would you like to learn today?</Text>
            )}
          </View>
          <View style={styles.greetActions}>
            <NotificationBell userId={studentId} />
            <AprilAvatar size={52} />
          </View>
        </View>

        {/* Stats */}
        {stats ? <StatStrip stats={stats} /> : null}

        {/* Schedule quick action */}
        <Pressable style={styles.scheduleCard} onPress={() => router.push("/schedule")}>
          <View style={styles.scheduleIcon}>
            <CalendarClock size={20} color={colors.genPurple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.scheduleTitle}>Schedule a session</Text>
            <Text style={styles.scheduleSub}>Plan a test or learning session ahead</Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </Pressable>

        {/* Continue Learning */}
        {continueLearning ? (
          <ContinueLearning session={continueLearning} />
        ) : null}

        {/* My Subjects */}
        <SectionHead title="MY SUBJECTS" link={subjects.length > 2 ? `See all (${subjects.length}) →` : undefined} />
        {subjects.length === 0 ? (
          <EmptyState
            icon="📚"
            title="No subjects yet"
            message="Start a chat to begin your first subject."
            fullScreen={false}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {subjects.slice(0, 3).map((s) => (
              <SubjectCard key={s.subject} subject={s} />
            ))}
          </View>
        )}

        {/* Recent Sessions */}
        <SectionHead
          title="RECENT SESSIONS"
          link={
            recentSessions.length > 4
              ? showAllSessions
                ? "Show less"
                : "See all →"
              : undefined
          }
          onLinkPress={() => setShowAllSessions((v) => !v)}
          style={{ marginTop: 22 }}
        />
        {recentSessions.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No sessions yet"
            message="Your recent chats will appear here."
            fullScreen={false}
          />
        ) : (
          <View style={{ gap: 8 }}>
            {(showAllSessions ? recentSessions : recentSessions.slice(0, 4)).map((s) => (
              <RecentSessionItem key={s.session_id} session={s} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  greet: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  greetActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  h1: { fontFamily: fonts.nunito, fontSize: 22, color: colors.text },
  sub: {
    fontFamily: fonts.dmMedium,
    fontSize: 13,
    color: colors.textMid,
    marginTop: 5,
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
  },
  refreshText: {
    fontFamily: fonts.dmMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  scheduleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
  },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.genPurple + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleTitle: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  scheduleSub: { fontFamily: fonts.dm, fontSize: 12, color: colors.textMuted, marginTop: 1 },
});
