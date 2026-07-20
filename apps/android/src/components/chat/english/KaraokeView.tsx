/**
 * KaraokeView — native port of the web KaraokeRenderer.
 *
 * Renders an english_skill_view element (SPEAK_PARA / KARAOKE / READ_ALOUD):
 *  - mode-based card color (READ_ALOUD blue, KARAOKE/SPEAK_PARA pink)
 *  - Play/Pause for listen modes (enabled once tts_start marks it ready)
 *  - Record affordance for READ_ALOUD / KARAOKE repeat → opens RecordingSheet
 */
import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from "react-native";
import { Play, Pause, Mic } from "lucide-react-native";
import { colors, fonts } from "../../../theme/tokens";
import { audioStore, useAudioPlayback, useRecordingState } from "../../../store/useAudioStore";
import { micPrimingStore } from "../../../store/useMicPrimingStore";

interface Props {
  text: string;
  directiveId: string;
  mode?: string;
  readOnly?: boolean;
}

const PINK = "#BE185D";
const PINK_BG = "#FDF2F8";
const PINK_BD = "#F9A8D4";
const BLUE = colors.genBlue;
const BLUE_BG = "#EFF6FF";

export function KaraokeView({ text, directiveId, mode, readOnly }: Props) {
  const isReadAloud = mode === "READ_ALOUD";
  const { isReady, isActive, isLoading, isPlaying, isPaused } = useAudioPlayback(directiveId);
  const rec = useRecordingState();
  const isRecordingHere = rec.directiveId === directiveId && rec.recordingState !== "idle";

  const accent = isReadAloud ? BLUE : PINK;
  const bg = isReadAloud ? BLUE_BG : PINK_BG;
  const border = isReadAloud ? `${BLUE}20` : `${PINK_BD}50`;

  const handlePlayPause = () => {
    if (isLoading) return;
    if (isPlaying) audioStore.pause();
    else if (isPaused) audioStore.resume();
    else audioStore.play(directiveId);
  };

  const handleRecord = () => {
    audioStore.openRecording(directiveId);
    micPrimingStore.requestAccess(() => audioStore.confirmStartRecording());
  };

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View style={styles.headerRow}>
        <View style={styles.labelChip}>
          <PulseDot color={isReadAloud ? colors.growth : colors.genPurple} active={isActive || isRecordingHere} />
          <Text style={styles.labelText}>{isReadAloud ? "Read Aloud" : "Listen & Repeat"}</Text>
        </View>

        {!isReadAloud && (isReady || readOnly) && (
          <TouchableOpacity
            onPress={handlePlayPause}
            disabled={isLoading}
            activeOpacity={0.8}
            style={[
              styles.playBtn,
              { backgroundColor: isPlaying || isPaused ? colors.genPurple : "#EDE9FE" },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.genPurple} />
            ) : isPlaying ? (
              <Pause size={16} color="#fff" fill="#fff" />
            ) : (
              <Play size={16} color={colors.genPurple} fill={colors.genPurple} style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.body}>{text}</Text>

      {/* Read-aloud / repeat → record button */}
      {!readOnly && (isReadAloud || mode === "KARAOKE") && !isRecordingHere && (
        <TouchableOpacity onPress={handleRecord} activeOpacity={0.85} style={[styles.recordBtn, { borderColor: accent }]}>
          <Mic size={14} color={accent} />
          <Text style={[styles.recordBtnText, { color: accent }]}>Read it aloud</Text>
        </TouchableOpacity>
      )}

      {isRecordingHere && (
        <View style={styles.statusRow}>
          <PulseDot color={colors.growth} active />
          <Text style={[styles.statusText, { color: accent }]}>
            {rec.recordingState === "processing"
              ? "Analyzing…"
              : rec.recordingState === "uploading"
              ? "Uploading…"
              : "Recording…"}
          </Text>
        </View>
      )}
    </View>
  );
}

function PulseDot({ color, active }: { color: string; active?: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) {
      opacity.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [active]);
  return <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity }} />;
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
    paddingLeft: 22,
    position: "relative",
    overflow: "hidden",
  },
  accentBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  labelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(91,77,199,0.08)",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  labelText: {
    fontFamily: fonts.dmBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.genPurple,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    fontFamily: fonts.dmMedium,
    fontSize: 15,
    lineHeight: 23,
    color: "#1A202C",
  },
  recordBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  recordBtnText: { fontFamily: fonts.dmBold, fontSize: 12 },
  statusRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontFamily: fonts.dmBold, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" },
});
