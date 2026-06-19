import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function DataBuilder({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const categories: string[] = render.categories ?? ["A", "B", "C"];
  const maxValue: number = render.max_value ?? 10;

  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(categories.map((c) => [c, 0]))
  );
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "data_builder", sessionId);

  const maxVal = Math.max(...Object.values(values), 1);
  const BAR_MAX_H = 80;

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.chartRow}>
        {categories.map((cat) => {
          const v = values[cat] ?? 0;
          const h = Math.max((v / maxValue) * BAR_MAX_H, 2);
          return (
            <View key={cat} style={styles.barCol}>
              <Text style={styles.valueLabel}>{v}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: h, backgroundColor: COLORS.brand }]} />
              </View>
              <Text style={styles.catLabel} numberOfLines={1}>{cat}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.sliders}>
        {categories.map((cat) => (
          <View key={cat} style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>{cat}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0} maximumValue={maxValue} step={1} value={values[cat] ?? 0}
              onValueChange={(v) => {
                if (submitted || readOnly) return;
                setValues((prev) => ({ ...prev, [cat]: v }));
              }}
              minimumTrackTintColor={COLORS.brand} maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.brand} disabled={submitted || readOnly}
            />
          </View>
        ))}
      </View>
      <InteractiveFooter
        submitted={submitted} canSubmit={Object.values(values).some((v) => v > 0)} submitting={submitting}
        onSubmit={() => submit({ values })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  chartRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 110, marginBottom: 12 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barTrack: { width: "100%", height: 80, justifyContent: "flex-end", backgroundColor: "#EDE9FE", borderRadius: 6 },
  bar: { width: "100%", borderRadius: 6 },
  valueLabel: { fontSize: 10, fontFamily: fonts.dmBold, color: COLORS.brand },
  catLabel: { fontSize: 9, fontFamily: fonts.dmBold, color: COLORS.muted },
  sliders: { gap: 4 },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sliderLabel: { fontSize: 11, fontFamily: fonts.dmBold, color: COLORS.ink, width: 30 },
  slider: { flex: 1, height: 36 },
});
