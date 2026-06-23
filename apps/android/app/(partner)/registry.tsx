import React, { useState } from "react";
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
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { SubjectRegistryRow } from "@/components/partner/SubjectRegistryRow";
import { IngestionSheet } from "@/components/partner/IngestionSheet";
import { useAcademicRegistry } from "@/hooks/useAcademicRegistry";
import { colors, fonts, radius } from "@/theme/tokens";
import type { RegistryFilter } from "@/hooks/useAcademicRegistry";
import type { SubjectRegistryItem } from "@/types/partner";

const STATUS_FILTERS: { key: RegistryFilter; label: string }[] = [
  { key: "ALL",         label: "All"         },
  { key: "active",      label: "Active"      },
  { key: "in-progress", label: "In Progress" },
  { key: "failed",      label: "Failed"      },
];

export default function RegistryScreen() {
  const {
    subjects, allSubjects,
    search, statusFilter,
    setSearch, setStatusFilter,
    loading, error, refetch,
    upload, deleteItem, cancelItem,
  } = useAcademicRegistry();

  const [sheetOpen, setSheetOpen] = useState(false);

  const counts: Record<RegistryFilter, number> = {
    ALL:          allSubjects.length,
    active:       allSubjects.filter((s) => s.status === "active").length,
    "in-progress":allSubjects.filter((s) => s.status === "in-progress").length,
    failed:       allSubjects.filter((s) => s.status === "failed").length,
  };

  const confirmDelete = (item: SubjectRegistryItem) => {
    Alert.alert(
      "Delete Curriculum",
      `Remove "${item.document_title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteItem(item).catch(() =>
            Alert.alert("Error", "Failed to delete. Please try again.")
          ),
        },
      ]
    );
  };

  const confirmCancel = (item: SubjectRegistryItem) => {
    Alert.alert(
      "Cancel Ingestion",
      `Stop processing "${item.document_title}"?`,
      [
        { text: "Keep", style: "cancel" },
        { text: "Cancel ingestion", style: "destructive", onPress: () => cancelItem(item) },
      ]
    );
  };

  if (loading && allSubjects.length === 0) {
    return (
      <Screen background={colors.pageBg}>
        <LoadingState message="Loading curriculum registry…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen background={colors.pageBg}>
        <ErrorState message="Couldn't load curriculum registry." onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen background={colors.pageBg}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Academic Registry</Text>
        <Text style={styles.count}>{allSubjects.length} documents</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title or subject…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter pills */}
      <View style={styles.pillRow}>
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.key;
          return (
            <Pressable
              key={f.key}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {f.label}
              </Text>
              <View style={[styles.pillBadge, active && styles.pillBadgeActive]}>
                <Text style={[styles.pillBadgeText, active && styles.pillBadgeTextActive]}>
                  {counts[f.key]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={subjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubjectRegistryRow
            item={item}
            onDelete={() => confirmDelete(item)}
            onCancel={() => confirmCancel(item)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            message={
              search || statusFilter !== "ALL"
                ? "No documents match your search."
                : "No curriculum uploaded yet. Tap + to add one."
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

      {/* Upload FAB */}
      <Pressable style={styles.fab} onPress={() => setSheetOpen(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Upload sheet */}
      {sheetOpen && (
        <IngestionSheet
          onClose={() => setSheetOpen(false)}
          onSubmit={upload}
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
  title: { fontFamily: fonts.nunito, fontSize: 22, color: colors.text },
  count: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMuted },

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
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pillActive:        { borderColor: colors.edGreen, backgroundColor: colors.edGreen + "10" },
  pillText:          { fontFamily: fonts.dmBold, fontSize: 11, color: colors.textMid },
  pillTextActive:    { color: colors.edGreen },
  pillBadge:         { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  pillBadgeActive:   { backgroundColor: colors.edGreen + "20" },
  pillBadgeText:     { fontFamily: fonts.dmBold, fontSize: 9, color: colors.textMuted },
  pillBadgeTextActive: { color: colors.edGreen },

  list: { paddingHorizontal: 16, paddingBottom: 100 },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.edGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { fontFamily: fonts.nunito, fontSize: 28, color: "#fff", lineHeight: 32, marginTop: -2 },
});
