import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function BaseTenBlocks({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const available: string[] = render.available ?? ["hundred", "ten", "one"];
  const fillColor: string = render.fill_color ?? COLORS.brand;

  const [hundreds, setHundreds] = useState(0);
  const [tens, setTens] = useState(0);
  const [ones, setOnes] = useState(0);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "base_ten_blocks", sessionId);

  const total = hundreds * 100 + tens * 10 + ones;

  const addBlock = (type: string) => {
    if (submitted || readOnly) return;
    if (type === "hundred") setHundreds((v) => v + 1);
    else if (type === "ten") setTens((v) => v + 1);
    else setOnes((v) => v + 1);
  };

  const clear = () => {
    if (submitted || readOnly) return;
    setHundreds(0); setTens(0); setOnes(0);
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.btnRow}>
        {available.includes("hundred") && (
          <TouchableOpacity style={styles.addBtn} onPress={() => addBlock("hundred")} activeOpacity={0.7}>
            <Text style={styles.addText}>+100</Text>
          </TouchableOpacity>
        )}
        {available.includes("ten") && (
          <TouchableOpacity style={styles.addBtn} onPress={() => addBlock("ten")} activeOpacity={0.7}>
            <Text style={styles.addText}>+10</Text>
          </TouchableOpacity>
        )}
        {available.includes("one") && (
          <TouchableOpacity style={styles.addBtn} onPress={() => addBlock("one")} activeOpacity={0.7}>
            <Text style={styles.addText}>+1</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.clearBtn} onPress={clear} activeOpacity={0.7}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.blockArea}>
        <View style={styles.blockRow}>
          {Array.from({ length: hundreds }, (_, i) => (
            <View key={`h${i}`} style={[styles.hundred, { backgroundColor: fillColor + "22", borderColor: fillColor }]}>
              {Array.from({ length: 100 }, (_, j) => (
                <View key={j} style={[styles.unit, { backgroundColor: fillColor }]} />
              ))}
            </View>
          ))}
          {Array.from({ length: tens }, (_, i) => (
            <View key={`t${i}`} style={[styles.ten, { backgroundColor: fillColor + "33", borderColor: fillColor }]}>
              {Array.from({ length: 10 }, (_, j) => (
                <View key={j} style={[styles.tenUnit, { backgroundColor: fillColor }]} />
              ))}
            </View>
          ))}
          {Array.from({ length: ones }, (_, i) => (
            <View key={`o${i}`} style={[styles.one, { backgroundColor: fillColor }]} />
          ))}
        </View>
      </ScrollView>

      <Text style={styles.total}>Total: {total}</Text>
      <InteractiveFooter
        submitted={submitted} canSubmit={total > 0} submitting={submitting}
        onSubmit={() => submit({ hundreds, tens, ones })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  btnRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  addBtn: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: COLORS.brandSoft, borderWidth: 1.5, borderColor: COLORS.brand,
  },
  addText: { fontSize: 13, fontFamily: fonts.dmBold, color: COLORS.brand },
  clearBtn: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: "#FCA5A5",
  },
  clearText: { fontSize: 13, fontFamily: fonts.dmBold, color: COLORS.danger },
  blockArea: { maxHeight: 120 },
  blockRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, alignItems: "flex-end" },
  hundred: { width: 50, height: 50, borderWidth: 1, borderRadius: 4, flexDirection: "row", flexWrap: "wrap", padding: 1, gap: 0.5 },
  unit: { width: 4, height: 4, borderRadius: 0.5 },
  ten: { width: 10, height: 50, borderWidth: 1, borderRadius: 3, flexDirection: "column", padding: 1, gap: 0.5 },
  tenUnit: { width: 8, height: 3.5, borderRadius: 0.5 },
  one: { width: 10, height: 10, borderRadius: 2 },
  total: { fontSize: 13, fontFamily: fonts.dmBold, color: COLORS.brand, marginTop: 8 },
});
