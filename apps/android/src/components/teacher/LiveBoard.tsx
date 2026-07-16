/**
 * Live device-allocation board for an ACTIVE lab period. Mirrors the web
 * app's src/features/lab/components/LiveBoard.tsx: a device grid (tap a free
 * desk to complete a pending reassign) and a student roster with per-state
 * action buttons (confirm/reassign/swap/absent/end/bind/resume).
 */
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { ArrowLeftRight, Check, Monitor, UserCheck, UserX, Zap, RefreshCw } from "lucide-react-native";
import { PickerSheet } from "@/components/PickerSheet";
import { labStore } from "@/store/useLabStore";
import { colors, fonts, radius } from "@/theme/tokens";
import type { BoardResponse, BoardDevice, LabSessionState } from "@/types/lab";

const STATE_STYLES: Record<LabSessionState, { bg: string; text: string }> = {
  IDLE: { bg: colors.border, text: colors.textMuted },
  ASSIGNED: { bg: "#FFFBEB", text: "#92400E" },
  CONFIRMED: { bg: "#E6F0FB", text: "#1D4ED8" },
  ACTIVE: { bg: colors.edGreen + "18", text: colors.edGreen },
  SUSPENDED: { bg: colors.coral + "18", text: colors.coral },
  COMPLETED: { bg: colors.edGreen + "18", text: colors.edGreen },
  REASSIGNED: { bg: colors.border, text: colors.textMuted },
  INCOMPLETE: { bg: colors.coral + "18", text: colors.coral },
  ABSENT: { bg: colors.border, text: colors.textFaint },
};

interface Toast { type: "success" | "error"; title: string; description?: string }

interface Props {
  slotId: string;
  board: BoardResponse;
  onToast: (t: Toast) => void;
}

