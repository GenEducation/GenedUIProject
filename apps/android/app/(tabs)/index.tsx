import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Screen } from "@/components/Screen";
import { AprilAvatar } from "@/components/AprilAvatar";
import { SectionHead } from "@/components/SectionHead";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { StatStrip } from "@/components/home/StatStrip";
import { ContinueLearning } from "@/components/home/ContinueLearning";
import { SubjectCard } from "@/components/home/SubjectCard";
import { RecentSessionItem } from "@/components/home/RecentSessionItem";
import { useHomeData } from "@/hooks/useHomeData";
import { useAuth } from "@/store/useAuthStore";
import { colors, fonts } from "@/theme/tokens";

export default function Home() {
  const { state } = useAuth();
  const { stats, subjects, recentSessions, loading, error, refetch } = useHomeData();

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

  if (error) {
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
            <Text style={styles.sub}>What would you like to learn today?</Text>
          </View>
          <AprilAvatar size={52} />
        </View>

        {/* Stats */}
        {stats ? <StatStrip stats={stats} /> : null}

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
          link={recentSessions.length > 3 ? "See all →" : undefined}
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
            {recentSessions.slice(0, 4).map((s) => (
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
  h1: { fontFamily: fonts.nunito, fontSize: 22, color: colors.text },
  sub: {
    fontFamily: fonts.dmMedium,
    fontSize: 13,
    color: colors.textMid,
    marginTop: 5,
  },
});
