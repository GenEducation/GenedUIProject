import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { fonts } from "@/theme/tokens";

/** Circular progress ring — mirrors the ProgressRing in StudentHome.tsx */
export function ProgressRing({
  percent,
  size = 60,
  stroke = 5,
  color,
  fontSize = 13,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color: string;
  fontSize?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, percent)) / 100);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color + "22"} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={[styles.label, { color, fontSize }]}>{percent}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: "absolute", fontFamily: fonts.nunito },
});
