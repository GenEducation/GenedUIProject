import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";

export default function SymmetryGrid({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const rows: number = render.rows ?? 5;
  const cols: number = render.cols ?? 6;
  const axis: string = render.axis ?? "vertical";
  const givenCells: number[] = render.given_cells ?? [];
  const fillColor: string = render.fill_color ?? COLORS.brand;

  const [selected, setSelected] = useState<number[]>([]);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "symmetry_grid", sessionId);

  const toggle = (i: number) => {
    if (submitted || readOnly || givenCells.includes(i)) return;
    setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  };

  const axisCol = axis === "vertical" ? Math.floor(cols / 2) : -1;
  const axisRow = axis === "horizontal" ? Math.floor(rows / 2) : -1;

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View>
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={styles.row}>
            {Array.from({ length: cols }, (_, c) => {
              const i = r * cols + c;
              const isGiven = givenCells.includes(i);
              const isSel = selected.includes(i);
              const isAxisV = c === axisCol;
              const isAxisH = r === axisRow;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.cell,
                    isGiven && { backgroundColor: "#94A3B8", borderColor: "#64748B" },
                    isSel && { backgroundColor: fillColor, borderColor: fillColor },
                    isAxisV && styles.axisV,
                    isAxisH && styles.axisH,
                  ]}
                  onPress={() => toggle(i)}
                  activeOpacity={0.7}
                />
              );
            })}
          </View>
        ))}
      </View>
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
  row: { flexDirection: "row", gap: 3 },
  cell: {
    width: 34, height: 34, borderRadius: 4,
    backgroundColor: "#F1EFFA", borderWidth: 1, borderColor: "#DDD6FE", marginBottom: 3,
  },
  axisV: { borderLeftWidth: 3, borderLeftColor: COLORS.brand },
  axisH: { borderTopWidth: 3, borderTopColor: COLORS.brand },
});
