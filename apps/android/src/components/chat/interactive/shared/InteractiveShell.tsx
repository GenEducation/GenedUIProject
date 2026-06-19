import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { COLORS } from "../types";
import { fonts } from "../../../../theme/tokens";

interface InteractiveShellProps {
  label?: string;
  prompt?: string;
  children: React.ReactNode;
}

export function InteractiveShell({ label, prompt, children }: InteractiveShellProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.shell, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.label}>{label || "Activity"}</Text>
      </View>
      {prompt ? <Text style={styles.prompt}>{prompt}</Text> : null}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginVertical: 10,
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: "#5B4DC722",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brand,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.dmBold,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLORS.brand,
  },
  prompt: {
    fontSize: 14,
    fontFamily: fonts.dmBold,
    color: COLORS.ink,
    lineHeight: 20,
    marginBottom: 14,
  },
});
