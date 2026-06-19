import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function FractionBar({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const refBar = render.reference_bar || { segments: 4, shaded: 2 };
  const ansBar = render.answer_bar || { segments: 4, shaded: 0 };
  const fillColor: string = render.fill_color ?? COLORS.brand;

  const [selected, setSelected] = useState<number[]>(() => {
    const pre = ansBar.shaded;
    return typeof pre === "number" ? Array.from({ length: pre }, (_, i) => i) : [];
  });
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "fraction_bar", sessionId);

  const toggle = (i: number) => {
    if (submitted || readOnly) return;
    setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  };

  const renderBar = (segs: number, shadedIndices: number[], interactive: boolean, color: string) => (
    <View style={styles.barRow}>
      {Array.from({ length: segs }, (_, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.segment, shadedIndices.includes(i) && { backgroundColor: color, borderColor: color }]}
          onPress={() => interactive && toggle(i)}
          activeOpacity={interactive ? 0.7 : 1}
        />
      ))}
    </View>
  );

  const refShaded = Array.from({ length: refBar.shaded ?? 0 }, (_, i) => i);

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.container}>
        <Text style={styles.barLabel}>Reference</Text>
        {renderBar(refBar.segments ?? 4, refShaded, false, "#94A3B8")}
        <Text style={[styles.barLabel, { marginTop: 10 }]}>Your answer</Text>
        {renderBar(ansBar.segments ?? 4, selected, true, fillColor)}
        <Text style={styles.count}>{selected.length} / {ansBar.segments ?? 4} shaded</Text>
      </View>
      <InteractiveFooter
        submitted={submitted} canSubmit={true} submitting={submitting}
        onSubmit={() => submit({ selected: [...selected].sort((a, b) => a - b) })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  barRow: { flexDirection: "row", gap: 4 },
  segment: {
    flex: 1, height: 36, borderRadius: 6,
    backgroundColor: "#F1EFFA", borderWidth: 1.5, borderColor: "#DDD6FE",
  },
  barLabel: { fontSize: 10, fontFamily: fonts.dmBold, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.8 },
  count: { fontSize: 11, fontFamily: fonts.dmBold, color: COLORS.brand, marginTop: 4 },
});
