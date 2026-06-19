import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import Svg, { Line, Circle, Text as SvgText } from "react-native-svg";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function NumberLine({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const min: number = render.min ?? 0;
  const max: number = render.max ?? 10;
  const step: number = render.tick_step ?? render.step ?? 1;
  const ticks: string[] = render.ticks ?? [];

  const [value, setValue] = useState<number>(min);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "number_line", sessionId);

  const W = 280, H = 60, marginX = 20;
  const lineY = H / 2;
  const toX = (v: number) => marginX + ((v - min) / (max - min)) * (W - marginX * 2);
  const thumbX = toX(value);

  const tickValues: number[] = [];
  for (let v = min; v <= max; v += step) tickValues.push(v);

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.center}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Line x1={marginX} y1={lineY} x2={W - marginX} y2={lineY} stroke={COLORS.border} strokeWidth={2} />
          {tickValues.map((v, i) => {
            const x = toX(v);
            const label = ticks[i] ?? String(v);
            return (
              <React.Fragment key={v}>
                <Line x1={x} y1={lineY - 5} x2={x} y2={lineY + 5} stroke="#94A3B8" strokeWidth={1.5} />
                <SvgText x={x} y={lineY + 18} textAnchor="middle" fill="#64748B" fontSize={9} fontWeight="bold">{label}</SvgText>
              </React.Fragment>
            );
          })}
          <Circle cx={thumbX} cy={lineY} r={10} fill={COLORS.brand} />
          <SvgText x={thumbX} y={lineY - 15} textAnchor="middle" fill={COLORS.brand} fontSize={11} fontWeight="bold">{value}</SvgText>
        </Svg>
        <Slider
          style={[styles.slider, { width: W }]}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={value}
          onValueChange={(v) => !submitted && !readOnly && setValue(v)}
          minimumTrackTintColor={COLORS.brand}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.brand}
          disabled={submitted || readOnly}
        />
      </View>
      <InteractiveFooter
        submitted={submitted} canSubmit={true} submitting={submitting}
        onSubmit={() => submit({ value })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  slider: { height: 36 },
});
