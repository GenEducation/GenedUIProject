import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function HundredChart({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const start: number = render.start ?? 1;
  const end: number = render.end ?? 100;
  const columns: number = render.columns ?? 10;
  const fillColor: string = render.fill_color ?? COLORS.brand;
  const maxSel: number = meta?.interaction?.max_selections ?? (end - start + 1);
  const highlightSets: Array<{ label: string; color: string; values: number[] }> = render.highlight_sets ?? [];

  const [selected, setSelected] = useState<number[]>([]);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "hundred_chart", sessionId);

  const cells = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const getHighlight = (n: number) => {
    const matches = highlightSets.filter((s) => s.values.includes(n));
    if (matches.length === 0) return null;
    return matches[0].color;
  };

  const toggle = (n: number) => {
    if (submitted || readOnly) return;
    if (highlightSets.length > 0 && !highlightSets.some((s) => s.values.includes(n))) return;
    setSelected((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : prev.length < maxSel ? [...prev, n] : prev
    );
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.grid, { width: columns * 30 + (columns - 1) * 2 }]}>
          {cells.map((n) => {
            const hl = getHighlight(n);
            const isSel = selected.includes(n);
            return (
              <TouchableOpacity
                key={n}
                style={[
                  styles.cell,
                  hl ? { backgroundColor: hl + "33", borderColor: hl } : null,
                  isSel ? { backgroundColor: fillColor, borderColor: fillColor } : null,
                ]}
                onPress={() => toggle(n)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cellText, isSel && { color: "#fff" }]}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  cell: {
    width: 30, height: 30, borderRadius: 4, alignItems: "center", justifyContent: "center",
    backgroundColor: "#F1EFFA", borderWidth: 1, borderColor: "#DDD6FE",
  },
  cellText: { fontSize: 9, fontFamily: fonts.dmBold, color: COLORS.ink },
});
