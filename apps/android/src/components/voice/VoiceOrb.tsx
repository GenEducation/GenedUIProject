/**
 * Animated pulsing orb — visual indicator for voice session state.
 *
 * States:
 *  idle      → gray, slow pulse, "Tap to start"
 *  listening → purple, medium pulse
 *  speaking  → purple, fast pulse (AI is responding)
 *  pttHeld   → green, medium pulse (user holding to talk)
 */
import React, { useEffect, useRef } from "react";
import { View, Pressable, Animated, StyleSheet, Text } from "react-native";
import { colors, fonts } from "../../theme/tokens";

type OrbPhase = "idle" | "listening" | "speaking" | "pttHeld";

interface Props {
  phase: OrbPhase;
  caption: string;
  onTap?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

const PHASE_CONFIG: Record<OrbPhase, { color: string; glowColor: string; duration: number; scaleTo: number }> = {
  idle:      { color: "#94A3B8", glowColor: "#94A3B820", duration: 3000, scaleTo: 1.02 },
  listening: { color: colors.genPurple, glowColor: colors.genPurple + "25", duration: 1400, scaleTo: 1.06 },
  speaking:  { color: colors.genPurple, glowColor: colors.genPurple + "30", duration: 800,  scaleTo: 1.09 },
  pttHeld:   { color: "#34C759",        glowColor: "#34C75930",             duration: 1000, scaleTo: 1.07 },
};

export function VoiceOrb({ phase, caption, onTap, onPressIn, onPressOut }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const config = PHASE_CONFIG[phase];

  useEffect(() => {
    animRef.current?.stop();

    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: config.scaleTo, duration: config.duration / 2, useNativeDriver: true }),
          Animated.timing(glowScale, { toValue: 1.3, duration: config.duration / 2, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: config.duration / 2, useNativeDriver: true }),
          Animated.timing(glowScale, { toValue: 1, duration: config.duration / 2, useNativeDriver: true }),
        ]),
      ])
    );

    animRef.current = anim;
    anim.start();
    return () => anim.stop();
  }, [phase, config]);

  return (
    <View style={styles.container}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            backgroundColor: config.glowColor,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      {/* Main orb */}
      <Pressable
        onPress={onTap}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Animated.View
          style={[
            styles.orb,
            {
              backgroundColor: config.color,
              transform: [{ scale }],
              shadowColor: config.color,
            },
          ]}
        >
          {/* Inner highlight */}
          <View style={[styles.innerHighlight, { backgroundColor: config.color }]} />
          <View style={styles.sheen} />
        </Animated.View>
      </Pressable>

      {/* Caption */}
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const ORB_SIZE = 150;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  glowRing: {
    position: "absolute",
    width: ORB_SIZE + 60,
    height: ORB_SIZE + 60,
    borderRadius: (ORB_SIZE + 60) / 2,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  innerHighlight: {
    width: ORB_SIZE * 0.7,
    height: ORB_SIZE * 0.7,
    borderRadius: (ORB_SIZE * 0.7) / 2,
    opacity: 0.3,
  },
  sheen: {
    position: "absolute",
    top: 12,
    left: ORB_SIZE * 0.25,
    width: ORB_SIZE * 0.35,
    height: ORB_SIZE * 0.18,
    borderRadius: ORB_SIZE * 0.1,
    backgroundColor: "rgba(255,255,255,0.2)",
    transform: [{ rotate: "-15deg" }],
  },
  caption: {
    marginTop: 16,
    fontFamily: fonts.dmMedium,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
});
