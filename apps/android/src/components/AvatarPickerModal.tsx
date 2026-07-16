/**
 * Avatar picker modal, ported from the web app's AvatarPickerModal
 * (src/features/student/components/AvatarPickerModal.tsx).
 */
import React from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { fonts } from "@/theme/tokens";
import type { AvatarId } from "@/store/usePrefsStore";
import { StudentAvatarIllustration } from "./StudentAvatarIllustration";

const GIRL_GRADUATE = require("../../assets/avatars/girl-graduate.png");
const ACCENT = "#F0AD4E";

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedId: AvatarId;
  onSelect: (id: AvatarId) => void;
}

const OPTIONS: { id: AvatarId; label: string }[] = [
  { id: "graduate-boy", label: "Graduate" },
  { id: "graduate-girl", label: "Graduate" },
];

export function AvatarPickerModal({ isOpen, onClose, selectedId, onSelect }: AvatarPickerModalProps) {
  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M18 6 6 18M6 6l12 12" stroke="#94A3B8" strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </Pressable>

          <Text style={styles.title}>Choose your avatar</Text>
          <Text style={styles.subtitle}>
            Pick the picture that shows up on your profile and in the sidebar.
          </Text>

          <View style={styles.row}>
            {OPTIONS.map((option) => {
              const isSelected = option.id === selectedId;
              return (
                <Pressable
                  key={option.id}
                  style={styles.option}
                  onPress={() => { onSelect(option.id); onClose(); }}
                >
                  <View
                    style={[
                      styles.circle,
                      { borderColor: isSelected ? ACCENT : "#E2E8F0" },
                      isSelected && styles.circleSelected,
                    ]}
                  >
                    {option.id === "graduate-boy" ? (
                      <StudentAvatarIllustration bg={ACCENT} />
                    ) : (
                      <Image source={GIRL_GRADUATE} style={styles.circleImg} resizeMode="cover" />
                    )}
                    {isSelected && (
                      <View style={styles.badge}>
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                          <Path d="M20 6 9 17l-5-5" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.label, isSelected && styles.labelSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  closeBtn: { position: "absolute", top: 16, right: 16, padding: 4 },
  title: { fontFamily: fonts.nunito, fontSize: 22, color: "#1A202C", textAlign: "center" },
  subtitle: {
    fontFamily: fonts.dm, fontSize: 14, color: "#4A5568", textAlign: "center",
    marginTop: 8, marginBottom: 24, lineHeight: 20,
  },
  row: { flexDirection: "row", justifyContent: "center", gap: 28 },
  option: { alignItems: "center", gap: 8 },
  circle: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
  },
  circleSelected: {
    shadowColor: ACCENT, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  circleImg: { width: "100%", height: "100%" },
  badge: {
    position: "absolute", bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: ACCENT, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  label: { fontFamily: fonts.dmBold, fontSize: 13, color: "#4A5568" },
  labelSelected: { color: "#1A202C" },
});