export function LiveBoard({ slotId, board, onToast }: Props) {
  const [pendingReassign, setPendingReassign] = useState<{ sessionId: string; label: string } | null>(null);
  const [swapFirst, setSwapFirst] = useState<{ sessionId: string; label: string } | null>(null);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [bindTarget, setBindTarget] = useState<{ sessionId: string; studentId: string; mode: "bind" | "resume" } | null>(null);

  const freeDevices = board.devices.filter((d) => !d.session_id && d.health_status === "ONLINE");
  const idleStudents = board.students.filter((s) => s.state === "IDLE" || s.state === "ABSENT");

  async function run(sessionId: string, action: () => Promise<unknown>, successTitle: string) {
    setBusySessionId(sessionId);
    try {
      await action();
      onToast({ type: "success", title: successTitle });
    } catch (e) {
      onToast({
        type: "error",
        title: "Action failed",
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusySessionId(null);
    }
  }

  const handleDevicePress = async (device: BoardDevice) => {
    if (!pendingReassign) return;
    if (device.session_id || device.health_status !== "ONLINE") return;
    const target = pendingReassign;
    setPendingReassign(null);
    await run(
      target.sessionId,
      () => labStore.reassign(slotId, target.sessionId, device.device_id),
      `Moved ${target.label} to ${device.device_label}`
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Device grid */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Room Layout</Text>
        <Pressable style={styles.refreshBtn} onPress={() => labStore.refetchBoard()}>
          <RefreshCw size={12} color={colors.textMuted} />
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>
      <View style={styles.deviceGrid}>
        {board.devices.map((device) => {
          const isTarget = !!pendingReassign && !device.session_id && device.health_status === "ONLINE";
          const stateStyle = device.state ? STATE_STYLES[device.state] : null;
          return (
            <Pressable
              key={device.device_id}
              style={[
                styles.deviceCard,
                isTarget && styles.deviceCardTarget,
                device.health_status !== "ONLINE" && styles.deviceCardDisabled,
              ]}
              onPress={() => handleDevicePress(device)}
              disabled={!isTarget}
            >
              <View style={styles.deviceCardTop}>
                <View style={styles.deviceCardLabel}>
                  <Monitor size={13} color={colors.textMuted} />
                  <Text style={styles.deviceCardLabelText} numberOfLines={1}>{device.device_label}</Text>
                </View>
                {device.is_spare ? <Text style={styles.spareTag}>Spare</Text> : null}
              </View>
              {device.student_name ? (
                <>
                  <Text style={styles.deviceStudent} numberOfLines={1}>{device.student_name}</Text>
                  {stateStyle ? (
                    <View style={[styles.stateBadge, { backgroundColor: stateStyle.bg }]}>
                      <Text style={[styles.stateBadgeText, { color: stateStyle.text }]}>{device.state}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={styles.deviceFree}>
                  {device.health_status === "ONLINE" ? "Free desk" : device.health_status}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
      {pendingReassign ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {freeDevices.length > 0
              ? `Pick a free desk for ${pendingReassign.label}…`
              : `No free desks for ${pendingReassign.label}.`}
          </Text>
          <Pressable onPress={() => setPendingReassign(null)}>
            <Text style={styles.bannerCancel}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Roster */}
      <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Roster</Text>
      {swapFirst ? (
        <View style={[styles.banner, styles.bannerGreen]}>
          <Text style={[styles.bannerText, { color: colors.edGreen }]}>
            Pick another student to swap desks with {swapFirst.label}…
          </Text>
          <Pressable onPress={() => setSwapFirst(null)}>
            <Text style={[styles.bannerCancel, { color: colors.edGreen }]}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ gap: 8, marginTop: 10 }}>
        {board.students.map((s) => {
          const isBusy = busySessionId === s.session_id;
          const stateStyle = STATE_STYLES[s.state];
          const canConfirm = s.state === "ASSIGNED";
          const canReassignSwap = ["ASSIGNED", "CONFIRMED", "ACTIVE"].includes(s.state);
          const canEndAbsent = ["ASSIGNED", "CONFIRMED", "ACTIVE", "SUSPENDED"].includes(s.state);
          return (
            <View key={s.student_id} style={styles.studentCard}>
              <View style={styles.studentTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName} numberOfLines={1}>#{s.roll_no} {s.student_name}</Text>
                  <Text style={styles.studentDevice}>{s.device_label || "No device"}</Text>
                </View>
                <View style={[styles.stateBadge, { backgroundColor: stateStyle.bg }]}>
                  <Text style={[styles.stateBadgeText, { color: stateStyle.text }]}>{s.state}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                {canConfirm ? (
                  <ActionChip
                    icon={<Check size={11} color="#1D4ED8" />}
                    label="Confirm"
                    tint="#E6F0FB"
                    textColor="#1D4ED8"
                    disabled={isBusy}
                    onPress={() => run(s.session_id, () => labStore.confirmOverride(slotId, s.session_id), `Confirmed ${s.student_name}`)}
                  />
                ) : null}
                {canReassignSwap ? (
                  <ActionChip
                    icon={<Zap size={11} color={colors.text} />}
                    label="Reassign"
                    tint={colors.pageBg}
                    textColor={colors.text}
                    disabled={isBusy || !!pendingReassign}
                    onPress={() => setPendingReassign({ sessionId: s.session_id, label: s.student_name })}
                  />
                ) : null}
                {canReassignSwap ? (
                  <ActionChip
                    icon={<ArrowLeftRight size={11} color={swapFirst?.sessionId === s.session_id ? "#fff" : colors.text} />}
                    label={swapFirst?.sessionId === s.session_id ? "Cancel swap" : swapFirst ? "Swap here" : "Swap"}
                    tint={swapFirst?.sessionId === s.session_id ? colors.edGreen : colors.pageBg}
                    textColor={swapFirst?.sessionId === s.session_id ? "#fff" : colors.text}
                    disabled={isBusy}
                    onPress={() => {
                      if (!swapFirst) { setSwapFirst({ sessionId: s.session_id, label: s.student_name }); return; }
                      if (swapFirst.sessionId === s.session_id) { setSwapFirst(null); return; }
                      run(s.session_id, () => labStore.swap(slotId, swapFirst.sessionId, s.session_id), `Swapped ${swapFirst.label} and ${s.student_name}`);
                      setSwapFirst(null);
                    }}
                  />
                ) : null}
                {canEndAbsent ? (
                  <>
                    <ActionChip
                      icon={<UserX size={11} color={colors.coral} />}
                      label="Absent"
                      tint={colors.coral + "12"}
                      textColor={colors.coral}
                      disabled={isBusy}
                      onPress={() => run(s.session_id, () => labStore.markAbsent(slotId, s.session_id), `Marked ${s.student_name} absent`)}
                    />
                    <ActionChip
                      icon={null}
                      label="End"
                      tint={colors.border}
                      textColor={colors.textMuted}
                      disabled={isBusy}
                      onPress={() => run(s.session_id, () => labStore.endSession(slotId, s.session_id), `Ended session for ${s.student_name}`)}
                    />
                  </>
                ) : null}
                {s.state === "ABSENT" ? (
                  <ActionChip
                    icon={<UserCheck size={11} color={colors.edGreen} />}
                    label="Mark present"
                    tint={colors.edGreen + "12"}
                    textColor={colors.edGreen}
                    disabled={isBusy}
                    onPress={() => run(s.session_id, () => labStore.markPresent(slotId, s.session_id), `${s.student_name} marked present`)}
                  />
                ) : null}
                {s.state === "IDLE" && freeDevices.length > 0 ? (
                  <ActionChip
                    icon={null}
                    label="Bind to desk…"
                    tint={colors.pageBg}
                    textColor={colors.text}
                    disabled={isBusy}
                    onPress={() => setBindTarget({ sessionId: s.session_id, studentId: s.student_id, mode: "bind" })}
                  />
                ) : null}
                {s.state === "INCOMPLETE" ? (
                  freeDevices.length > 0 ? (
                    <ActionChip
                      icon={null}
                      label="Continue on desk…"
                      tint={colors.pageBg}
                      textColor={colors.text}
                      disabled={isBusy}
                      onPress={() => setBindTarget({ sessionId: s.session_id, studentId: s.student_id, mode: "resume" })}
                    />
                  ) : (
                    <Text style={styles.noDeskText}>No free desk to continue</Text>
                  )
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {idleStudents.length > 0 ? (
        <Text style={styles.idleNote}>
          {idleStudents.length} student{idleStudents.length === 1 ? " is" : "s are"} waiting for a device.
        </Text>
      ) : null}

      <PickerSheet
        visible={!!bindTarget}
        title={bindTarget?.mode === "resume" ? "Continue on desk" : "Bind to desk"}
        options={freeDevices.map((d) => d.device_label)}
        onSelect={(label) => {
          const device = freeDevices.find((d) => d.device_label === label);
          if (!device || !bindTarget) return;
          const { sessionId, studentId, mode } = bindTarget;
          if (mode === "bind") {
            run(sessionId, () => labStore.bindDevice(slotId, studentId, device.device_id), `Placed student on ${device.device_label}`);
          } else {
            run(sessionId, () => labStore.resume(slotId, sessionId, device.device_id), `Resumed on ${device.device_label}`);
          }
        }}
        onClose={() => setBindTarget(null)}
      />
    </ScrollView>
  );
}

function ActionChip({
  icon, label, tint, textColor, disabled, onPress,
}: {
  icon: React.ReactNode;
  label: string;
  tint: string;
  textColor: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, { backgroundColor: tint }, disabled && styles.chipDisabled]} onPress={onPress} disabled={disabled}>
      {icon}
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 32 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontFamily: fonts.dmBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  refreshText: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.textMuted },

  deviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  deviceCard: {
    width: "31%", borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    padding: 12, backgroundColor: "#fff", gap: 6,
  },
  deviceCardTarget: { borderColor: colors.edGreen, backgroundColor: colors.edGreen + "0C" },
  deviceCardDisabled: { opacity: 0.5 },
  deviceCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  deviceCardLabel: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  deviceCardLabelText: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.text, flexShrink: 1 },
  spareTag: {
    fontFamily: fonts.dmBold, fontSize: 8, color: colors.textMuted, textTransform: "uppercase",
    backgroundColor: colors.pageBg, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5,
  },
  deviceStudent: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.text },
  deviceFree: { fontFamily: fonts.dmMedium, fontSize: 10, color: colors.textFaint },

  stateBadge: { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  stateBadgeText: { fontFamily: fonts.dmBold, fontSize: 9 },

  banner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10,
    backgroundColor: "#FFFBEB", borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10,
  },
  bannerGreen: { backgroundColor: colors.edGreen + "10" },
  bannerText: { flex: 1, fontFamily: fonts.dmMedium, fontSize: 12, color: "#92400E" },
  bannerCancel: { fontFamily: fonts.dmBold, fontSize: 12, color: "#92400E", textDecorationLine: "underline" },

  studentCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12, backgroundColor: "#fff" },
  studentTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  studentName: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text },
  studentDevice: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted, marginTop: 2 },

  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  chipDisabled: { opacity: 0.5 },
  chipText: { fontFamily: fonts.dmBold, fontSize: 10.5 },
  noDeskText: { fontFamily: fonts.dmMedium, fontSize: 10.5, color: colors.textMuted, alignSelf: "center" },

  idleNote: { fontFamily: fonts.dmMedium, fontSize: 11.5, color: "#92400E", marginTop: 12 },
});
