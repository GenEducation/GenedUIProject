import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";

export default function SelectableGrid({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const rows: number = render.rows ?? 2;
  const cols: number = render.cols ?? 4;
  const segments: number = render.segments ?? rows * cols;
  const shape: string = render.shape ?? "grid";
  const fillColor: string = render.fill_color ?? COLORS.brand;
  const maxSel: number = meta?.interaction?.max_selections ?? segments;

  const [selected, setSelected] = useState<number[]>([]);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "selectable_grid", sessionId);

  const toggle = (i: number) => {
    if (submitted || readOnly) return;
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : prev.length < maxSel ? [...prev, i] : prev
    );
  };

  const SIZE = 220;

  if (shape === "circle") {
    const cx = SIZE / 2, cy = SIZE / 2, r = 90;
    const sliceAngle = (2 * Math.PI) / segments;
    const paths = Array.from({ length: segments }, (_, i) => {
      const a1 = i * sliceAngle - Math.PI / 2;
      const a2 = a1 + sliceAngle;
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      const large = sliceAngle > Math.PI ? 1 : 0;
      return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    });
    return (
      <InteractiveShell label={meta?.label} prompt={meta?.question}>
        <View style={styles.center}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {paths.map((d, i) => (
              <Path
                key={i} d={d}
                fill={selected.includes(i) ? fillColor : "#F1EFFA"}
                stroke="#fff" strokeWidth={2}
                onPress={() => toggle(i)}
              />
            ))}
          </Svg>
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: "#F1EFFA", borderWidth: 1.5, borderColor: "#DDD6FE",
  },
  center: { alignItems: "center" },
});
