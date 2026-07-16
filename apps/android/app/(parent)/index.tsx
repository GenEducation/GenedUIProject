/**
 * Children tab — lists all linked children, shows pending requests with
 * approve/reject actions, and allows adding or unlinking children.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { ChildRow } from "@/components/parent/ChildRow";
import { NotificationBell } from "@/components/NotificationBell";
import { useLinkedChildren } from "@/hooks/useLinkedChildren";
import { useParentId } from "@/hooks/useParentId";
import { parentService } from "@/services/parentService";
import { useRouter } from "expo-router";
import { colors, fonts, radius } from "@/theme/tokens";
import type { LinkedChild } from "@/types/parent";

export default function ChildrenScreen() {
  const router = useRouter();
  const parentId = useParentId();
  const { children, pendingChildren, loading, error, refetch } = useLinkedChildren();

  const [addInput, setAddInput]     = useState("");
  const [addError, setAddError]     = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [actionId, setActionId]     = useState<string | null>(null); // child being actioned

  if (loading && children.length === 0) {
    return (
      <Screen background={colors.pageBg}>
        <LoadingState message="Loading children…" />
      </Screen>
    );
  }

  if (error && children.length === 0) {
    return (
      <Screen background={colors.pageBg}>
        <ErrorState message="Couldn't load your children." onRetry={refetch} />
      </Screen>
    );
  }

  const handleAdd = async () => {
    const studentId = addInput.trim();
    if (!studentId || !parentId) return;
    setAddLoading(true);
    setAddError(null);
    try {
      await parentService.linkStudent(parentId, studentId);
      setAddInput("");
      refetch();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to send request.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleApprove = async (child: LinkedChild) => {
    if (!parentId) return;
    setActionId(child.id);
    try {
      await parentService.updateStudentStatus(parentId, child.id, "APPROVED");
      refetch();
    } catch {
      Alert.alert("Error", "Could not approve the request. Please try again.");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (child: LinkedChild) => {
    if (!parentId) return;
    Alert.alert("Reject Request", `Remove ${child.name}'s pending request?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          setActionId(child.id);
          try {
            await parentService.updateStudentStatus(parentId, child.id, "REJECTED");
            refetch();
          } catch {
            Alert.alert("Error", "Could not reject the request.");
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const handleUnlink = async (child: LinkedChild) => {
    if (!parentId) return;
    Alert.alert("Unlink Child", `Remove ${child.name} from your account?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlink",
        style: "destructive",
        onPress: async () => {
          setActionId(child.id);
          try {
            await parentService.unlinkStudent(parentId, child.id);
            refetch();
          } catch {
            Alert.alert("Error", "Could not unlink the child.");
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  return (
    <Screen background={colors.pageBg}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Children</Text>
          <Text style={styles.subtitle}>{children.length} linked</Text>
        </View>
        <NotificationBell userId={parentId} />
      </View>

      <FlatList
        data={children}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={colors.edGreen}
          />
        }
        ListHeaderComponent={
          <>
            {/* Add child card */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Add a Child</Text>
              <View style={styles.addRow}>
                <TextInput
                  style={styles.input}
                  value={addInput}
                  onChangeText={(t) => { setAddInput(t); setAddError(null); }}
                  placeholder="Enter student ID or email"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  style={[styles.addBtn, (!addInput.trim() || addLoading) && styles.addBtnDisabled]}
                  onPress={handleAdd}
                  disabled={!addInput.trim() || addLoading}
                >
                  {addLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.addBtnText}>Send</Text>
                  }
                </Pressable>
              </View>
              {addError ? <Text style={styles.addError}>{addError}</Text> : null}
            </View>

            {/* Pending requests */}
            {pendingChildren.length > 0 && (
              <View style={[styles.card, styles.cardPending]}>
                <Text style={styles.sectionLabel}>Pending Requests</Text>
                {pendingChildren.map((child) => (
                  <View key={child.id} style={styles.pendingRow}>
                    <View style={styles.pendingAvatar}>
                      <Text style={styles.pendingInitials}>{child.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pendingName}>{child.name}</Text>
                      {child.grade ? (
                        <Text style={styles.pendingGrade}>Grade {child.grade}</Text>
                      ) : null}
                    </View>
                    {actionId === child.id ? (
                      <ActivityIndicator size="small" color={colors.edGreen} />
                    ) : (
                      <View style={styles.pendingActions}>
                        <Pressable
                          style={styles.rejectBtn}
                          onPress={() => handleReject(child)}
                        >
                          <Text style={styles.rejectText}>Reject</Text>
                        </Pressable>
                        <Pressable
                          style={styles.approveBtn}
                          onPress={() => handleApprove(child)}
                        >
                          <Text style={styles.approveText}>Approve</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {children.filter((c) => c.status !== "PENDING").length > 0 && (
              <Text style={styles.sectionLabel2}>Linked Children</Text>
            )}
          </>
        }
        renderItem={({ item }) => {
          if (item.status === "PENDING") return null;
          return (
            <View>
              <ChildRow
                child={item}
                onPress={(c) =>
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  router.push({ pathname: "/parent-chat" as any, params: { childId: c.id, childName: c.name } })
                }
              />
              {item.status === "APPROVED" && (
                <Pressable
                  style={styles.unlinkRow}
                  onPress={() => handleUnlink(item)}
                >
                  {actionId === item.id
                    ? <ActivityIndicator size="small" color={colors.coral} />
                    : <Text style={styles.unlinkText}>Unlink {item.name}</Text>
                  }
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="👨‍👧"
            title="No children linked"
            message="Enter a student ID above to send a link request."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title:    { fontFamily: fonts.nunito, fontSize: 26, color: colors.text },
  subtitle: { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMuted, marginTop: 2 },

  list: { paddingHorizontal: 16, paddingBottom: 28 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  cardPending: { borderColor: colors.sun + "66", backgroundColor: colors.sun + "06" },

  sectionLabel: {
    fontFamily: fonts.dmBold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionLabel2: {
    fontFamily: fonts.dmBold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },

  addRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    fontFamily: fonts.dm,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: colors.pageBg,
  },
  addBtn: {
    backgroundColor: colors.edGreen,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius.md,
    minWidth: 64,
    alignItems: "center",
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontFamily: fonts.dmBold, fontSize: 14, color: "#fff" },
  addError:   { fontFamily: fonts.dm, fontSize: 12, color: colors.coral },

  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pendingAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.sun + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingInitials: { fontFamily: fonts.nunito, fontSize: 14, color: "#B45309" },
  pendingName:     { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  pendingGrade:    { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted },
  pendingActions:  { flexDirection: "row", gap: 8 },
  rejectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.coral + "60",
    backgroundColor: colors.coral + "08",
  },
  rejectText:  { fontFamily: fonts.dmBold, fontSize: 12, color: colors.coral },
  approveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.edGreen,
  },
  approveText: { fontFamily: fonts.dmBold, fontSize: 12, color: "#fff" },

  unlinkRow: { paddingVertical: 6, paddingHorizontal: 4, marginBottom: 4 },
  unlinkText: { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.coral },
});
