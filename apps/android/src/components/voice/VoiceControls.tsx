/**
 * Voice chat controls — mute toggle, push-to-talk, end session.
 * Mobile-optimized with large touch targets.
 */
import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { PhoneOff } from "lucide-react-native";
import { colors, fonts } from "../../theme/tokens";

interface Props {
  isMuted: boolean;
  pttHeld: boolean;
  sessionActive: boolean;
  onToggleMute: () => void;
  onPttStart: () => void;
  onPttEnd: () => void;
  onEnd: () => void;
}

function MicIcon({ muted, color }: { muted: boolean; color: string }) {
  if (muted) {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path d="M1 1l22 22M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M17 16.95A7 7 0 015 12m14 0a7 7 0 01-.11 1.23M12 19v4m-4 0h8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4m-4 0h8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function VoiceControls({ isMuted, pttHeld, sessionActive, onToggleMute, onPttStart, onPttEnd, onEnd }: Props) {
  const showPtt = sessionActive && isMuted;

  return (
    <View style={styles.row}>
      {/* Mute toggle */}
      <Pressable
        style={({ pressed }) => [
          styles.muteBtn,
          isMuted ? styles.muteBtnMuted : styles.muteBtnUnmuted,
          pressed && { opacity: 0.85 },
        ]}
        onPress={onToggleMute}
        disabled={!sessionActive}
        focusable={false}
        accessibilityRole="button"
        accessibilityLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
      >
        <MicIcon muted={isMuted} color={isMuted ? "#fff" : colors.genPurple} />
      </Pressable>

      {/* Push to Talk */}
      {showPtt && (
        <Pressable
          style={[styles.pttBtn, pttHeld && styles.pttBtnHeld]}
          onPressIn={onPttStart}
          onPressOut={onPttEnd}
          focusable={false}
          accessibilityRole="button"
          accessibilityLabel="Hold to talk"
        >
          <MicIcon muted={false} color="#fff" />
          <Text style={styles.pttText}>{pttHeld ? "Speaking…" : "Hold to Talk"}</Text>
        </Pressable>
      )}

      {/* End session */}
      <Pressable
        style={styles.endBtn}
        onPress={onEnd}
        focusable={false}
        accessibilityRole="button"
        accessibilityLabel="End voice session"
      >
        <PhoneOff size={20} color="#fff" strokeWidth={2.5} />
        <Text style={styles.endText}>End</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  muteBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    // No elevation/shadow: Samsung/One UI renders the elevation shadow of a rounded
    // view as a square box (visible against the coral muted background). Keep it flat.
  },
  muteBtnMuted: {
    backgroundColor: colors.coral,
  },
  muteBtnUnmuted: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pttBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.genPurple,
  },
  pttBtnHeld: {
    backgroundColor: "#34C759",
    transform: [{ scale: 0.97 }],
  },
  pttText: {
    fontFamily: fonts.dmBold,
    fontSize: 13,
    color: "#fff",
  },
  endBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EF4444",
  },
  endText: {
    fontFamily: fonts.dmBold,
    fontSize: 13,
    color: "#fff",
  },
});
