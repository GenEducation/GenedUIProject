/**
 * One-time device token reveal, shown right after registering or rotating a
 * device. Mirrors the web app's src/features/lab/components/DeviceTokenModal.tsx.
 */
import React, { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Copy, Check, AlertTriangle } from "lucide-react-native";
import { colors, fonts, radius } from "../../theme/tokens";

interface Props {
  visible: boolean;
  token: string | null;
  deviceLabel: string;
  onClose: () => void;
}

export function DeviceTokenSheet({ visible, token, deviceLabel, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!token) return;
    await Clipboard.setStringAsync(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Device Token</Text>
          <Text style={styles.subtitle}>{deviceLabel}</Text>

          <View style={styles.warning}>
            <AlertTriangle size={16} color="#B45309" />
            <Text style={styles.warningText}>
              This token is shown only once. Copy it now — it can&apos;t be retrieved again.
            </Text>
          </View>

          <View style={styles.tokenBox}>
            <Text style={styles.tokenText} numberOfLines={3} selectable>
              {token}
            </Text>
          </View>

          <Pressable style={styles.copyBtn} onPress={handleCopy}>
            {copied ? <Check size={16} color="#fff" /> : <Copy size={16} color="#fff" />}
            <Text style={styles.copyBtnText}>{copied ? "Copied" : "Copy token"}</Text>
          </Pressable>

          <Pressable style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 400, backgroundColor: "#fff", borderRadius: radius.xl, padding: 24 },
  title: { fontFamily: fonts.nunito, fontSize: 18, color: colors.text },
  subtitle: { fontFamily: fonts.dmMedium, fontSize: 13, color: colors.textMuted, marginTop: 2, marginBottom: 16 },

  warning: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: radius.sm, padding: 12, marginBottom: 14,
  },
  warningText: { flex: 1, fontFamily: fonts.dmMedium, fontSize: 12, color: "#92400E", lineHeight: 17 },

  tokenBox: {
    backgroundColor: colors.pageBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: 14, marginBottom: 14,
  },
  tokenText: { fontFamily: fonts.mono, fontSize: 12, color: colors.text, lineHeight: 18 },

  copyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.genPurple, borderRadius: radius.md, paddingVertical: 13, marginBottom: 10,
  },
  copyBtnText: { fontFamily: fonts.dmBold, fontSize: 14, color: "#fff" },

  doneBtn: { alignItems: "center", paddingVertical: 10 },
  doneBtnText: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMuted },
});
