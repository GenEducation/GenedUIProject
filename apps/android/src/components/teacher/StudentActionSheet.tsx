/**
 * Bottom sheet that appears when a teacher taps a student card.
 * Shows context-aware actions: PENDING → Approve / Remove
 *                              APPROVED → View Chats / View Report / Remove
 */
import React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageSquare, BarChart2, UserCheck, Trash2, X } from "lucide-react-native";
import { colors, fonts, radius } from "@/theme/tokens";
import type { TeacherStudent } from "@/types/teacher";

interface Props {
  student: TeacherStudent | null;
  approvingId: string | null;
  removingId: string | null;
  onClose: () => void;
  onApprove: (student: TeacherStudent) => void;
  onViewChats: (student: TeacherStudent) => void;
  onViewReport: (student: TeacherStudent) => void;
  onRemove: (student: TeacherStudent) => void;
}

function studentLabel(s: TeacherStudent) {
  return s.name ?? s.username ?? s.email ?? "Student";
}

export function StudentActionSheet({
  student,
  approvingId,
  removingId,
  onClose,
  onApprove,
  onViewChats,
  onViewReport,
  onRemove,
}: Props) {
  const insets = useSafeAreaInsets();
  if (!student) return null;

  const isPending  = student.status === "PENDING";
  const isApproving = approvingId === student.student_id;
  const isRemoving  = removingId  === student.student_id;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Student info */}
        <View style={styles.studentRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {studentLabel(student)[0]?.toUpperCase() ?? "S"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>{studentLabel(student)}</Text>
            <Text style={styles.studentMeta}>
              {[student.subject, student.grade ? `Grade ${student.grade}` : null]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <X size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Status badge */}
        <View style={[styles.badge, isPending ? styles.badgePending : styles.badgeApproved]}>
          <Text style={[styles.badgeText, isPending ? styles.badgeTextPending : styles.badgeTextApproved]}>
            {isPending ? "Pending Approval" : "Approved"}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isPending ? (
            <ActionButton
              icon={<UserCheck size={20} color="#fff" />}
              label={isApproving ? "Approving…" : "Approve Student"}
              bgColor={colors.emerald}
              textColor="#fff"
              loading={isApproving}
              onPress={() => onApprove(student)}
            />
          ) : (
            <>
              <ActionButton
                icon={<MessageSquare size={20} color={colors.navy} />}
                label="View Chat History"
                bgColor={colors.navy + "10"}
                textColor={colors.navy}
                onPress={() => onViewChats(student)}
              />
              <ActionButton
                icon={<BarChart2 size={20} color={colors.genBlue} />}
                label="View Report Card"
                bgColor={colors.genBlue + "10"}
                textColor={colors.genBlue}
                onPress={() => onViewReport(student)}
              />
            </>
          )}

          <ActionButton
            icon={<Trash2 size={20} color={colors.coral} />}
            label={isRemoving ? "Removing…" : "Remove Student"}
            bgColor={colors.coral + "10"}
            textColor={colors.coral}
            loading={isRemoving}
            onPress={() => onRemove(student)}
          />
        </View>
      </View>
    </Modal>
  );
}

function ActionButton({
  icon,
  label,
  bgColor,
  textColor,
  loading,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  textColor: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionBtn, { backgroundColor: bgColor, opacity: pressed ? 0.8 : 1 }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? <ActivityIndicator color={textColor} size="small" /> : icon}
      <Text style={[styles.actionLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 18,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.navy + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.nunito, fontSize: 20, color: colors.navy },
  studentName: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text },
  studentMeta: { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.pageBg,
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 20,
  },
  badgePending:  { backgroundColor: colors.sun + "20" },
  badgeApproved: { backgroundColor: colors.emerald + "15" },
  badgeText:     { fontFamily: fonts.dmBold, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 },
  badgeTextPending:  { color: colors.sun },
  badgeTextApproved: { color: colors.emerald },

  actions: { gap: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: radius.md,
    minHeight: 54,
  },
  actionLabel: { fontFamily: fonts.dmBold, fontSize: 15 },
});
