import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function ExpressionBuilder({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const palette: string[] = render.tile_palette ?? ["x", "unit"];

  const [xs, setXs] = useState(0);
  const [units, setUnits] = useState(0);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "expression_builder", sessionId);

  const add = (type: string) => {
    if (submitted || readOnly) return;
    if (type === "x") setXs((v) => v + 1);
    else setUnits((v) => v + 1);
  };
  const clear = () => { if (!submitted && !readOnly) { setXs(0); setUnits(0); } };

  const buildExpr = () => {
    const parts = [];
    if (xs > 0) parts.push(xs === 1 ? "x" : `${xs}x`);
    if (units > 0) parts.push(`${units}`);
    return parts.join("+") || "0";
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.tileDisplay}>
        {Array.from({ length: xs }, (_, i) => (
          <View key={`x${i}`} style={[styles.tile, styles.tileX]}>
            <Text style={[styles.tileText, { color: COLORS.brand }]}>x</Text>
          </View>
        ))}
        {Array.from({ length: units }, (_, i) => (
          <View key={`u${i}`} style={[styles.tile, styles.tileUnit]}>
            <Text style={[styles.tileText, { color: COLORS.success }]}>1</Text>
          </View>
        ))}
        {xs === 0 && units === 0 && (
          <Text style={styles.placeholder}>Build your expression…</Text>
        )}
      </View>
      <Text style={styles.exprLabel}>{buildExpr()}</Text>
      <View style={styles.btnRow}>
        {palette.includes("x") && (
          <TouchableOpacity style={[styles.addBtn, { borderColor: COLORS.brand }]} onPress={() => add("x")} activeOpacity={0.7}>
            <Text style={[styles.addText, { color: COLORS.brand }]}>+x</Text>
          </TouchableOpacity>
        )}
        {palette.includes("unit") && (
          <TouchableOpacity style={[styles.addBtn, { borderColor: COLORS.success }]} onPress={() => add("unit")} activeOpacity={0.7}>
            <Text style={[styles.addText, { color: COLORS.success }]}>+1</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.addBtn, { borderColor: COLORS.danger }]} onPress={clear} activeOpacity={0.7}>
          <Text style={[styles.addText, { color: COLORS.danger }]}>Clear</Text>
        </TouchableOpacity>
      </View>
      <InteractiveFooter
        submitted={submitted} canSubmit={xs > 0 || units > 0} submitting={submitting}
        onSubmit={() => submit({ expression: buildExpr() })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  tileDisplay: { flexDirection: "row", flexWrap: "wrap", gap: 6, minHeight: 44, marginBottom: 8, alignItems: "center" },
  tile: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  tileX: { backgroundColor: COLORS.brandSoft, borderColor: COLORS.brand },
  tileUnit: { backgroundColor: "#D1FAE5", borderColor: COLORS.success },
  tileText: { fontSize: 14, fontFamily: fonts.dmBold },
  placeholder: { fontSize: 12, color: COLORS.muted, fontFamily: fonts.dm },
  exprLabel: { fontSize: 18, fontFamily: fonts.dmBold, color: COLORS.ink, marginBottom: 12 },
  btnRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  addBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#F8FAFC", borderWidth: 1.5 },
  addText: { fontSize: 13, fontFamily: fonts.dmBold },
});
