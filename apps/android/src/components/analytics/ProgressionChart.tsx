/**
 * ProgressionChart — SVG line chart for skill mastery over time.
 * Built entirely on react-native-svg (already installed). No extra deps.
 *
 * Skill selector chips scroll horizontally above the chart.
 * Falls back to overall mastery history when no per-skill data is available.
 */
import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from "react-native";
import Svg, { Polyline, Line, Text as SvgText, Circle, Rect } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";
import type { SkillProgressionEntry, OverallHistoryPoint } from "@/types/api";

const PALETTE = [
  "#2D6A4F",
  "#5B4DC7",
  "#4A90D9",
  "#D97706",
  "#E8635A",
  "#059669",
];

const CHART_H   = 180;
const PAD_LEFT  = 34;
const PAD_RIGHT = 14;
const PAD_TOP   = 12;
const PAD_BOT   = 28;

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return "";
  }
}

function toXY(value: number, index: number, total: number, chartW: number): [number, number] {
  const x = PAD_LEFT + (index / Math.max(total - 1, 1)) * (chartW - PAD_LEFT - PAD_RIGHT);
  const y = PAD_TOP  + ((100 - value) / 100)            * (CHART_H - PAD_TOP - PAD_BOT);
  return [x, y];
}

interface SeriesData {
  label:  string;
  color:  string;
  points: { value: number; date: string }[];
}

interface Props {
  skillProgression: SkillProgressionEntry[];
  overallHistory:   OverallHistoryPoint[];
}

