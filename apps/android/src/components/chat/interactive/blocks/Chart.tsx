import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function Chart({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const data: Array<{ id: string; label: string; value: number }> = render.data ?? [];
  const fillColor: string = render.fill_color ?? COLORS.brand;
  const maxSel: number = meta?.interaction?.max_selections ?? data.length;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const BAR_MAX_H = 100;

  const [selected, setSelected] = useState<string[]>([]);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "chart", sessionId);

  const toggle = (id: string) => {
    if (submitted || readOnly) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < maxSel ? [...prev, id] : prev
    );
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.chartArea}>
        {data.map((d) => {
          const h = Math.max((d.value / maxVal) * BAR_MAX_H, 6);
          const isSel = selected.includes(d.id);
          return (
            <TouchableOpacity key={d.id} style={styles.barCol} onPress={() => toggle(d.id)} activeOpacity={0.7}>
              <Text style={styles.valueLabel}>{d.value}</Text>
              <View style={[styles.bar, { height: h, backgroundColor: isSel ? fillColor : COLORS.brandSoft, borderColor: isSel ? fillColor : "#DDD6FE" }]} />
              <Text style={styles.catLabel} numberOfLines={2}>{d.label}</Text>
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
  chartArea: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingBottom: 4 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  bar: { width: "100%", borderRadius: 6, borderWidth: 1.5, minHeight: 6 },
  valueLabel: { fontSize: 10, fontFamily: fonts.dmBold, color: COLORS.brand },
  catLabel: { fontSize: 9, fontFamily: fonts.dmBold, color: COLORS.muted, textAlign: "center" },
});
