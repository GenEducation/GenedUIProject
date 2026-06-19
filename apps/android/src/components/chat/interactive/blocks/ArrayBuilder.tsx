import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import Svg, { Circle } from "react-native-svg";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function ArrayBuilder({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const maxRows: number = render.max_rows ?? 6;
  const maxCols: number = render.max_cols ?? 6;
  const dotColor: string = render.dot_color ?? COLORS.brand;

  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(1);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "array_builder", sessionId);

  const DOT_R = 8, GAP = 20;
  const svgW = cols * (DOT_R * 2 + GAP) + GAP;
  const svgH = rows * (DOT_R * 2 + GAP) + GAP;

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.sliderSection}>
        <Text style={styles.sliderLabel}>Rows: {rows}</Text>
        <Slider
          style={styles.slider}
          minimumValue={1} maximumValue={maxRows} step={1} value={rows}
          onValueChange={(v) => !submitted && !readOnly && setRows(v)}
          minimumTrackTintColor={COLORS.brand} maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.brand} disabled={submitted || readOnly}
        />
        <Text style={styles.sliderLabel}>Columns: {cols}</Text>
        <Slider
          style={styles.slider}
          minimumValue={1} maximumValue={maxCols} step={1} value={cols}
          onValueChange={(v) => !submitted && !readOnly && setCols(v)}
          minimumTrackTintColor={COLORS.brand} maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.brand} disabled={submitted || readOnly}
        />
      </View>
      <View style={styles.center}>
        <Svg width={Math.min(svgW, 280)} height={Math.min(svgH, 200)} viewBox={`0 0 ${svgW} ${svgH}`}>
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => (
              <Circle
                key={`${r}-${c}`}
                cx={GAP + c * (DOT_R * 2 + GAP) + DOT_R}
                cy={GAP + r * (DOT_R * 2 + GAP) + DOT_R}
                r={DOT_R} fill={dotColor}
              />
            ))
          )}
        </Svg>
      </View>
      <Text style={styles.product}>{rows} × {cols} = {rows * cols}</Text>
      <InteractiveFooter
        submitted={submitted} canSubmit={true} submitting={submitting}
        onSubmit={() => submit({ rows, cols })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  sliderSection: { marginBottom: 8 },
  sliderLabel: { fontSize: 12, fontFamily: fonts.dmBold, color: COLORS.brand },
  slider: { height: 36 },
  center: { alignItems: "center", marginBottom: 8 },
  product: { fontSize: 16, fontFamily: fonts.dmBold, color: COLORS.ink },
});
