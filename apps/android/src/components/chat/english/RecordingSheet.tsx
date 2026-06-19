/**
 * RecordingSheet — global bottom-sheet for the read-aloud record→assess loop.
 *
 * Mounted once per chat screen. Becomes visible whenever a recording session is
 * active (driven by useRecordingState). Walks through:
 *   recording → uploading → processing → completed (WER / pace / fluency / feedback)
 *   or error (with retry/close).
 */
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Mic, Square, X } from "lucide-react-native";
import { colors, fonts } from "../../../theme/tokens";
import { audioStore, useRecordingState } from "../../../store/useAudioStore";

const SCREEN_H = Dimensions.get("window").height;

export function RecordingSheet() {
  const { recordingState, recordingError, oralAnalysisResult, recordingPrompt } = useRecordingState();

  const visible =
    recordingState === "recording" ||
    recordingState === "permission_request" ||
    recordingState === "uploading" ||
    recordingState === "processing" ||
    recordingState === "completed" ||
    recordingState === "error";

  const close = () => audioStore.dismissRecording();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          {(recordingState === "recording" || recordingState === "permission_request") && (
            <RecordingActive prompt={recordingPrompt} state={recordingState} />
          )}

          {(recordingState === "uploading" || recordingState === "processing") && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.genPurple} />
              <Text style={styles.statusBig}>
                {recordingState === "uploading" ? "Uploading your reading…" : "Analyzing your reading…"}
              </Text>
            </View>
          )}

          {recordingState === "completed" && oralAnalysisResult && (
            <ResultCard result={oralAnalysisResult} onClose={close} />
          )}

          {recordingState === "error" && (
            <View style={styles.center}>
              <Text style={styles.errorTitle}>Couldn't process that</Text>
              <Text style={styles.errorMsg}>{recordingError || "Something went wrong."}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={close} activeOpacity={0.85}>
                <X size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function RecordingActive({ prompt, state }: { prompt: string | null; state: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={styles.center}>
      <Text style={styles.title}>{state === "permission_request" ? "Getting ready…" : "Listening…"}</Text>
      <Animated.View style={[styles.micCircle, { transform: [{ scale }] }]}>
        <Mic size={30} color="#fff" />
      </Animated.View>
      {prompt === "silence" && <Text style={styles.hint}>Tap stop when you're done.</Text>}
      {prompt === "cap" && <Text style={styles.hint}>That's plenty — tap stop to submit.</Text>}
      <TouchableOpacity style={styles.stopBtn} onPress={() => audioStore.stopRecording()} activeOpacity={0.85}>
        <Square size={16} color="#fff" fill="#fff" />
        <Text style={styles.stopBtnText}>Stop & Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

function ResultCard({ result, onClose }: { result: any; onClose: () => void }) {
  const accuracy =
    typeof result.wer === "number" ? Math.max(0, Math.round((1 - result.wer) * 100)) : null;
  const pace = result.pace_wpm != null ? Math.round(result.pace_wpm) : null;
  const fluency = result.fluency != null ? String(result.fluency) : null;

  return (
    <View>
      <Text style={styles.title}>Nice reading! 🎉</Text>
      <View style={styles.metricsRow}>
        {accuracy != null && <Metric label="Accuracy" value={`${accuracy}%`} />}
        {pace != null && <Metric label="Pace" value={`${pace} wpm`} />}
        {fluency != null && <Metric label="Fluency" value={fluency} />}
      </View>
      {result.feedback ? <Text style={styles.feedback}>{result.feedback}</Text> : null}
      <TouchableOpacity style={styles.primaryBtn} onPress={onClose} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopColor: "transparent",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: SCREEN_H * 0.7,
    borderTopWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 18,
  },
  center: { alignItems: "center" },
  title: { fontFamily: fonts.dmBold, fontSize: 18, color: colors.text, marginBottom: 18, textAlign: "center" },
  micCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  hint: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted, marginBottom: 16, textAlign: "center" },
  statusBig: { fontFamily: fonts.dmMedium, fontSize: 15, color: colors.textMid, marginTop: 16 },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.coral,
    paddingVertical: 13,
    paddingHorizontal: 26,
    borderRadius: 24,
    marginTop: 8,
  },
  stopBtnText: { fontFamily: fonts.dmBold, fontSize: 14, color: "#fff" },
  metricsRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginBottom: 18 },
  metric: {
    backgroundColor: colors.pageBg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    minWidth: 88,
  },
  metricValue: { fontFamily: fonts.dmBold, fontSize: 20, color: colors.genPurple },
  metricLabel: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  feedback: { fontFamily: fonts.dm, fontSize: 14, lineHeight: 21, color: colors.textMid, marginBottom: 20, textAlign: "center" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.genPurple,
    paddingVertical: 14,
    borderRadius: 24,
  },
  primaryBtnText: { fontFamily: fonts.dmBold, fontSize: 15, color: "#fff" },
  errorTitle: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.coral, marginBottom: 8 },
  errorMsg: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMid, textAlign: "center", marginBottom: 20 },
});
