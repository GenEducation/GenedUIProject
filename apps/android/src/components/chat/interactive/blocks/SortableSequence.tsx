import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { GripVertical } from "lucide-react-native";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function SortableSequence({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const rawItems: Array<{ id: string; label: string }> = render.items ?? [];

  // Deterministic shuffle seeded by directiveId
  const shuffle = (arr: typeof rawItems): typeof rawItems => {
    const seed = directiveId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = (seed * (i + 1)) % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    // Ensure it's not already sorted
    const sorted = JSON.stringify(arr.map((x) => x.id));
    if (JSON.stringify(a.map((x) => x.id)) === sorted && a.length > 1) [a[0], a[1]] = [a[1], a[0]];
    return a;
  };

  const [items, setItems] = useState(() => shuffle(rawItems));
  const [dragging, setDragging] = useState<number | null>(null);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "sortable_sequence", sessionId);

  const moveUp = (i: number) => {
    if (i === 0 || submitted || readOnly) return;
    setItems((prev) => { const a = [...prev]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; });
  };
  const moveDown = (i: number) => {
    if (i === items.length - 1 || submitted || readOnly) return;
    setItems((prev) => { const a = [...prev]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; });
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.list}>
        {items.map((item, i) => (
          <View key={item.id} style={[styles.tile, dragging === i && styles.tileActive]}>
            <GripVertical size={16} color={COLORS.muted} />
            <Text style={styles.tileText} numberOfLines={2}>{item.label}</Text>
            <View style={styles.arrows}>
              <TouchableOpacity onPress={() => moveUp(i)} style={styles.arrowBtn} activeOpacity={0.6}>
                <Text style={styles.arrowText}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveDown(i)} style={styles.arrowBtn} activeOpacity={0.6}>
                <Text style={styles.arrowText}>↓</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
      <InteractiveFooter
        submitted={submitted} canSubmit={true} submitting={submitting}
        onSubmit={() => submit({ order: items.map((x) => x.id) })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 6 },
  tile: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: COLORS.border,
  },
  tileActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandSoft },
  tileText: { flex: 1, fontSize: 13, fontFamily: fonts.dmBold, color: COLORS.ink },
  arrows: { flexDirection: "row", gap: 4 },
  arrowBtn: {
    width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.cell,
  },
  arrowText: { fontSize: 14, color: COLORS.brand, fontWeight: "bold" },
});
