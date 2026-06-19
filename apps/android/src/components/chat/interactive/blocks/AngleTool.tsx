import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

export default function AngleTool({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const snapStep: number = render.snap_step ?? render.snap ?? 1;
  const baseRayDeg: number = render.base_ray_deg ?? 0;

  const [degrees, setDegrees] = useState(45);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "angle_tool", sessionId);

  const SIZE = 200, cx = SIZE / 2, cy = SIZE / 2 + 30, rayLen = 80, arcR = 40;
  const baseRad = (baseRayDeg * Math.PI) / 180;
  const angleRad = (degrees * Math.PI) / 180;

  const ray1EndX = cx + rayLen * Math.cos(baseRad);
  const ray1EndY = cy - rayLen * Math.sin(baseRad);
  const ray2EndX = cx + rayLen * Math.cos(baseRad + angleRad);
  const ray2EndY = cy - rayLen * Math.sin(baseRad + angleRad);

  const arcStartX = cx + arcR * Math.cos(baseRad);
  const arcStartY = cy - arcR * Math.sin(baseRad);
  const arcEndX = cx + arcR * Math.cos(baseRad + angleRad);
  const arcEndY = cy - arcR * Math.sin(baseRad + angleRad);
  const largeArc = degrees > 180 ? 1 : 0;

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.center}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Path
            d={`M ${cx} ${cy} L ${arcStartX} ${arcStartY} A ${arcR} ${arcR} 0 ${largeArc} 1 ${arcEndX} ${arcEndY} Z`}
            fill={COLORS.brand + "22"} stroke={COLORS.brand} strokeWidth={1.5}
          />
          <Line x1={cx} y1={cy} x2={ray1EndX} y2={ray1EndY} stroke="#1A202C" strokeWidth={3} strokeLinecap="round" />
          <Line x1={cx} y1={cy} x2={ray2EndX} y2={ray2EndY} stroke={COLORS.brand} strokeWidth={3} strokeLinecap="round" />
          <SvgText
            x={cx + (arcR + 18) * Math.cos(baseRad + angleRad / 2)}
            y={cy - (arcR + 18) * Math.sin(baseRad + angleRad / 2)}
            textAnchor="middle" fill={COLORS.brand} fontSize={13} fontWeight="bold"
          >{degrees}°</SvgText>
        </Svg>
        <Slider
          style={[styles.slider, { width: SIZE }]}
          minimumValue={1} maximumValue={180} step={snapStep} value={degrees}
          onValueChange={(v) => !submitted && !readOnly && setDegrees(v)}
          minimumTrackTintColor={COLORS.brand} maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.brand} disabled={submitted || readOnly}
        />
        <Text style={styles.label}>{degrees}°</Text>
      </View>
      <InteractiveFooter
        submitted={submitted} canSubmit={true} submitting={submitting}
        onSubmit={() => submit({ degrees })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  slider: { height: 36 },
  label: { fontSize: 18, fontFamily: fonts.dmBold, color: COLORS.brand },
});
