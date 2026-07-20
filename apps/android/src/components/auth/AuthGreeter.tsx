import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { StudentAvatarIllustration } from "@/components/StudentAvatarIllustration";
import { AVATAR_ACCENT } from "@/components/StudentAvatar";
import { useReduceMotion } from "./motion";

/**
 * The graduate-student illustration greeting you above the sign-in headline —
 * the same artwork the Me page shows.
 *
 * Renders StudentAvatarIllustration directly rather than <StudentAvatar/>: that
 * wrapper resolves the *signed-in* student's chosen avatar from usePrefsStore,
 * and there is no user yet on this screen.
 */
export function AuthGreeter({ size = 96 }: { size?: number }) {
  const bob = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      bob.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [4, -4] });

  const disc = size + 12;
  const halo = size + 26;

  return (
    <Animated.View
      style={[styles.wrap, { transform: [{ translateY }] }]}
      accessibilityRole="image"
      accessibilityLabel="A student wearing a graduation cap"
    >
      {/* glow ring */}
      <View style={[styles.ring, { width: halo, height: halo, borderRadius: halo / 2 }]} />
      <View style={[styles.disc, { width: disc, height: disc, borderRadius: disc / 2 }]}>
        <StudentAvatarIllustration bg={AVATAR_ACCENT} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", alignSelf: "center" },
  ring: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  disc: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#fff",
    shadowColor: "#0B1A4A",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
});
