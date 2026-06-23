/**
 * SpiderChart — SVG radar/spider chart for competency group mastery scores.
 * Built on react-native-svg (already installed). No extra dependencies.
 *
 * Each axis represents one CG. The filled polygon shows avg_mastery (0–1).
 * Concentric grid rings at 25 / 50 / 75 / 100%.
 */
import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Polygon, Polyline, Circle, Line, Text as SvgText } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";

export interface SpiderDataPoint {
  label: string;
  value: number; // 0–100
}

interface Props {
  data: SpiderDataPoint[];
  size?: number;
}

const GRID_LEVELS = [25, 50, 75, 100];
const ACCENT = "#2D6A4F";
const GRID_COLOR = "#E2E8F0";
const LABEL_OFFSET = 18;

function polar(cx: number, cy: number, r: number, angleRad: number): [number, number] {
  return [cx + r * Math.sin(angleRad), cy - r * Math.cos(angleRad)];
}

export function SpiderChart({ data, size }: Props) {
  const screenW = Dimensions.get("window").width - 32;
  const chartSize = size ?? Math.min(screenW, 300);
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const maxR = (chartSize / 2) - LABEL_OFFSET - 12;
  const n = data.length;

  if (n < 3) return null;

  const angleStep = (2 * Math.PI) / n;

  // Points for each grid ring
  const gridRings = GRID_LEVELS.map((lvl) => {
    const r = (lvl / 100) * maxR;
    return data
      .map((_, i) => polar(cx, cy, r, i * angleStep).join(","))
      .join(" ");
  });

  // Data polygon
  const dataPoints = data
    .map((d, i) => polar(cx, cy, (Math.min(d.value, 100) / 100) * maxR, i * angleStep).join(","))
    .join(" ");

  // Axis lines & labels
  const axes = data.map((d, i) => {
    const angle = i * angleStep;
    const [x2, y2] = polar(cx, cy, maxR, angle);
    const [lx, ly] = polar(cx, cy, maxR + LABEL_OFFSET, angle);

    // Anchor text based on position
    const sin = Math.sin(angle);
    const anchor: "start" | "end" | "middle" = sin > 0.2 ? "start" : sin < -0.2 ? "end" : "middle";
    const baselineShift = Math.cos(angle) > 0.2 ? -4 : Math.cos(angle) < -0.2 ? 10 : 4;

    // Truncate long labels
    const label = d.label.length > 14 ? d.label.slice(0, 13) + "…" : d.label;

    return { x2, y2, lx, ly, anchor, baselineShift, label, value: d.value };
  });

  return (
    <View style={styles.wrap}>
      <Svg width={chartSize} height={chartSize}>
        {/* Grid rings */}
        {gridRings.map((pts, i) => (
          <Polygon
            key={`grid-${i}`}
            points={pts}
            fill="none"
            stroke={GRID_COLOR}
            strokeWidth={1}
          />
        ))}

        {/* Axis spokes */}
        {axes.map((ax, i) => (
          <Line
            key={`axis-${i}`}
            x1={cx} y1={cy}
            x2={ax.x2} y2={ax.y2}
            stroke={GRID_COLOR}
            strokeWidth={1}
          />
        ))}

        {/* Center dot */}
        <Circle cx={cx} cy={cy} r={2} fill={GRID_COLOR} />

        {/* Data polygon — filled */}
        <Polygon
          points={dataPoints}
          fill={ACCENT + "30"}
          stroke={ACCENT}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Data vertex dots */}
        {data.map((d, i) => {
          const [x, y] = polar(cx, cy, (Math.min(d.value, 100) / 100) * maxR, i * angleStep);
          return (
            <Circle key={`dot-${i}`} cx={x} cy={y} r={4} fill={ACCENT} stroke="#fff" strokeWidth={1.5} />
          );
        })}

        {/* % labels at 50% ring */}
        {GRID_LEVELS.filter((_, i) => i % 2 === 1).map((lvl) => {
          const [lx, ly] = polar(cx, cy, (lvl / 100) * maxR + 2, 0.12);
          return (
            <SvgText key={`pct-${lvl}`} x={lx} y={ly} fontSize={8} fill={colors.textMuted} textAnchor="start">
              {lvl}%
            </SvgText>
          );
        })}

        {/* Axis labels */}
        {axes.map((ax, i) => (
          <SvgText
            key={`label-${i}`}
            x={ax.lx}
            y={ax.ly + ax.baselineShift}
            fontSize={9}
            fontWeight="700"
            fill={colors.textMid}
            textAnchor={ax.anchor}
          >
            {ax.label}
          </SvgText>
        ))}
      </Svg>

      {/* Legend row */}
      <View style={styles.legend}>
        {data.map((d, i) => {
          const pct = Math.round(d.value);
          const color = pct >= 80 ? "#059669" : pct >= 50 ? "#D97706" : "#E8635A";
          return (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label}
              </Text>
              <Text style={[styles.legendPct, { color }]}>{pct}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:        { alignItems: "center", gap: 12 },
  legend:      { width: "100%", gap: 6 },
  legendItem:  { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontFamily: fonts.dm, fontSize: 11, color: colors.textMid },
  legendPct:   { fontFamily: fonts.dmBold, fontSize: 11 },
});