export function ProgressionChart({ skillProgression, overallHistory }: Props) {
  const W = Dimensions.get("window").width - 64;

  // ── Build series ─────────────────────────────────────────────────────────
  const allSeries: SeriesData[] = useMemo(() => {
    const skillsWithHistory = skillProgression
      .filter((s) => s.history && s.history.length >= 1)
      .slice(0, 6);

    if (skillsWithHistory.length > 0) {
      return skillsWithHistory.map((sk, i) => ({
        label:  sk.skill_name,
        color:  PALETTE[i % PALETTE.length],
        points: sk.history.map((pt) => ({
          value: Math.round((pt.mastery_level ?? 0) * 100),
          date:  fmtDate(pt.recorded_at),
        })),
      }));
    }

    if (overallHistory.length >= 2) {
      return [{
        label:  "Overall Mastery",
        color:  PALETTE[0],
        points: overallHistory.map((pt) => ({
          value: Math.round((pt.overall_score ?? 0) * 100),
          date:  fmtDate(pt.recorded_at),
        })),
      }];
    }

    return [];
  }, [skillProgression, overallHistory]);

  const [activeSkills, setActiveSkills] = useState<Set<number>>(
    () => new Set(allSeries.map((_, i) => i))
  );

  // Keep activeSkills in sync when series changes
  React.useEffect(() => {
    setActiveSkills(new Set(allSeries.map((_, i) => i)));
  }, [allSeries.length]);

  if (allSeries.length === 0) return <EmptyProgression />;

  const activeSeries = allSeries.filter((_, i) => activeSkills.has(i));

  // ── X-axis labels from longest active series ──────────────────────────
  const refSeries = activeSeries[0] ?? allSeries[0];
  const total     = refSeries.points.length;
  const maxLabels = 5;
  const labelStep = Math.max(1, Math.ceil(total / maxLabels));
  const xLabels   = refSeries.points
    .map((pt, i) => ({ label: pt.date, i }))
    .filter((_, i) => i % labelStep === 0 || i === total - 1);

  const yLevels = [0, 25, 50, 75, 100];

  const toggleSkill = (i: number) => {
    setActiveSkills((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        // Don't allow deselecting the last skill
        if (next.size === 1) return prev;
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  return (
    <View style={s.wrap}>
      <Text style={s.title}>
        {skillProgression.length > 0 ? "Skill Mastery Over Time" : "Overall Mastery Over Time"}
      </Text>


      {/* Chart */}
      <Svg width={W} height={CHART_H}>
        {/* Y-axis grid + labels */}
        {yLevels.map((lvl) => {
          const [, y] = toXY(lvl, 0, total, W);
          return (
            <React.Fragment key={`grid-${lvl}`}>
              <Line
                x1={PAD_LEFT} y1={y} x2={W - PAD_RIGHT} y2={y}
                stroke={colors.border} strokeWidth={1}
                strokeDasharray={lvl === 0 ? undefined : "3 3"}
              />
              <SvgText x={PAD_LEFT - 4} y={y + 3} fontSize={8} fill={colors.textMuted} textAnchor="end">
                {lvl}%
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* X-axis labels */}
        {xLabels.map(({ label, i }) => {
          const [x] = toXY(0, i, total, W);
          return (
            <SvgText key={`xl-${i}`} x={x} y={CHART_H - 6} fontSize={8} fill={colors.textMuted} textAnchor="middle">
              {label}
            </SvgText>
          );
        })}

        {/* Lines + endpoint dots */}
        {allSeries.map((ser, si) => {
          if (!activeSkills.has(si)) return null;
          const pts = ser.points
            .map((pt, i) => toXY(pt.value, i, total, W).join(","))
            .join(" ");
          const last = ser.points[ser.points.length - 1];
          const [lx, ly] = toXY(last.value, ser.points.length - 1, total, W);
          return (
            <React.Fragment key={`line-${si}`}>
              <Polyline
                points={pts}
                fill="none"
                stroke={ser.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <Circle cx={lx} cy={ly} r={5} fill={ser.color} stroke="#fff" strokeWidth={1.5} />
              <Rect x={lx + 7} y={ly - 9} width={30} height={14} rx={5} fill={ser.color} />
              <SvgText x={lx + 22} y={ly + 2} fontSize={8} fill="#fff" textAnchor="middle" fontWeight="700">
                {last.value}%
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Skill legend list — tap to toggle */}
      {skillProgression.length > 0 && (
        <View style={s.legendList}>
          {allSeries.map((ser, i) => {
            const on      = activeSkills.has(i);
            const lastVal = ser.points[ser.points.length - 1]?.value ?? 0;
            return (
              <Pressable key={i} style={s.legendRow} onPress={() => toggleSkill(i)}>
                <View style={[s.legendLine, { backgroundColor: on ? ser.color : colors.border }]} />
                <Text style={[s.legendLabel, { color: on ? colors.text : colors.textMuted }]} numberOfLines={1}>
                  {ser.label}
                </Text>
                <Text style={[s.legendPct, { color: on ? ser.color : colors.textMuted }]}>
                  {lastVal}%
                </Text>
                <View style={[s.legendToggle, { backgroundColor: on ? ser.color : colors.border }]}>
                  <View style={s.legendToggleDot} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function EmptyProgression() {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>📈</Text>
      <Text style={s.emptyTitle}>No progression data yet</Text>
      <Text style={s.emptyDesc}>Complete more sessions to see skill trends over time.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { gap: 14 },
  title: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMid, textTransform: "uppercase", letterSpacing: 0.8 },

  legendList:      { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 2 },
  legendRow:       { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 2 },
  legendLine:      { width: 18, height: 3, borderRadius: 2 },
  legendLabel:     { flex: 1, fontFamily: fonts.dm, fontSize: 12, color: colors.text },
  legendPct:       { fontFamily: fonts.dmBold, fontSize: 12 },
  legendToggle:    { width: 28, height: 16, borderRadius: 8, justifyContent: "center", alignItems: "flex-end", paddingHorizontal: 2 },
  legendToggleDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#fff" },

  empty:      { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyIcon:  { fontSize: 32 },
  emptyTitle: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  emptyDesc:  { fontFamily: fonts.dm, fontSize: 12, color: colors.textMuted, textAlign: "center" },
});
