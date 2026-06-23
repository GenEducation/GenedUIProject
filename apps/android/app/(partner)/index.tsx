import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { EnrollmentStatStrip } from "@/components/partner/EnrollmentStatStrip";
import { StudentRow } from "@/components/partner/StudentRow";
import { StudentDetailSheet } from "@/components/partner/StudentDetailSheet";
import { useEnrollmentData } from "@/hooks/useEnrollmentData";
import { usePartnerId } from "@/hooks/usePartnerId";
import { colors, fonts } from "@/theme/tokens";
import type { PartnerStudent } from "@/types/partner";

type Filter = "ALL" | "APPROVED" | "PENDING";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL",      label: "All"      },
  { key: "APPROVED", label: "Approved" },
  { key: "PENDING",  label: "Pending"  },
];

export default function StudentsScreen() {
  const partnerId = usePartnerId();
  const { students, stats, loading, error, refetch } = useEnrollmentData();

  const [query,  setQuery]  = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selected, setSelected] = useState<PartnerStudent | null>(null);

  const filtered = useMemo(() => {
    let list = students;
    if (filter !== "ALL") list = list.filter((s) => s.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || String(s.grade).includes(q)
      );
    }
    return list;
  }, [students, filter, query]);

  if (loading && students.length === 0) {
    return (
      <Screen background={colors.pageBg}>
        <LoadingState message="Loading students…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen background={colors.pageBg}>
        <ErrorState message="Couldn't load students." onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen background={colors.pageBg}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Students</Text>
        <Text style={styles.count}>{stats.total} enrolled</Text>
      </View>

      {/* Stat strip */}
      <View style={styles.statsWrap}>
        <EnrollmentStatStrip stats={stats} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or grade…"
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
            f.key === "ALL"      ? stats.total    :
            f.key === "APPROVED" ? stats.approved :
                                   stats.pending;
          return (
            <Pressable
              key={f.key}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {f.label}
              </Text>
              <View style={[styles.pillBadge, active && styles.pillBadgeActive]}>
                <Text style={[styles.pillBadgeText, active && styles.pillBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StudentRow student={item} onPress={setSelected} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            message={
              query || filter !== "ALL"
                ? "No students match your search."
                : "No students enrolled yet."
            }
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={colors.edGreen}
          />
        }
      />

      {selected && (
        <StudentDetailSheet
          student={selected}
          partnerId={partnerId}
          onClose={() => setSelected(null)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontFamily: fonts.nunito, fontSize: 24, color: colors.text },
  count: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMuted },

  statsWrap: { paddingHorizontal: 16, marginBottom: 4 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    backgroundColor: colors.card,
  },
  pillActive: {
    borderColor: colors.edGreen,
    backgroundColor: colors.edGreen + "10",
  },
  pillText:     { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMid },
  pillTextActive: { color: colors.edGreen },
  pillBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  pillBadgeActive: { backgroundColor: colors.edGreen + "20" },
  pillBadgeText:   { fontFamily: fonts.dmBold, fontSize: 10, color: colors.textMuted },
  pillBadgeTextActive: { color: colors.edGreen },

  list: { paddingHorizontal: 16, paddingBottom: 28 },
});
