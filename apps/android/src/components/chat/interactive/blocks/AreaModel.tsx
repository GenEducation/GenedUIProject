import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function AreaModel({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const rows: number = render.rows ?? 4;
  const cols: number = render.cols ?? 5;
  const fillColor: string = render.fill_color ?? COLORS.brand;
  const unit: string = render.unit ?? "sq unit";

  const [selected, setSelected] = useState<number[]>([]);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "area_model", sessionId);

  const toggle = (i: number) => {
    if (submitted || readOnly) return;
    setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.grid}>
        {Array.from({ length: rows * cols }, (_, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.cell, selected.includes(i) && { backgroundColor: fillColor, borderColor: fillColor }]}
            onPress={() => toggle(i)}
            activeOpacity={0.7}
          />
        ))}
      </View>
      <Text style={styles.count}>{selected.length} {unit}{selected.length !== 1 ? "s" : ""} selected</Text>
      <InteractiveFooter
        submitted={submitted} canSubmit={selected.length > 0} submitting={submitting}
        onSubmit={() => submit({ selected: [...selected].sort((a, b) => a - b) })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  cell: {
    width: 32, height: 32, borderRadius: 4,
    backgroundColor: "#F1EFFA", borderWidth: 1, borderColor: "#DDD6FE",
  },
  count: { fontSize: 11, fontFamily: fonts.dmBold, color: COLORS.brand, marginTop: 8 },
});
