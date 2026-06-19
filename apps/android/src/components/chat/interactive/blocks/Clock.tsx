import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function Clock({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const [hour, setHour] = useState<number>(render.initial_hour ?? 12);
  const [minute, setMinute] = useState<number>(render.initial_minute ?? 0);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "clock", sessionId);

  const SIZE = 180, cx = SIZE / 2, cy = SIZE / 2, r = 80;
  const hourAngle = ((hour % 12) * 30 + minute * 0.5 - 90) * (Math.PI / 180);
  const minAngle = (minute * 6 - 90) * (Math.PI / 180);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.center}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle cx={cx} cy={cy} r={r} fill="#F7F6FD" stroke={COLORS.brand} strokeWidth={2.5} />
          {[12, 3, 6, 9].map((n) => {
            const a = ((n * 30) - 90) * (Math.PI / 180);
            return (
              <SvgText key={n} x={cx + (r - 14) * Math.cos(a)} y={cy + (r - 14) * Math.sin(a) + 4}
                textAnchor="middle" fill={COLORS.ink} fontSize={11} fontWeight="bold">{n}</SvgText>
            );
          })}
          <Line x1={cx} y1={cy} x2={cx + (r * 0.5) * Math.cos(hourAngle)} y2={cy + (r * 0.5) * Math.sin(hourAngle)}
            stroke={COLORS.ink} strokeWidth={4} strokeLinecap="round" />
          <Line x1={cx} y1={cy} x2={cx + (r * 0.75) * Math.cos(minAngle)} y2={cy + (r * 0.75) * Math.sin(minAngle)}
            stroke={COLORS.brand} strokeWidth={2.5} strokeLinecap="round" />
          <Circle cx={cx} cy={cy} r={5} fill={COLORS.ink} />
        </Svg>
        <Text style={styles.timeText}>{pad(hour)}:{pad(minute)}</Text>
      </View>
      <View style={styles.sliders}>
        <Text style={styles.sliderLabel}>Hour: {hour}</Text>
        <Slider
          style={styles.slider}
          minimumValue={1} maximumValue={12} step={1} value={hour}
          onValueChange={(v) => !submitted && !readOnly && setHour(v)}
          minimumTrackTintColor={COLORS.brand} maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.brand} disabled={submitted || readOnly}
        />
        <Text style={styles.sliderLabel}>Minute: {minute}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0} maximumValue={55} step={5} value={minute}
          onValueChange={(v) => !submitted && !readOnly && setMinute(v)}
          minimumTrackTintColor={COLORS.brand} maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.brand} disabled={submitted || readOnly}
        />
      </View>
      <InteractiveFooter
        submitted={submitted} canSubmit={true} submitting={submitting}
        onSubmit={() => submit({ hour, minute })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  timeText: { fontSize: 20, fontFamily: fonts.dmBold, color: COLORS.brand, marginTop: 4 },
  sliders: { marginTop: 8 },
  sliderLabel: { fontSize: 12, fontFamily: fonts.dmBold, color: COLORS.brand },
  slider: { height: 36 },
});
