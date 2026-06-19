/**
 * PickerSheet — generic bottom-sheet single-select. A native-feeling
 * replacement for an HTML <select>. Render a trigger row that opens it.
 */
import React from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet, Dimensions } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";

const SCREEN_H = Dimensions.get("window").height;

interface TriggerProps {
  label: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onPress: () => void;
}

/** The tappable field that opens the sheet. */
export function PickerField({ label, value, placeholder, disabled, onPress }: TriggerProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={onPress} disabled={disabled} style={[styles.field, disabled && styles.fieldDisabled]}>
        <Text style={[styles.fieldValue, !value && styles.fieldPlaceholder]} numberOfLines={1}>
          {value || placeholder || "Select…"}
        </Text>
        <ChevronDown size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

interface SheetProps {
  visible: boolean;
  title: string;
  options: string[];
  selected?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  emptyText?: string;
}

export function PickerSheet({ visible, title, options, selected, onSelect, onClose, emptyText }: SheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>
          {options.length === 0 ? (
            <Text style={styles.empty}>{emptyText || "Nothing available"}</Text>
          ) : (
            <FlatList
              data={options}
              keyExtractor={(o, i) => `${o}-${i}`}
              style={{ maxHeight: SCREEN_H * 0.5 }}
              renderItem={({ item }) => {
                const isSel = item === selected;
                return (
                  <Pressable style={styles.row} onPress={() => { onSelect(item); onClose(); }}>
                    <Text style={[styles.rowText, isSel && styles.rowTextSel]} numberOfLines={1}>{item}</Text>
                    {isSel ? <Check size={18} color={colors.genPurple} /> : null}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { fontFamily: fonts.dmBold, fontSize: 11, letterSpacing: 0.5, color: colors.textMuted, textTransform: "uppercase" },
  field: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: colors.card },
  fieldDisabled: { opacity: 0.5 },
  fieldValue: { flex: 1, fontFamily: fonts.dmMedium, fontSize: 14, color: colors.text },
  fieldPlaceholder: { color: colors.textMuted },
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, maxHeight: SCREEN_H * 0.7 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 },
  title: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text, marginBottom: 12 },
  empty: { fontFamily: fonts.dm, fontSize: 14, color: colors.textMuted, paddingVertical: 16, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border + "80" },
  rowText: { flex: 1, fontFamily: fonts.dmMedium, fontSize: 15, color: colors.textMid },
  rowTextSel: { color: colors.genPurple, fontFamily: fonts.dmBold },
});
