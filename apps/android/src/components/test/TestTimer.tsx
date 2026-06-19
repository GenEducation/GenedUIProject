/**
 * TestTimer — counts down from `seconds`, fires onExpire once at zero.
 * mm:ss, turns red in the final minute.
 */
import React, { useEffect, useRef, useState } from "react";
import { Text, StyleSheet } from "react-native";
import { colors, fonts } from "../../theme/tokens";

export function TestTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!firedRef.current) {
            firedRef.current = true;
            onExpireRef.current();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const low = remaining <= 60;

  return (
    <Text style={[styles.timer, low && styles.low]}>
      {mm}:{ss.toString().padStart(2, "0")}
    </Text>
  );
}

const styles = StyleSheet.create({
  timer: {
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.pageBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  low: { color: "#fff", backgroundColor: colors.coral },
});
