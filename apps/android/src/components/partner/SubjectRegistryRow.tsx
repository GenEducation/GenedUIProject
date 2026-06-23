import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { colors, fonts, subjectVisual } from "../../theme/tokens";
import { StatusBadge } from "./StatusBadge";
import type { SubjectRegistryItem } from "../../types/partner";

interface Props {
  item: SubjectRegistryItem;
  onDelete?: () => void;
  onCancel?: () => void;
}

export function SubjectRegistryRow({ item, onDelete, onCancel }: Props) {
  const visual = subjectVisual[item.subject.toLowerCase()] ?? {
    color: colors.genPurple,
    bg:    colors.genPurple + "12",
    icon:  "📘",
    label: item.subject,
  };

  // Pulse animation for in-progress rows
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (item.status !== "in-progress") {
      pulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [item.status, pulse]);

  return (
    <View style={styles.row}>
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: visual.bg }]}>
        <Text style={styles.icon}>{visual.icon}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.document_title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.subject}
          {item.grade ? `  ·  Grade ${item.grade}` : ""}
          {item.chapters_detected ? `  ·  ${item.chapters_detected} ch.` : ""}
        </Text>
        {item.status === "in-progress" && (
          <View style={styles.progressRow}>
            <Animated.View style={[styles.progressDot, { opacity: pulse }]} />
            <Text style={styles.progressText}>Processing…</Text>
          </View>
        )}
      </View>

      {/* Right side */}
      <View style={styles.right}>
        <StatusBadge status={item.status} />
        {item.status === "in-progress" && onCancel ? (
          <Pressable style={styles.actionBtn} onPress={onCancel} hitSlop={8}>
            <Text style={styles.cancelText}>✕</Text>
          </Pressable>
        ) : (item.status === "active" || item.status === "failed") && onDelete ? (
          <Pressable style={styles.actionBtn} onPress={onDelete} hitSlop={8}>
            <Text style={styles.deleteText}>🗑</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  icon:  { fontSize: 18 },
  info:  { flex: 1, gap: 3 },
  title: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text, lineHeight: 20 },
  meta:  { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted },

  progressRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  progressDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#B45309" },
  progressText: { fontFamily: fonts.dmMedium, fontSize: 11, color: "#B45309" },

  right: { alignItems: "flex-end", gap: 8, flexShrink: 0 },
  actionBtn: { padding: 4 },
  cancelText: { fontSize: 14, color: colors.textMuted },
  deleteText: { fontSize: 16 },
});
