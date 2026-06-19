import React, { useState, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function BarModel({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const whole: number = render.whole ?? 100;
  const unitTicks: number = render.unit_ticks ?? whole;
  const fillColor: string = COLORS.brand;

  const [units, setUnits] = useState(0);
  const fillAnim = useRef(new Animated.Value(0)).current;
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "bar_model", sessionId);

  const handleChange = (v: number) => {
    if (submitted || readOnly) return;
    setUnits(v);
    Animated.timing(fillAnim, { toValue: v / unitTicks, duration: 120, useNativeDriver: false }).start();
  };

  const value = (units / unitTicks) * whole;
  const pct = Math.round((units / unitTicks) * 100);

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          <Animated.View
            style={[styles.barFill, { backgroundColor: fillColor, width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]}
          />
        </View>
        <Text style={styles.pctLabel}>{pct}%</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={0} maximumValue={unitTicks} step={1} value={units}
        onValueChange={handleChange}
        minimumTrackTintColor={fillColor} maximumTrackTintColor={COLORS.border}
        thumbTintColor={fillColor} disabled={submitted || readOnly}
      />
      <Text style={styles.valueLabel}>{units} units = {value}</Text>
      <InteractiveFooter
        submitted={submitted} canSubmit={units > 0} submitting={submitting}
        onSubmit={() => submit({ value })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  barContainer: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  barTrack: { flex: 1, height: 28, borderRadius: 8, backgroundColor: "#EDE9FE", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 8 },
  pctLabel: { fontSize: 13, fontFamily: fonts.dmBold, color: COLORS.brand, width: 40, textAlign: "right" },
  slider: { height: 36 },
  valueLabel: { fontSize: 12, fontFamily: fonts.dmBold, color: COLORS.muted, marginTop: 4 },
});
