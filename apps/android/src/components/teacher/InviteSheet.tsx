/**
 * Bottom sheet for inviting a student by email/username + subject.
 * Triggered by the FAB on the roster screen.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Send } from "lucide-react-native";
import { colors, fonts, radius } from "@/theme/tokens";

const SUBJECTS = [
  "Mathematics", "Science", "English", "History",
  "Geography", "Physics", "Chemistry", "Biology",
];

interface Props {
  visible: boolean;
  isInviting: boolean;
  onClose: () => void;
  onInvite: (emailOrUsername: string, subject: string) => Promise<void>;
}

export function InviteSheet({ visible, isInviting, onClose, onInvite }: Props) {
  const insets = useSafeAreaInsets();
  const [identifier, setIdentifier] = useState("");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setIdentifier("");
    setSubject("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!identifier.trim()) { setError("Enter a student email or username."); return; }
    if (!subject)           { setError("Select a subject."); return; }
    setError("");
    try {
      await onInvite(identifier.trim(), subject);
      reset();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to send invite.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Invite Student</Text>
            <Pressable onPress={handleClose} hitSlop={8} style={styles.closeBtn}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            Enter the student's email or username and pick the subject.
          </Text>

          {/* Identifier input */}
          <Text style={styles.fieldLabel}>Email or Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. student@school.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={identifier}
            onChangeText={(t) => { setIdentifier(t); setError(""); }}
          />

          {/* Subject picker */}
          <Text style={styles.fieldLabel}>Subject</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectRow}
          >
            {SUBJECTS.map((s) => {
              const active = s === subject;
              return (
                <Pressable
                  key={s}
                  onPress={() => { setSubject(s); setError(""); }}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{s}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
            onPress={handleSubmit}
            disabled={isInviting}
          >
            {isInviting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Send size={17} color="#fff" />
                <Text style={styles.submitText}>Send Invite</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: "center", marginBottom: 18,
  },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 6,
  },
  title: { fontFamily: fonts.nunito, fontSize: 20, color: colors.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.pageBg, alignItems: "center", justifyContent: "center",
  },
  subtitle: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted, marginBottom: 18 },

  fieldLabel: {
    fontFamily: fonts.dmBold, fontSize: 12,
    color: colors.textMid, marginBottom: 8,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.dm,
    fontSize: 14,
    color: colors.text,
    marginBottom: 16,
  },

  subjectRow: { gap: 8, paddingBottom: 16 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.pageBg,
  },
  pillActive: { borderColor: colors.emerald, backgroundColor: colors.emerald + "10" },
  pillText:   { fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMid },
  pillTextActive: { color: colors.emerald },

  error: { fontFamily: fonts.dm, fontSize: 12, color: colors.coral, marginBottom: 12 },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: colors.emerald,
    borderRadius: radius.md, paddingVertical: 15, marginTop: 4,
  },
  submitText: { fontFamily: fonts.dmBold, fontSize: 15, color: "#fff" },
});
