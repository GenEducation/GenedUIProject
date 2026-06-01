import React from "react";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import { colors } from "@/theme/tokens";

/** The "April" tutor mascot — ported from AprilAvatar in StudentHome.tsx (idle state). */
export function AprilAvatar({ size = 52 }: { size?: number }) {
  const col = colors.genPurple;
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Circle cx="40" cy="40" r="38" fill={col} opacity={0.12} />
      <Circle cx="40" cy="36" r="16" fill="#FFEAA7" />
      <Ellipse cx="33" cy="34" rx="2.5" ry="3" fill="#2d3436" />
      <Ellipse cx="47" cy="34" rx="2.5" ry="3" fill="#2d3436" />
      <Circle cx="33" cy="33" r="1" fill="#fff" />
      <Circle cx="47" cy="33" r="1" fill="#fff" />
      <Path d="M34 40 Q40 44 46 40" stroke="#e17055" fill="none" strokeWidth={2} strokeLinecap="round" />
      <Ellipse cx="28" cy="38" rx="3" ry="2" fill="#fab1a0" opacity={0.4} />
      <Ellipse cx="52" cy="38" rx="3" ry="2" fill="#fab1a0" opacity={0.4} />
      <Path d="M24 24 Q28 18 34 22" stroke={col} fill="none" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M56 24 Q52 18 46 22" stroke={col} fill="none" strokeWidth={2.5} strokeLinecap="round" />
      <Rect x="30" y="52" width="20" height="14" rx="4" fill={col} />
    </Svg>
  );
}
