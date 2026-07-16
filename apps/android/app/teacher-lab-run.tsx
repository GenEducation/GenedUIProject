/**
 * Teacher portal — run a scheduled lab period. Activate/End controls, then
 * switches to the live allocation board while ACTIVE, or the class report
 * once COMPLETED. Mirrors the web app's
 * src/features/lab/components/RunPeriod.tsx state-switch logic.
 */
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, PlayCircle, StopCircle, Users } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { LiveBoard } from "@/components/teacher/LiveBoard";
import { ClassReport } from "@/components/teacher/ClassReport";
import { labStore, useLabStore } from "@/store/useLabStore";
import { useTeacherId } from "@/hooks/useTeacherId";
import { ApiRequestError } from "@/services/authFetch";
import { colors, fonts, radius } from "@/theme/tokens";

interface ToastItem { id: number; type: "success" | "error"; title: string; description?: string }

export default function TeacherLabRunScreen() {
  const router = useRouter();
  const teacherId = useTeacherId();
  const { slotId } = useLocalSearchParams<{ slotId: string }>();
  const { slots, board, isLoadingBoard, boardError } = useLabStore();

  const [activateResult, setActivateResult] = useState<{ assigned: number; idle: number } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [noRosterError, setNoRosterError] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (slotId && !slots.some((s) => s.id === slotId)) {
      labStore.fetchSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  const slot = useMemo(() => slots.find((s) => s.id === slotId), [slots, slotId]);

  const pushToast = (t: Omit<ToastItem, "id">) =>
    setToasts((prev) => [...prev, { ...t, id: Date.now() + Math.random() }]);
  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => setToasts((prev) => prev.slice(1)), 3000);
    return () => clearTimeout(t);
  }, [toasts]);

  useEffect(() => {
    if (!slot || !slotId) return;
    if (slot.status === "ACTIVE" || slot.status === "COMPLETED") {
      labStore.openBoard(slotId, teacherId);
    }
    return () => labStore.closeBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot?.status, slotId, teacherId]);

  if (!slotId || !slot) {
    return (
      <Screen background={colors.pageBg}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.emerald} />
        </View>
      </Screen>
    );
  }

  const handleActivate = async () => {
    setIsBusy(true);
    setNoRosterError(false);
    try {
      const result = await labStore.activateSlot(slotId);
      setActivateResult({ assigned: result.assigned, idle: result.idle });
      pushToast({ type: "success", title: "Period activated", description: `${result.assigned} assigned · ${result.idle} waiting` });
    } catch (e) {
      if (e instanceof ApiRequestError && e.error_code === "LAB_1101") {
        setNoRosterError(true);
      } else {
        pushToast({ type: "error", title: "Couldn't activate", description: e instanceof Error ? e.message : undefined });
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleEnd = async () => {
    setIsBusy(true);
    try {
      await labStore.endSlot(slotId);
      pushToast({ type: "success", title: "Period ended" });
    } catch (e) {
      pushToast({ type: "error", title: "Couldn't end period", description: e instanceof Error ? e.message : undefined });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Screen background={colors.pageBg}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <ArrowLeft size={14} color={colors.textMuted} />
          <Text style={styles.backText}>Back to schedule</Text>
        </Pressable>

        <View style={styles.headerCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Grade {slot.grade}{slot.section} · {slot.subject}</Text>
            <Text style={styles.title}>{slot.chapter || slot.topic || "Lab Period"}</Text>
          </View>
          {slot.status === "SCHEDULED" ? (
            <Pressable style={styles.activateBtn} onPress={handleActivate} disabled={isBusy}>
              {isBusy ? <ActivityIndicator color="#fff" size="small" /> : <PlayCircle size={16} color="#fff" />}
              <Text style={styles.activateBtnText}>{isBusy ? "Activating…" : "Activate"}</Text>
            </Pressable>
          ) : null}
          {slot.status === "ACTIVE" ? (
            <Pressable style={styles.endBtn} onPress={handleEnd} disabled={isBusy}>
              {isBusy ? <ActivityIndicator color="#fff" size="small" /> : <StopCircle size={16} color="#fff" />}
              <Text style={styles.endBtnText}>{isBusy ? "Ending…" : "End"}</Text>
            </Pressable>
          ) : null}
        </View>

        {noRosterError ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>No roster found for this grade/section. Import the class register first.</Text>
          </View>
        ) : null}

        {activateResult && slot.status === "ACTIVE" ? (
          <View style={styles.infoBanner}>
            <Users size={14} color={colors.edGreen} />
            <Text style={styles.infoText}>
              <Text style={{ fontFamily: fonts.dmBold }}>{activateResult.assigned}</Text> assigned to devices,{" "}
              <Text style={{ fontFamily: fonts.dmBold }}>{activateResult.idle}</Text> waiting for a free desk.
            </Text>
          </View>
        ) : null}

        {slot.status === "COMPLETED" ? (
          <ClassReport slotId={slotId} />
        ) : slot.status === "ACTIVE" ? (
          isLoadingBoard && !board ? (
            <Text style={styles.mutedNote}>Loading board…</Text>
          ) : boardError ? (
            <Text style={styles.errorNote}>{boardError}</Text>
          ) : board ? (
            <LiveBoard slotId={slotId} board={board} onToast={pushToast} />
          ) : null
        ) : (
          <Text style={styles.mutedNote}>Activate the period to open the live board.</Text>
        )}
      </View>

      {/* Toasts */}
      <View style={styles.toastStack} pointerEvents="none">
        {toasts.map((t) => (
          <View key={t.id} style={[styles.toast, t.type === "error" && styles.toastError]}>
            <Text style={styles.toastTitle}>{t.title}</Text>
            {t.description ? <Text style={styles.toastDesc}>{t.description}</Text> : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, alignSelf: "flex-start" },
  backText: { fontFamily: fonts.dmBold, fontSize: 12.5, color: colors.textMuted },

  headerCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    padding: 16, backgroundColor: "#fff", marginBottom: 16,
  },
  eyebrow: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.emerald, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontFamily: fonts.serif, fontSize: 18, color: colors.text, marginTop: 4 },

  activateBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.emerald, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11,
  },
  activateBtnText: { fontFamily: fonts.dmBold, fontSize: 13, color: "#fff" },
  endBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.coral, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11,
  },
  endBtnText: { fontFamily: fonts.dmBold, fontSize: 13, color: "#fff" },

  warningBanner: { backgroundColor: "#FFFBEB", borderRadius: radius.sm, padding: 12, marginBottom: 14 },
  warningText: { fontFamily: fonts.dmMedium, fontSize: 12.5, color: "#92400E" },

  infoBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.edGreen + "10", borderRadius: radius.sm, padding: 12, marginBottom: 14,
  },
  infoText: { flex: 1, fontFamily: fonts.dmMedium, fontSize: 12.5, color: colors.edGreen },

  mutedNote: { fontFamily: fonts.dmMedium, fontSize: 13, color: colors.textMuted },
  errorNote: { fontFamily: fonts.dmMedium, fontSize: 13, color: colors.coral },

  toastStack: { position: "absolute", bottom: 20, left: 20, right: 20, gap: 8 },
  toast: {
    backgroundColor: colors.edGreen, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  toastError: { backgroundColor: colors.coral },
  toastTitle: { fontFamily: fonts.dmBold, fontSize: 13, color: "#fff" },
  toastDesc: { fontFamily: fonts.dmMedium, fontSize: 11, color: "#fff", opacity: 0.9, marginTop: 2 },
});
