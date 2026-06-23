import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius } from "../../theme/tokens";
import { StatusBadge } from "./StatusBadge";
import { partnerService } from "../../services/partnerService";
import type { PartnerStudent, PartnerStudentDetail } from "../../types/partner";

interface Props {
  student: PartnerStudent;
  partnerId: string;
  onClose: () => void;
}

export function StudentDetailSheet({ student, partnerId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<PartnerStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    partnerService
      .fetchStudentDetail(partnerId, student.id)
      .then(setDetail)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [partnerId, student.id]);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{student.initials ?? "?"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{student.name}</Text>
            <Text style={styles.grade}>Grade {student.grade}</Text>
          </View>
          <StatusBadge status={student.status} />
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.genPurple} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Couldn't load student details.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <DetailRow icon="📧" label="Email"     value={detail?.email       ?? "—"} />
            <DetailRow icon="🏫" label="Board"     value={detail?.school_board ?? "—"} />
            <DetailRow icon="📚" label="Grade"     value={detail ? `Grade ${detail.grade}` : "—"} />
            {(detail?.enrolled_subjects?.length ?? 0) > 0 && (
              <View style={styles.subjectsSection}>
                <Text style={styles.subjectsLabel}>Enrolled Subjects</Text>
                <View style={styles.chips}>
                  {detail!.enrolled_subjects!.map((sub) => (
                    <View key={sub} style={styles.chip}>
                      <Text style={styles.chipText}>{sub}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000055",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.genPurple + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  initials:  { fontFamily: fonts.nunito, fontSize: 18, color: colors.genPurple },
  name:      { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text },
  grade:     { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  closeBtn:  { padding: 8 },
  closeText: { fontSize: 16, color: colors.textMuted },
  center:    { paddingVertical: 40, alignItems: "center" },
  errorText: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.coral },
  body:      { padding: 20, gap: 4 },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailIcon:  { fontSize: 18, marginTop: 2 },
  detailLabel: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
  detailValue: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },

  subjectsSection: { paddingTop: 16 },
  subjectsLabel: {
    fontFamily: fonts.dmBold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.genPurple + "12",
    borderWidth: 1,
    borderColor: colors.genPurple + "30",
  },
  chipText: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.genPurple },
});
