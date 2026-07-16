/**
 * Reschedule bottom sheet — mobile port of the web app's shared
 * RescheduleModal.tsx (src/components/shared/RescheduleModal.tsx).
 * Lets the student pick a new date/time for an existing scheduled session
 * whose content preparation failed. Subject/topic/session type are shown
 * read-only; only date (required) and time (optional, IST) are editable.
 */
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, BookOpen, GraduationCap, X } from "lucide-react-native";
import { MonthCalendar } from "./MonthCalendar";
import { TimeField } from "./TimeField";
import { colors, fonts, radius } from "../theme/tokens";
import type { SessionType } from "../types/schedule";

export interface RescheduleTarget {
  id: string; // scheduled_session row id
  sessionType: SessionType;
  subject: string;
  topic: string | null;
}

interface Props {
  target: RescheduleTarget | null;
  onClose: () => void;
  onConfirm: (scheduledDate: string, scheduledTime: string) => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
}

function pad(n: number) { return n.toString().padStart(2, "0"); }
function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function RescheduleSheet({ target, onClose, onConfirm, isSubmitting, errorMessage }: Props) {
  const insets = useSafeAreaInsets();
  const visible = !!target;

  const [scheduledDate, setScheduledDate] = useState(tomorrowDateString());
  const [scheduledTime, setScheduledTime] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (visible) {
      setScheduledDate(tomorrowDateString());
      setScheduledTime("");
      setAttempted(false);
    }
  }, [visible]);

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleConfirm = () => {
    if (!scheduledDate) return;
    setAttempted(true);
    onConfirm(scheduledDate, scheduledTime);
  };

  if (!target) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Reschedule Session</Text>
          <Pressable onPress={handleClose} disabled={isSubmitting} style={styles.closeBtn} hitSlop={8}>
            <X size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Context block (read-only) */}
        <View style={styles.context}>
          <View style={styles.contextTop}>
            <Text style={styles.contextTitle} numberOfLines={1}>{target.topic || target.subject}</Text>
            <View style={styles.typeBadge}>
              {target.sessionType === "TEST" ? (
                <GraduationCap size={10} color={colors.genPurple} />
              ) : (
                <BookOpen size={10} color={colors.genPurple} />
              )}
              <Text style={styles.typeBadgeText}>{target.sessionType}</Text>
            </View>
          </View>
          <Text style={styles.contextSubject}>{target.subject}</Text>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={styles.fieldLabel}>New Date</Text>
          <MonthCalendar value={scheduledDate} onSelect={setScheduledDate} minDate={tomorrowDateString()} />
        </View>

        <TimeField label="New Start Time (optional, IST)" value={scheduledTime} onChange={setScheduledTime} />

        {attempted && errorMessage ? (
          <View style={styles.errorBanner}>
            <AlertTriangle size={16} color={colors.coral} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Pressable
            style={[styles.cancelBtn, isSubmitting && styles.btnDisabled]}
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmBtn, (isSubmitting || !scheduledDate) && styles.btnDisabled]}
            onPress={handleConfirm}
            disabled={isSubmitting || !scheduledDate}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.confirmText}>Confirm Reschedule</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#00000066" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "90%",
    backgroundColor: "#fff", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 20, gap: 16,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 4 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.nunito, fontSize: 18, color: colors.text },
  closeBtn: { padding: 4 },

  context: { backgroundColor: colors.genPurple + "0D", borderRadius: radius.lg, padding: 14, gap: 6 },
  contextTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  contextTitle: { flex: 1, fontFamily: fonts.dmBold, fontSize: 13, color: colors.genPurple },
  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4,
  },
  typeBadgeText: { fontFamily: fonts.dmBold, fontSize: 9, color: colors.genPurple, textTransform: "uppercase", letterSpacing: 0.5 },
  contextSubject: { fontFamily: fonts.dmBold, fontSize: 10, color: colors.genPurple + "AA", textTransform: "uppercase", letterSpacing: 1 },

  fieldLabel: { fontFamily: fonts.dmBold, fontSize: 11, letterSpacing: 0.5, color: colors.textMuted, textTransform: "uppercase" },

  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFF1EC", borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 11,
  },
  errorText: { flex: 1, fontFamily: fonts.dmMedium, fontSize: 13, color: colors.coral },

  footer: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 14,
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff",
  },
  cancelText: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text, textTransform: "uppercase", letterSpacing: 0.5 },
  confirmBtn: {
    flex: 2, alignItems: "center", justifyContent: "center", paddingVertical: 14,
    borderRadius: radius.lg, backgroundColor: colors.genPurple,
  },
  confirmText: { fontFamily: fonts.dmBold, fontSize: 13, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 },
  btnDisabled: { opacity: 0.5 },
});
