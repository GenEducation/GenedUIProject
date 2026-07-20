/**
 * MicPrimingSheet — one-time explainer shown before the first microphone
 * permission request (see useMicPrimingStore for why). Mounted once, globally.
 */
import React from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Mic } from "lucide-react-native";
import { colors, fonts } from "../../theme/tokens";
import { micPrimingStore, useMicPriming } from "../../store/useMicPrimingStore";

export function MicPrimingSheet() {
  const { isVisible } = useMicPriming();

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={micPrimingStore.cancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={micPrimingStore.cancel} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.iconCircle}>
            <Mic size={26} color="#fff" />
          </View>
          <Text style={styles.title}>Tap to talk with your AI tutor</Text>
          <Text style={styles.body}>
            Next we'll ask for microphone access so you can speak with GenEd. You can turn
            this off anytime in your phone's settings.
          </Text>
          <Pressable style={styles.continueBtn} onPress={micPrimingStore.confirm}>
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={micPrimingStore.cancel}>
            <Text style={styles.cancelText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: "center",
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 18 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.genPurple,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontFamily: fonts.dmBold, fontSize: 17, color: colors.text, textAlign: "center", marginBottom: 8 },
  body: {
    fontFamily: fonts.dm,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textMid,
    textAlign: "center",
    marginBottom: 22,
  },
  continueBtn: {
    width: "100%",
    backgroundColor: colors.genPurple,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueText: { fontFamily: fonts.dmBold, fontSize: 15, color: "#fff" },
  cancelBtn: { marginTop: 14, paddingVertical: 6 },
  cancelText: { fontFamily: fonts.dmMedium, fontSize: 13, color: colors.textMuted },
});
