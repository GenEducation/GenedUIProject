/**
 * Voice chat controls — mute toggle, push-to-talk, end session.
 * Mobile-optimized with large touch targets.
 */
import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
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

function PhoneOffIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 004.73.94 2 2 0 012 2v3.28a2 2 0 01-1.67 1.97A19.47 19.47 0 0112 21 19.14 19.14 0 013 16.44M1.09 1.09l21.83 21.83" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function VoiceControls({ isMuted, pttHeld, sessionActive, onToggleMute, onPttStart, onPttEnd, onEnd }: Props) {
  const showPtt = sessionActive && isMuted;

  return (
    <View style={styles.row}>
      {/* Mute toggle */}
      <Pressable
        style={[styles.muteBtn, isMuted ? styles.muteBtnMuted : styles.muteBtnUnmuted]}
        onPress={onToggleMute}
        disabled={!sessionActive}
      >
        <MicIcon muted={isMuted} color={isMuted ? "#fff" : colors.genPurple} />
      </Pressable>

      {/* Push to Talk */}
      {showPtt && (
        <Pressable
          style={[styles.pttBtn, pttHeld && styles.pttBtnHeld]}
          onPressIn={onPttStart}
          onPressOut={onPttEnd}
        >
          <MicIcon muted={false} color="#fff" />
          <Text style={styles.pttText}>{pttHeld ? "Speaking…" : "Hold to Talk"}</Text>
        </Pressable>
      )}

      {/* End session */}
      <Pressable style={styles.endBtn} onPress={onEnd}>
        <PhoneOffIcon color="#fff" />
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
    shadowColor: colors.genPurple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
  pttBtnHeld: {
    backgroundColor: "#34C759",
    shadowColor: "#34C759",
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
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
  },
  endText: {
    fontFamily: fonts.dmBold,
    fontSize: 13,
    color: "#fff",
  },
});
