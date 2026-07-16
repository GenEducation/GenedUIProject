/**
 * Partner portal — device management for a single lab. Lists registered
 * devices with health status, and lets the partner register new devices or
 * rotate/revoke existing ones. Mirrors the device-grid half of the web app's
 * src/features/lab/components/LabSetup.tsx.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  Switch,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus, RotateCw, Ban, Cpu } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { DeviceStatusBadge } from "@/components/partner/DeviceStatusBadge";
import { DeviceTokenSheet } from "@/components/partner/DeviceTokenSheet";
import { labStore, useLabStore } from "@/store/useLabStore";
import { colors, fonts, radius } from "@/theme/tokens";
import type { DeviceResponse } from "@/types/lab";

export default function PartnerLabDevicesScreen() {
  const router = useRouter();
  const { labId, labName } = useLocalSearchParams<{ labId: string; labName?: string }>();
  const { devices, isLoadingDevices } = useLabStore();
  const [refreshing, setRefreshing] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [tokenReveal, setTokenReveal] = useState<{ token: string; label: string } | null>(null);

  useEffect(() => {
    if (labId) labStore.fetchDevices(labId);
  }, [labId]);

  const onRefresh = async () => {
    if (!labId) return;
    setRefreshing(true);
    await labStore.fetchDevices(labId);
    setRefreshing(false);
  };

  const handleRotate = async (device: DeviceResponse) => {
    try {
      const provision = await labStore.rotateToken(device.id);
      setTokenReveal({ token: provision.device_token, label: device.device_label });
    } catch {
      Alert.alert("Error", "Failed to rotate token. Please try again.");
    }
  };

  const handleRevoke = (device: DeviceResponse) => {
    Alert.alert("Revoke Device", `Revoke access for "${device.device_label}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: () =>
          labStore.revokeDevice(device.id).catch(() =>
            Alert.alert("Error", "Failed to revoke device. Please try again.")
          ),
      },
    ]);
  };

  if (isLoadingDevices && devices.length === 0) {
    return (
      <Screen background={colors.pageBg}>
        <LoadingState message="Loading devices…" />
      </Screen>
    );
  }

  return (
    <Screen background={colors.pageBg}>
      <View style={[styles.header, { paddingTop: 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{labName || "Lab"}</Text>
          <Text style={styles.count}>{devices.length} device{devices.length === 1 ? "" : "s"}</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setRegisterOpen(true)}>
          <Plus size={16} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Cpu size={18} color={colors.genPurple} />
              {item.is_spare ? <Text style={styles.spareTag}>Spare</Text> : null}
            </View>
            <Text style={styles.cardLabel} numberOfLines={1}>{item.device_label}</Text>
            <Text style={styles.cardHw} numberOfLines={1}>{item.hardware_id}</Text>
            <DeviceStatusBadge status={item.health_status} />
            <View style={styles.cardActions}>
              <Pressable style={styles.cardActionBtn} onPress={() => handleRotate(item)} hitSlop={6}>
                <RotateCw size={14} color={colors.textMuted} />
              </Pressable>
              <Pressable style={styles.cardActionBtn} onPress={() => handleRevoke(item)} hitSlop={6}>
                <Ban size={14} color={colors.coral} />
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState icon="🖥️" title="No devices yet" message="Register a device to add it to this lab." />
        }
      />

      {labId ? (
        <RegisterDeviceSheet
          visible={registerOpen}
          labId={labId}
          onClose={() => setRegisterOpen(false)}
          onRegistered={(token, label) => setTokenReveal({ token, label })}
        />
      ) : null}

      <DeviceTokenSheet
        visible={!!tokenReveal}
        token={tokenReveal?.token ?? null}
        deviceLabel={tokenReveal?.label ?? ""}
        onClose={() => setTokenReveal(null)}
      />
    </Screen>
  );
}

function RegisterDeviceSheet({
  visible,
  labId,
  onClose,
  onRegistered,
}: {
  visible: boolean;
  labId: string;
  onClose: () => void;
  onRegistered: (token: string, label: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState("");
  const [hardwareId, setHardwareId] = useState("");
  const [isSpare, setIsSpare] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setLabel("");
    setHardwareId("");
    setIsSpare(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canSubmit = !!label.trim() && !!hardwareId.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const provision = await labStore.registerDevice({
        lab_id: labId,
        device_label: label.trim(),
        hardware_id: hardwareId.trim(),
        is_spare: isSpare,
      });
      handleClose();
      onRegistered(provision.device_token, provision.device.device_label);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to register device. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>Register Device</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Desk Label</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Desk 12"
            placeholderTextColor={colors.textMuted}
            value={label}
            onChangeText={setLabel}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Hardware ID</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. TAB-0012"
            placeholderTextColor={colors.textMuted}
            value={hardwareId}
            onChangeText={setHardwareId}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>Spare Device</Text>
          <Switch value={isSpare} onValueChange={setIsSpare} trackColor={{ true: colors.genPurple }} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Register Device</Text>}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: fonts.nunito, fontSize: 20, color: colors.text },
  count: { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.genPurple, alignItems: "center", justifyContent: "center",
  },

  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  card: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    padding: 14, gap: 8, backgroundColor: "#fff",
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  spareTag: {
    fontFamily: fonts.dmBold, fontSize: 9, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5,
    backgroundColor: colors.pageBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  cardLabel: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text },
  cardHw: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted },
  cardActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cardActionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, borderRadius: 8, backgroundColor: colors.pageBg,
  },

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
  switchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14,
  },
  errorText: { fontFamily: fonts.dmMedium, fontSize: 13, color: colors.coral, textAlign: "center", marginBottom: 10 },
  submitBtn: { backgroundColor: colors.genPurple, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { fontFamily: fonts.dmBold, fontSize: 15, color: "#fff" },
});
