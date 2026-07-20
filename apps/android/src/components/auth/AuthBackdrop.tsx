import React, { useEffect, useRef } from "react";
import {
  Animated, Easing, StyleSheet, View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import { useReduceMotion } from "./motion";

/**
 * Full-bleed atmosphere for the auth screens — navy→indigo gradient, two soft
 * glow orbs and a handful of slowly drifting sparkles.
 *
 * The indigo stops (#3E5AC9 / #4C51E0) are RoleCarousel's own slide colours, so
 * sign-in and sign-up read as one language.
 */

/** x/y are fractions of the viewport; delay/duration stagger the drift loop. */
const SPARKLES = [
  { x: 0.14, y: 0.10, size: 14, opacity: 0.55, drift: -9, duration: 4200, delay: 0 },
  { x: 0.84, y: 0.16, size: 10, opacity: 0.42, drift: 7, duration: 5100, delay: 600 },
  { x: 0.72, y: 0.05, size: 7, opacity: 0.35, drift: -6, duration: 4700, delay: 1200 },
  { x: 0.08, y: 0.42, size: 8, opacity: 0.28, drift: 8, duration: 5600, delay: 300 },
  { x: 0.91, y: 0.52, size: 12, opacity: 0.32, drift: -7, duration: 4900, delay: 900 },
  { x: 0.26, y: 0.68, size: 9, opacity: 0.22, drift: 6, duration: 5400, delay: 1500 },
] as const;

export function AuthBackdrop() {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={["#042E5C", "#3E5AC9", "#4C51E0"]}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Glow orbs — depth without a flat fill. */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="orbWarm" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#8FA6FF" stopOpacity={0.42} />
            <Stop offset="1" stopColor="#8FA6FF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="orbCool" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#4FD1B0" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#4FD1B0" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={width * 0.86} cy={height * 0.12} r={width * 0.52} fill="url(#orbWarm)" />
        <Circle cx={width * 0.06} cy={height * 0.58} r={width * 0.46} fill="url(#orbCool)" />
      </Svg>

      {SPARKLES.map((s, i) => (
        <Sparkle
          key={i}
          left={width * s.x}
          top={height * s.y}
          size={s.size}
          opacity={s.opacity}
          drift={s.drift}
          duration={s.duration}
          delay={s.delay}
          animate={!reduceMotion}
        />
      ))}
    </View>
  );
}

function Sparkle({
  left, top, size, opacity, drift, duration, delay, animate,
}: {
  left: number;
  top: number;
  size: number;
  opacity: number;
  drift: number;
  duration: number;
  delay: number;
  animate: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, t, duration, delay]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, drift] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left,
        top,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {/* four-point star */}
        <Path
          d="M12 0 C12.6 7.2 16.8 11.4 24 12 C16.8 12.6 12.6 16.8 12 24 C11.4 16.8 7.2 12.6 0 12 C7.2 11.4 11.4 7.2 12 0 Z"
          fill="#FFFFFF"
        />
      </Svg>
    </Animated.View>
  );
}
