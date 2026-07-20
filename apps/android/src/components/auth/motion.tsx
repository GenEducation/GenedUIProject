import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable } from "react-native";

/**
 * Shared motion primitives for the auth screens (sign-in / sign-up), so both
 * stay on one entrance + press language.
 */

/**
 * Whether the OS "remove animations" setting is on.
 *
 * Defaults to `true` until the async check resolves, so a reduce-motion user
 * never catches a frame of movement on mount.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) setReduceMotion(on);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}

/** Fade + 12px slide-up, driven by a shared stagger. */
export function Reveal({ anim, children, style }: {
  anim: Animated.Value;
  children: React.ReactNode;
  style?: any;
}) {
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

/** Pressable that springs to 0.97 on press-in. */
export function Bouncy({
  children, onPress, disabled, style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (v: number) =>
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={style}
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => to(0.97)}
        onPressOut={() => to(1)}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
