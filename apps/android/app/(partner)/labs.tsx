/**
 * Partner portal — Labs admin screen. Lists registered computer labs and lets
 * the partner create new ones. Tapping a lab opens its device management screen.
 * Mirrors the web app's src/features/lab/components/LabSetup.tsx (list half).
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, ChevronRight, Monitor } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { usePartnerId } from "@/hooks/usePartnerId";
import { labStore, useLabStore } from "@/store/useLabStore";
import { colors, fonts, radius } from "@/theme/tokens";

export default function LabsScreen() {
  const router = useRouter();
  const partnerId = usePartnerId();
  const { labs, isLoadingLabs } = useLabStore();
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (partnerId) labStore.fetchLabs(partnerId);
  }, [partnerId]);

  const onRefresh = async () => {
    if (!partnerId) return;
    setRefreshing(true);
    await labStore.fetchLabs(partnerId);
    setRefreshing(false);
  };

  if (isLoadingLabs && labs.length === 0) {
    return (
      <Screen background={colors.pageBg}>
        <LoadingState message="Loading labs…" />
      </Screen>
    );
  }

  return (
    <Screen background={colors.pageBg}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Labs</Text>
          <Text style={styles.count}>{labs.length} registered</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setCreateOpen(true)}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addBtnText}>New Lab</Text>
        </Pressable>
      </View>

      <FlatList
        data={labs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              router.push({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pathname: "/partner-lab-devices" as any,
                params: { labId: item.id, labName: item.name },
              })
            }
          >
            <View style={styles.iconWrap}>
              <Monitor size={20} color={colors.genPurple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                {item.location ? `${item.location} · ` : ""}
                {item.device_count} device{item.device_count === 1 ? "" : "s"}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState icon="🖥️" title="No labs yet" message="Create a lab to start registering devices." />
        }
      />

      <CreateLabSheet visible={createOpen} onClose={() => setCreateOpen(false)} partnerId={partnerId} />
    </Screen>
  );
}

function CreateLabSheet({
  visible,
  onClose,
  partnerId,
}: {
  visible: boolean;
  onClose: () => void;
  partnerId: string;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setLocation("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || !partnerId) return;
    setSubmitting(true);
    setError(null);
    try {
      await labStore.createLab({ partner_id: partnerId, name: name.trim(), location: location.trim() || undefined });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create lab. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>New Lab</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Lab Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Computer Lab 1"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Location (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Block B, 2nd floor"
            placeholderTextColor={colors.textMuted}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.submitBtn, (!name.trim() || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!name.trim() || submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Lab</Text>}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontFamily: fonts.nunito, fontSize: 22, color: colors.text },
  count: { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.genPurple, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  addBtnText: { fontFamily: fonts.dmBold, fontSize: 13, color: "#fff" },

  list: { paddingHorizontal: 20, paddingBottom: 24 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: colors.genPurple + "12",
    alignItems: "center", justifyContent: "center",
  },
  rowTitle: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  rowMeta: { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMuted, marginTop: 2 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#00000055" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.nunito, fontSize: 18, color: colors.text, marginBottom: 16 },
  field: { gap: 6, marginBottom: 14 },
  fieldLabel: { fontFamily: fonts.dmBold, fontSize: 11, letterSpacing: 0.5, color: colors.textMuted, textTransform: "uppercase" },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: fonts.dmMedium, fontSize: 14, color: colors.text, backgroundColor: colors.pageBg,
  },
  errorText: { fontFamily: fonts.dmMedium, fontSize: 13, color: colors.coral, textAlign: "center", marginBottom: 10 },
  submitBtn: { backgroundColor: colors.genPurple, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { fontFamily: fonts.dmBold, fontSize: 15, color: "#fff" },
});
