import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Line, Circle, Path, Text as SvgText } from "react-native-svg";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function BalanceScale({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const leftPan: Array<{ type: "x" | "unit"; count?: number }> = render.left_pan ?? [{ type: "x" }];
  const rightPan: Array<{ type: "x" | "unit"; count?: number }> = render.right_pan ?? [{ type: "unit", count: 5 }];

  const [xVal, setXVal] = useState(0);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "balance_scale", sessionId);

  const leftWeight = leftPan.reduce((s, t) => s + (t.type === "x" ? xVal * (t.count ?? 1) : (t.count ?? 1)), 0);
  const rightWeight = rightPan.reduce((s, t) => s + (t.type === "x" ? xVal * (t.count ?? 1) : (t.count ?? 1)), 0);
  const diff = leftWeight - rightWeight;
  const tiltAngle = Math.max(-20, Math.min(20, diff * 3));
  const balanced = leftWeight === rightWeight && xVal > 0;

  const W = 260, H = 120, cx = W / 2, fulcrumY = H - 20, beamLen = 90;
  const tiltRad = (tiltAngle * Math.PI) / 180;
  const lx = cx - beamLen * Math.cos(tiltRad), ly = fulcrumY - beamLen * Math.sin(tiltRad) - 30;
  const rx = cx + beamLen * Math.cos(tiltRad), ry = fulcrumY + beamLen * Math.sin(tiltRad) - 30;

  const panLabel = (pan: typeof leftPan) =>
    pan.map((t) => t.type === "x" ? `${t.count && t.count > 1 ? t.count : ""}x` : String(t.count ?? 1)).join("+");

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.center}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Line x1={lx} y1={ly} x2={rx} y2={ry} stroke="#1A202C" strokeWidth={3} strokeLinecap="round" />
          <Path d={`M ${cx} ${fulcrumY - 30} L ${cx - 12} ${fulcrumY} L ${cx + 12} ${fulcrumY} Z`} fill="#94A3B8" />
          <Line x1={lx} y1={ly} x2={lx} y2={ly + 25} stroke="#94A3B8" strokeWidth={2} />
          <Line x1={rx} y1={ry} x2={rx} y2={ry + 25} stroke="#94A3B8" strokeWidth={2} />
          <Circle cx={lx} cy={ly + 28} r={18} fill={COLORS.brandSoft} stroke={COLORS.brand} strokeWidth={1.5} />
          <Circle cx={rx} cy={ry + 28} r={18} fill={COLORS.brandSoft} stroke={COLORS.brand} strokeWidth={1.5} />
          <SvgText x={lx} y={ly + 33} textAnchor="middle" fill={COLORS.brand} fontSize={10} fontWeight="bold">{panLabel(leftPan)}</SvgText>
          <SvgText x={rx} y={ry + 33} textAnchor="middle" fill={COLORS.brand} fontSize={10} fontWeight="bold">{panLabel(rightPan)}</SvgText>
        </Svg>
        {balanced && <Text style={styles.balanced}>⚖️ Balanced!</Text>}
      </View>
      <Text style={styles.equation}>
        {panLabel(leftPan)} = {panLabel(rightPan)} {xVal > 0 ? `  →  x = ${xVal}` : ""}
      </Text>
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.ctrlBtn} onPress={() => !submitted && !readOnly && setXVal((v) => Math.max(0, v - 1))}
          activeOpacity={0.7}>
          <Text style={styles.ctrlText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.xVal}>x = {xVal}</Text>
        <TouchableOpacity
          style={styles.ctrlBtn} onPress={() => !submitted && !readOnly && setXVal((v) => v + 1)}
          activeOpacity={0.7}>
          <Text style={styles.ctrlText}>+</Text>
        </TouchableOpacity>
      </View>
      <InteractiveFooter
        submitted={submitted} canSubmit={xVal > 0} submitting={submitting}
        onSubmit={() => submit({ solve_x: xVal })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  balanced: { fontSize: 14, fontFamily: fonts.dmBold, color: COLORS.success, marginTop: 4 },
  equation: { fontSize: 13, fontFamily: fonts.dmBold, color: COLORS.ink, textAlign: "center", marginBottom: 12 },
  controls: { flexDirection: "row", alignItems: "center", gap: 20, justifyContent: "center" },
  ctrlBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.brandSoft, borderWidth: 1.5, borderColor: COLORS.brand,
    alignItems: "center", justifyContent: "center",
  },
  ctrlText: { fontSize: 20, fontFamily: fonts.dmBold, color: COLORS.brand },
  xVal: { fontSize: 18, fontFamily: fonts.dmBold, color: COLORS.ink, minWidth: 60, textAlign: "center" },
});
