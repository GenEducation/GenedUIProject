/**
 * Full-screen "journey" loader shown after sign-in/sign-up submit, mirroring
 * the web app's LoaderJourney (src/components/shared/loaders/LoaderJourney).
 * Cycles a character through bike → read → trophy poses with a simulated
 * progress bar while the auth request is in flight, then bursts confetti and
 * fades out once the caller marks the flow complete.
 */
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts } from "@/theme/tokens";
import { useLoaderStore } from "@/store/useLoaderStore";

const SIMULATED_CAP = 90;
const LOOP_INTERVAL_MS = 800;
const TICK_MS = 120;

const LOOP_STEPS = [
  { pose: "bike", message: "Getting things ready…" },
  { pose: "read", message: "Fetching your content…" },
  { pose: "read", message: "Putting on the finishing touches…" },
] as const;

const CHAR_BIKE = require("../../../assets/loaders/journey/char-bike.png");
const CHAR_READ = require("../../../assets/loaders/journey/char-read.png");
const CHAR_TROPHY = require("../../../assets/loaders/journey/char-trophy.png");

const CONFETTI = [
  { color: "#8C63C9", dx: -70, dy: -40 },
  { color: "#3D6FE0", dx: 70, dy: -50 },
  { color: "#F26FA0", dx: -40, dy: -70 },
  { color: "#FFC93D", dx: 50, dy: -70 },
  { color: "#3D6FE0", dx: -90, dy: 10 },
  { color: "#8C63C9", dx: 90, dy: 0 },
];

export function LoaderJourney() {
  const { isVisible, isComplete, stopLoading } = useLoaderStore();
  const [progress, setProgress] = useState(0);
  const [loopStep, setLoopStep] = useState(0);
  const finishedRef = useRef(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, fade]);

  // Steady progress climb, decoupled from which character pose is showing.
  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      finishedRef.current = false;
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setProgress((prev) => {
        const target = isComplete ? 100 : SIMULATED_CAP;
        const step = isComplete ? 0.35 : 0.08;
        const next = prev + (target - prev) * step;
        return target - next < 0.15 ? target : next;
      });
      timer = setTimeout(tick, TICK_MS);
    };
    timer = setTimeout(tick, TICK_MS);

    return () => clearTimeout(timer);
  }, [isVisible, isComplete]);

  // Independent pose/message loop — keeps animating no matter how long the
  // request takes, instead of freezing once progress hits its simulated cap.
  useEffect(() => {
    if (!isVisible || isComplete) {
      setLoopStep(0);
      return;
    }

    const id = setInterval(() => {
      setLoopStep((prev) => (prev + 1) % LOOP_STEPS.length);
    }, LOOP_INTERVAL_MS);

    return () => clearInterval(id);
  }, [isVisible, isComplete]);

  useEffect(() => {
    if (isVisible && isComplete && progress >= 99.9 && !finishedRef.current) {
      finishedRef.current = true;
      const t = setTimeout(stopLoading, 1200);
      return () => clearTimeout(t);
    }
  }, [isVisible, isComplete, progress, stopLoading]);

  if (!isVisible) return null;

  const pct = Math.min(100, progress);
  const isTrophyPhase = isComplete && pct >= 100;
  const currentPose = isTrophyPhase ? "trophy" : LOOP_STEPS[loopStep].pose;
  const message = isTrophyPhase ? "All done!" : LOOP_STEPS[loopStep].message;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fade }]}>
        <View style={styles.charArea}>
          <Animated.Image
            source={CHAR_BIKE}
            style={[styles.charImg, { opacity: currentPose === "bike" ? 1 : 0 }]}
            resizeMode="contain"
          />
          <Animated.Image
            source={CHAR_READ}
            style={[styles.charImg, { opacity: currentPose === "read" ? 1 : 0 }]}
            resizeMode="contain"
          />
          <Animated.Image
            source={CHAR_TROPHY}
            style={[styles.charImg, { opacity: currentPose === "trophy" ? 1 : 0 }]}
            resizeMode="contain"
          />
          {isTrophyPhase && <Confetti />}
        </View>

        <View style={styles.footer}>
          <View style={styles.track}>
            <View style={[styles.fillWrap, { width: `${pct}%` }]}>
              <LinearGradient
                colors={["#3D6FE0", "#8C63C9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.fill}
              />
            </View>
          </View>
          <Text style={styles.pct}>{Math.round(pct)}%</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

function Confetti() {
  const anims = useRef(CONFETTI.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel(
      anims.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [anims]);

  return (
    <>
      {CONFETTI.map((c, i) => {
        const translateX = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, c.dx] });
        const translateY = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, c.dy] });
        const opacity = anims[i].interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
        return (
          <Animated.View
            key={i}
            style={[
              styles.confettiBit,
              { backgroundColor: c.color, opacity, transform: [{ translateX }, { translateY }] },
            ]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.97)",
    alignItems: "center",
    justifyContent: "center",
  },
  charArea: { width: 220, height: 220, marginBottom: 24 },
  charImg: { position: "absolute", width: "100%", height: "100%" },
  confettiBit: {
    position: "absolute",
    left: "50%",
    top: "20%",
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  footer: { width: "100%", maxWidth: 340, paddingHorizontal: 16, alignItems: "center" },
  track: { width: "100%", height: 4, backgroundColor: "#F1F5F9", borderRadius: 2, overflow: "hidden" },
  fillWrap: { height: "100%" },
  fill: { flex: 1 },
  pct: { marginTop: 16, fontFamily: fonts.dmBold, fontSize: 13, color: colors.navy, opacity: 0.6, letterSpacing: 0.3 },
  message: { marginTop: 4, fontFamily: fonts.dm, fontSize: 13, color: colors.navy, opacity: 0.4, letterSpacing: 0.3 },
});
