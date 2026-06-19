import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function DragMatch({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const leftItems: Array<{ id: string; label: string }> = render.left ?? [];
  const rightItems: Array<{ id: string; label: string }> = render.right ?? [];

  // pairs: { leftId → rightId }
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "drag_match", sessionId);

  const usedRight = Object.values(pairs);

  const handleLeft = (id: string) => {
    if (submitted || readOnly) return;
    setSelectedLeft((prev) => prev === id ? null : id);
  };

  const handleRight = (id: string) => {
    if (submitted || readOnly) return;
    if (!selectedLeft) {
      // Unassign if already mapped
      const existingLeft = Object.keys(pairs).find((k) => pairs[k] === id);
      if (existingLeft) setPairs((prev) => { const n = { ...prev }; delete n[existingLeft]; return n; });
      return;
    }
    setPairs((prev) => ({ ...prev, [selectedLeft]: id }));
    setSelectedLeft(null);
  };

  const buildAnswer = () =>
    Object.entries(pairs).map(([l, r]) => [l, r]);

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.columns}>
        <View style={styles.col}>
          {leftItems.map((item) => {
            const isSel = selectedLeft === item.id;
            const isMatched = !!pairs[item.id];
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, isSel && styles.chipSelected, isMatched && styles.chipMatched]}
                onPress={() => handleLeft(item.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, (isSel || isMatched) && { color: "#fff" }]} numberOfLines={2}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.divider} />
        <View style={styles.col}>
          {rightItems.map((item) => {
            const isUsed = usedRight.includes(item.id);
            const matchedLeft = leftItems.find((l) => pairs[l.id] === item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.dropZone, isUsed && styles.dropZoneUsed, selectedLeft && !isUsed && styles.dropZoneTarget]}
                onPress={() => handleRight(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText} numberOfLines={2}>{item.label}</Text>
                {matchedLeft && (
                  <Text style={styles.matchBadge} numberOfLines={1}>← {matchedLeft.label}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {selectedLeft && (
        <Text style={styles.hint}>Tap a right-side item to match</Text>
      )}
      <InteractiveFooter
        submitted={submitted} canSubmit={Object.keys(pairs).length > 0} submitting={submitting}
        onSubmit={() => submit({ pairs: buildAnswer() })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: "row", gap: 4 },
  col: { flex: 1, gap: 6 },
  divider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 4 },
  chip: {
    padding: 10, borderRadius: 10,
    backgroundColor: COLORS.cell, borderWidth: 1.5, borderColor: "#DDD6FE",
  },
  chipSelected: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipMatched: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  dropZone: {
    padding: 10, borderRadius: 10, minHeight: 44,
    backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  dropZoneUsed: { backgroundColor: "#D1FAE5", borderColor: COLORS.success, borderStyle: "solid" },
  dropZoneTarget: { borderColor: COLORS.brand, borderStyle: "solid" },
  chipText: { fontSize: 12, fontFamily: fonts.dmBold, color: COLORS.ink },
  matchBadge: { fontSize: 10, fontFamily: fonts.dm, color: COLORS.success, marginTop: 2 },
  hint: { fontSize: 11, fontFamily: fonts.dm, color: COLORS.brand, marginTop: 6, textAlign: "center" },
});
