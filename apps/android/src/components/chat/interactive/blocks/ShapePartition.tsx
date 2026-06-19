import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function ShapePartition({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const shape: string = render.shape ?? "circle";
  const allowedParts: number[] = render.allowed_parts ?? [2, 3, 4, 6, 8];

  const [parts, setParts] = useState<number>(allowedParts[0] ?? 2);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "shape_partition", sessionId);

  const SIZE = 180, cx = SIZE / 2, cy = SIZE / 2, r = 75;
  const slicePaths = Array.from({ length: parts }, (_, i) => {
    const a1 = (i * (2 * Math.PI) / parts) - Math.PI / 2;
    const a2 = ((i + 1) * (2 * Math.PI) / parts) - Math.PI / 2;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const large = (2 * Math.PI / parts) > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  });

  const rectSliceW = 240 / parts;

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.center}>
        {shape === "circle" ? (
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {slicePaths.map((d, i) => (
              <Path key={i} d={d} fill={COLORS.brandSoft} stroke={COLORS.brand} strokeWidth={1.5} />
            ))}
          </Svg>
        ) : (
          <Svg width={240} height={60} viewBox="0 0 240 60">
            {Array.from({ length: parts }, (_, i) => (
              <Rect
                key={i} x={i * rectSliceW} y={0} width={rectSliceW} height={60}
                fill={COLORS.brandSoft} stroke={COLORS.brand} strokeWidth={1.5}
              />
            ))}
          </Svg>
        )}
        <Text style={styles.label}>{parts} equal parts</Text>
      </View>
      <View style={styles.btnRow}>
        {allowedParts.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.partBtn, parts === p && styles.partBtnActive]}
            onPress={() => !submitted && !readOnly && setParts(p)}
            activeOpacity={0.7}
          >
            <Text style={[styles.partBtnText, parts === p && styles.partBtnTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <InteractiveFooter
        submitted={submitted} canSubmit={true} submitting={submitting}
        onSubmit={() => submit({ parts })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", marginBottom: 12 },
  label: { fontSize: 12, fontFamily: fonts.dmBold, color: COLORS.brand, marginTop: 8 },
  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  partBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "#F1EFFA", borderWidth: 1.5, borderColor: "#DDD6FE",
    alignItems: "center", justifyContent: "center",
  },
  partBtnActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  partBtnText: { fontSize: 14, fontFamily: fonts.dmBold, color: COLORS.brand },
  partBtnTextActive: { color: "#fff" },
});
