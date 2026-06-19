import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Line, Circle, Text as SvgText, Rect } from "react-native-svg";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";

export default function CoordinatePlane({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const xRange: [number, number] = render.x_range ?? [-5, 5];
  const yRange: [number, number] = render.y_range ?? [-5, 5];
  const gridStep: number = render.grid_step ?? 1;
  const maxPoints: number = meta?.interaction?.max_points ?? 1;

  const [points, setPoints] = useState<[number, number][]>([]);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "coordinate_plane", sessionId);

  const SIZE = 260, margin = 24;
  const plotW = SIZE - margin * 2, plotH = SIZE - margin * 2;
  const toSvgX = (x: number) => margin + ((x - xRange[0]) / (xRange[1] - xRange[0])) * plotW;
  const toSvgY = (y: number) => margin + ((yRange[1] - y) / (yRange[1] - yRange[0])) * plotH;
  const toGridX = (sx: number) => Math.round(((sx - margin) / plotW) * (xRange[1] - xRange[0]) + xRange[0]);
  const toGridY = (sy: number) => Math.round((yRange[1] - ((sy - margin) / plotH) * (yRange[1] - yRange[0])));

  const handlePress = (evt: any) => {
    if (submitted || readOnly) return;
    const { locationX, locationY } = evt.nativeEvent;
    const gx = toGridX(locationX), gy = toGridY(locationY);
    if (gx < xRange[0] || gx > xRange[1] || gy < yRange[0] || gy > yRange[1]) return;
    setPoints((prev) => {
      const exists = prev.findIndex(([px, py]) => px === gx && py === gy);
      if (exists >= 0) return prev.filter((_, i) => i !== exists);
      if (prev.length >= maxPoints) return [{ ...prev.slice(1) }[0] ? prev.slice(1) : [], [gx, gy]].flat() as [number, number][];
      return [...prev, [gx, gy]];
    });
  };

  const xVals: number[] = [], yVals: number[] = [];
  for (let v = xRange[0]; v <= xRange[1]; v += gridStep) xVals.push(v);
  for (let v = yRange[0]; v <= yRange[1]; v += gridStep) yVals.push(v);

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.center}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} onPress={handlePress}>
          <Rect x={0} y={0} width={SIZE} height={SIZE} fill="transparent" />
          {xVals.map((x) => <Line key={`v${x}`} x1={toSvgX(x)} y1={margin} x2={toSvgX(x)} y2={SIZE - margin} stroke="#E2E8F0" strokeWidth={0.8} />)}
          {yVals.map((y) => <Line key={`h${y}`} x1={margin} y1={toSvgY(y)} x2={SIZE - margin} y2={toSvgY(y)} stroke="#E2E8F0" strokeWidth={0.8} />)}
          <Line x1={margin} y1={toSvgY(0)} x2={SIZE - margin} y2={toSvgY(0)} stroke="#94A3B8" strokeWidth={1.5} />
          <Line x1={toSvgX(0)} y1={margin} x2={toSvgX(0)} y2={SIZE - margin} stroke="#94A3B8" strokeWidth={1.5} />
          {xVals.filter((x) => x !== 0 && x % (gridStep * 2) === 0).map((x) => (
            <SvgText key={`xl${x}`} x={toSvgX(x)} y={toSvgY(0) + 14} textAnchor="middle" fill="#94A3B8" fontSize={8}>{x}</SvgText>
          ))}
          {yVals.filter((y) => y !== 0 && y % (gridStep * 2) === 0).map((y) => (
            <SvgText key={`yl${y}`} x={toSvgX(0) - 10} y={toSvgY(y) + 3} textAnchor="end" fill="#94A3B8" fontSize={8}>{y}</SvgText>
          ))}
          {points.map(([px, py], i) => (
            <React.Fragment key={i}>
              <Circle cx={toSvgX(px)} cy={toSvgY(py)} r={7} fill={COLORS.brand} />
              <SvgText x={toSvgX(px) + 10} y={toSvgY(py) - 8} fill={COLORS.brand} fontSize={10} fontWeight="bold">({px},{py})</SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
      <InteractiveFooter
        submitted={submitted} canSubmit={points.length > 0} submitting={submitting}
        onSubmit={() => submit({ points })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
});
