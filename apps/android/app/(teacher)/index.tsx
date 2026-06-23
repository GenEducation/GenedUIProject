/**
 * Teacher portal — student roster screen.
 * Features: stat chips, search, filter pills, student list, action sheet, invite FAB.
 */
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { TeacherStatChips } from "@/components/teacher/TeacherStatChips";
import { StudentActionSheet } from "@/components/teacher/StudentActionSheet";
import { InviteSheet } from "@/components/teacher/InviteSheet";
import { useTeacherStore } from "@/store/useTeacherStore";
import { useTeacherId } from "@/hooks/useTeacherId";
import { colors, fonts, radius } from "@/theme/tokens";
import type { TeacherStudent, LinkStatus } from "@/types/teacher";

type Filter = "ALL" | "PENDING" | "APPROVED";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL",      label: "All"      },
  { key: "PENDING",  label: "Pending"  },
  { key: "APPROVED", label: "Approved" },
];

function studentLabel(s: TeacherStudent) {
  return s.name ?? s.username ?? s.email ?? "Student";
}

function StudentCard({ student, onPress }: { student: TeacherStudent; onPress: () => void }) {
  const isPending = student.status === "PENDING";
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarText}>
          {studentLabel(student)[0]?.toUpperCase() ?? "S"}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName} numberOfLines={1}>{studentLabel(student)}</Text>
        <Text style={styles.cardMeta}>
          {[student.subject, student.grade ? `Grade ${student.grade}` : null]
            .filter(Boolean)
            .join(" · ") || "No subject assigned"}
        </Text>
      </View>
      <View style={[styles.statusBadge, isPending ? styles.statusPending : styles.statusApproved]}>
        <Text style={[styles.statusText, isPending ? styles.statusTextPending : styles.statusTextApproved]}>
          {isPending ? "Pending" : "Approved"}
        </Text>
      </View>
    </Pressable>
  );
}

export default function TeacherRoster() {
  const router = useRouter();
  const teacherId = useTeacherId();

  const {
    overview, students,
    isFetchingOverview, isFetchingStudents,
    approvingId, removingId, isInviting,
    fetchOverview, fetchStudents,
    approve, remove, invite, openChats,
  } = useTeacherStore();

  const [query, setQuery]     = useState("");
  const [filter, setFilter]   = useState<Filter>("ALL");
  const [selected, setSelected] = useState<TeacherStudent | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    if (!teacherId) return;
    setLoadError(false);
    try {
      await Promise.all([fetchOverview(teacherId), fetchStudents(teacherId)]);
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => { load(); }, [teacherId]);

  const filtered = useMemo(() => {
    let list = students;
    if (filter !== "ALL") list = list.filter((s) => s.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          studentLabel(s).toLowerCase().includes(q) ||
          (s.subject ?? "").toLowerCase().includes(q) ||
          String(s.grade ?? "").includes(q)
      );
    }
    return list;
  }, [students, filter, query]);

  const isLoading = isFetchingStudents && students.length === 0;

  if (isLoading) {
    return (
      <Screen background={colors.pageBg}>
        <LoadingState message="Loading students…" />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen background={colors.pageBg}>
        <ErrorState message="Couldn't load students." onRetry={load} />
      </Screen>
    );
  }

  const handleApprove = async (student: TeacherStudent) => {
    setSelected(null);
    const result = await approve(teacherId, student);
    if (!result.ok) {
      Alert.alert("Cannot approve", result.message ?? "Please try again.");
    }
  };

  const handleRemove = (student: TeacherStudent) => {
    setSelected(null);
    Alert.alert(
      "Remove student?",
      `Remove ${studentLabel(student)}${student.subject ? ` (${student.subject})` : ""} from your class?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await remove(teacherId, student.student_id);
            } catch {
              Alert.alert("Error", "Failed to remove student.");
            }
          },
        },
      ]
    );
  };

  const handleViewChats = async (student: TeacherStudent) => {
    setSelected(null);
    await openChats(teacherId, student);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({ pathname: "/teacher-chat" as any, params: { studentId: student.student_id, studentName: studentLabel(student) } });
  };

  const handleViewReport = (student: TeacherStudent) => {
    setSelected(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({ pathname: "/teacher-report" as any, params: { studentId: student.student_id, studentName: studentLabel(student) } });
  };

  return (
    <Screen background={colors.pageBg}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>My Class</Text>
          <Text style={styles.title}>Students</Text>
        </View>
      </View>

      {/* Stat chips */}
      <View style={styles.statsRow}>
        <TeacherStatChips overview={overview} isLoading={isFetchingOverview} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, subject, grade…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter pills */}
      <View style={styles.pillRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count =
            f.key === "ALL"      ? (overview?.total_students ?? students.length) :
            f.key === "APPROVED" ? (overview?.approved ?? 0) :
                                   (overview?.pending ?? 0);
          return (
            <Pressable
              key={f.key}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{f.label}</Text>
              <View style={[styles.pillBadge, active && styles.pillBadgeActive]}>
                <Text style={[styles.pillBadgeText, active && styles.pillBadgeTextActive]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.student_id}
        renderItem={({ item }) => (
          <StudentCard student={item} onPress={() => setSelected(item)} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            message={
              query || filter !== "ALL"
                ? "No students match your search."
                : "No students yet. Use the + button to invite one."
            }
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isFetchingStudents}
            onRefresh={load}
            tintColor={colors.emerald}
          />
        }
      />

      {/* Action sheet */}
      {selected && (
        <StudentActionSheet
          student={selected}
          approvingId={approvingId}
          removingId={removingId}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onViewChats={handleViewChats}
          onViewReport={handleViewReport}
          onRemove={handleRemove}
        />
      )}

      {/* Invite sheet */}
      <InviteSheet
        visible={inviteOpen}
        isInviting={isInviting}
        onClose={() => setInviteOpen(false)}
        onInvite={(id, sub) => invite(teacherId, id, sub)}
      />

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.88 }]}
        onPress={() => setInviteOpen(true)}
      >
        <UserPlus size={22} color="#fff" />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  eyebrow: {
    fontFamily: fonts.dmBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: colors.emerald,
    marginBottom: 2,
  },
  title: { fontFamily: fonts.nunito, fontSize: 28, color: colors.text },

  statsRow: { marginBottom: 12 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchIcon:  { fontSize: 15 },
  searchInput: { flex: 1, fontFamily: fonts.dm, fontSize: 13, color: colors.text },

  pillRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  pillActive: { borderColor: colors.emerald, backgroundColor: colors.emerald + "10" },
  pillText:   { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMid },
  pillTextActive: { color: colors.emerald },
  pillBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  pillBadgeActive: { backgroundColor: colors.emerald + "20" },
  pillBadgeText:   { fontFamily: fonts.dmBold, fontSize: 10, color: colors.textMuted },
  pillBadgeTextActive: { color: colors.emerald },

  list: { paddingHorizontal: 16, paddingBottom: 100 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    minHeight: 72,
  },
  cardPressed: { backgroundColor: colors.pageBg },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.navy + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  cardAvatarText: { fontFamily: fonts.nunito, fontSize: 18, color: colors.navy },
  cardName: { fontFamily: fonts.dmBold, fontSize: 15, color: colors.text },
  cardMeta: { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMuted, marginTop: 2 },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPending:  { backgroundColor: colors.sun + "20" },
  statusApproved: { backgroundColor: colors.emerald + "15" },
  statusText:     { fontFamily: fonts.dmBold, fontSize: 11 },
  statusTextPending:  { color: colors.sun },
  statusTextApproved: { color: colors.emerald },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.emerald,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.emerald,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
