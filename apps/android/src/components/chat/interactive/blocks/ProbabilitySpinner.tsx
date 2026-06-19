import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

const PALETTE = ["#5B4DC7", "#00B894", "#E17055", "#FDCB6E", "#74B9FF", "#A29BFE", "#FD79A8", "#00CEC9"];

export default function ProbabilitySpinner({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const sectors: Array<{ id: string; label: string; weight: number; color?: string }> = render.sectors ?? [];
  const maxSel: number = meta?.interaction?.max_selections ?? 1;

  const totalWeight = sectors.reduce((s, sec) => s + (sec.weight ?? 1), 0);
  const [selected, setSelected] = useState<string[]>([]);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "probability_spinner", sessionId);

  const toggle = (id: string) => {
    if (submitted || readOnly) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < maxSel ? [...prev, id] : prev
    );
  };

  const SIZE = 180, cx = SIZE / 2, cy = SIZE / 2, r = 80;
  let cumAngle = -Math.PI / 2;
  const paths = sectors.map((sec, i) => {
    const angle = (sec.weight / totalWeight) * 2 * Math.PI;
    const a1 = cumAngle, a2 = cumAngle + angle;
    cumAngle = a2;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const large = angle > Math.PI ? 1 : 0;
    return { id: sec.id, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color: sec.color ?? PALETTE[i % PALETTE.length] };
  });

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.center}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {paths.map((p) => (
            <Path key={p.id} d={p.d} fill={selected.includes(p.id) ? p.color : p.color + "88"} stroke="#fff" strokeWidth={2} />
          ))}
          <Circle cx={cx} cy={cy} r={6} fill="#fff" />
        </Svg>
      </View>
      <View style={styles.sectorBtns}>
        {sectors.map((sec, i) => {
          const isSel = selected.includes(sec.id);
          const color = sec.color ?? PALETTE[i % PALETTE.length];
          return (
            <TouchableOpacity
              key={sec.id}
              style={[styles.sectorBtn, { borderColor: color }, isSel && { backgroundColor: color }]}
              onPress={() => toggle(sec.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.colorDot, { backgroundColor: color }]} />
              <Text style={[styles.sectorText, isSel && { color: "#fff" }]}>{sec.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <InteractiveFooter
        submitted={submitted} canSubmit={selected.length > 0} submitting={submitting}
        onSubmit={() => submit({ selected })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", marginBottom: 12 },
  sectorBtns: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectorBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 1.5, backgroundColor: "#fff",
  },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  sectorText: { fontSize: 12, fontFamily: fonts.dmBold, color: COLORS.ink },
});
