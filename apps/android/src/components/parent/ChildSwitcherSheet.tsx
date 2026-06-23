/**
 * Bottom sheet for switching the active child.
 * Opens from the header of Progress, Schedule, and Chat screens.
 */
import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius } from "../../theme/tokens";
import { parentStore } from "../../store/useParentStore";
import type { LinkedChild } from "../../types/parent";

interface Props {
  visible: boolean;
  children: LinkedChild[];
  selectedChildId: string | null;
  onClose: () => void;
}

export function ChildSwitcherSheet({
  visible,
  children,
  selectedChildId,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  const handleSelect = (child: LinkedChild) => {
    parentStore.setSelectedChildId(child.id);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.handle} />

        <Text style={styles.title}>Switch Child</Text>

        <FlatList
          data={children}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => {
            const active = item.id === selectedChildId;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.item,
                  active && styles.itemActive,
                  pressed && styles.itemPressed,
                ]}
                onPress={() => handleSelect(item)}
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: active ? colors.edGreen : colors.edGreen + "18" },
                  ]}
                >
                  <Text
                    style={[
                      styles.initials,
                      { color: active ? "#fff" : colors.edGreen },
                    ]}
                  >
                    {item.initials}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, active && styles.nameActive]}>
                    {item.name}
                  </Text>
                  {item.grade ? (
                    <Text style={styles.grade}>Grade {item.grade}</Text>
                  ) : null}
                </View>
                {active && <Text style={styles.check}>✓</Text>}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No approved children linked yet.</Text>
          }
        />
      </View>
    </Modal>
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
    maxHeight: "60%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.dmBold,
    fontSize: 13,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemActive: { backgroundColor: colors.edGreen + "08" },
  itemPressed: { backgroundColor: colors.pageBg },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontFamily: fonts.nunito, fontSize: 16 },
  name:     { fontFamily: fonts.dmBold, fontSize: 15, color: colors.text },
  nameActive: { color: colors.edGreen },
  grade:    { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  check:    { fontSize: 16, color: colors.edGreen, fontFamily: fonts.dmBold },
  empty:    { padding: 24, textAlign: "center", fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted },
});
