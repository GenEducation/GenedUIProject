/**
 * useAudioStore — shared English-skill audio state for the chat tree.
 *
 * A subscribable singleton read via useSyncExternalStore (no extra deps),
 * mirroring the web's Zustand slice in useStudentStore (playDirectiveTts,
 * pausePlayback, startSkillRecording, submitOralResult, …).
 *
 * It bridges SSE control events (handled in useChat/useVoiceChat) to the
 * deep KaraokeView / RecordingSheet components without prop-drilling.
 */
import { useSyncExternalStore } from "react";
import { audioPlayerService, type PlaybackState } from "../services/audioPlayerService";
import { audioRecorderService, type RecordingState } from "../services/audioRecorderService";
import { studentService } from "../services/studentService";

export type RecordingPrompt = "silence" | "cap" | null;

export interface OralAnalysisResult {
  wer?: number;
  pace_wpm?: number;
  fluency?: number | string;
  feedback?: string;
  [key: string]: any;
}

interface AudioState {
  // Playback
  playbackState: PlaybackState;
  activeDirectiveId: string | null;
  ttsReadyDirectiveIds: Set<string>;
  // Recording
  recordingState: RecordingState;
  recordingPrompt: RecordingPrompt;
  recordingError: string | null;
  recordingDirectiveId: string | null;
  oralAnalysisResult: OralAnalysisResult | null;
  // Active skill metadata (from skill_action)
  activeSkillDirective: any | null;
  // Session context so actions can hit the API
  sessionId: string | null;
  grade: number;
}

const state: AudioState = {
  playbackState: "idle",
  activeDirectiveId: null,
  ttsReadyDirectiveIds: new Set(),
  recordingState: "idle",
  recordingPrompt: null,
  recordingError: null,
  recordingDirectiveId: null,
  oralAnalysisResult: null,
  activeSkillDirective: null,
  sessionId: null,
  grade: 5,
};

const listeners = new Set<() => void>();
// useSyncExternalStore requires a stable snapshot reference that only changes
// when state changes — so we bump a version counter and return a frozen copy.
let snapshot: AudioState = { ...state };

function emit() {
  snapshot = { ...state, ttsReadyDirectiveIds: new Set(state.ttsReadyDirectiveIds) };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

// ── Imperative API (called from SSE handlers + UI components) ──────────────────

export const audioStore = {
  /** Set the session/grade context for the current chat. */
  setContext(sessionId: string | null, grade?: number) {
    state.sessionId = sessionId;
    if (typeof grade === "number") state.grade = grade;
    // No emit needed — context isn't rendered directly
  },

  /** SSE tts_start → the directive's audio is generated and ready to play. */
  markReady(directiveId: string) {
    if (!directiveId) return;
    state.ttsReadyDirectiveIds.add(directiveId);
    emit();
  },

  /** SSE skill_action → remember the active skill payload. */
  setActiveSkill(payload: any) {
    state.activeSkillDirective = payload || null;
    emit();
  },

  // ── Playback ────────────────────────────────────────────────────────────────

  play(directiveId: string) {
    state.activeDirectiveId = directiveId;
    state.playbackState = "loading";
    emit();
    audioPlayerService.play(directiveId, {
      onStateChange: (s) => {
        state.playbackState = s;
        emit();
      },
      onComplete: (dId) => {
        // Report playback_complete (Wave 1 §7.1)
        if (state.sessionId && state.sessionId !== "new") {
          studentService
            .reportConversationAction(state.sessionId, "playback_complete", dId)
            .catch(() => {});
        }
        state.activeDirectiveId = null;
        emit();
      },
      onError: (_dId, msg) => {
        console.warn("[TTS]", msg);
        state.playbackState = "idle";
        state.activeDirectiveId = null;
        emit();
      },
    });
  },

  pause() {
    audioPlayerService.pause();
  },

  resume() {
    audioPlayerService.resume();
  },

  stopPlayback() {
    audioPlayerService.stop();
    state.playbackState = "idle";
    state.activeDirectiveId = null;
    emit();
  },

  playWord(word: string, slow = false) {
    audioPlayerService.playWord(word, state.grade, slow, {
      onStateChange: (s) => {
        state.playbackState = s;
        emit();
      },
    });
  },

  // ── Recording ─────────────────────────────────────────────────────────────────

  /** SSE recording_open → prepare the recording sheet (does not start the mic). */
  openRecording(directiveId: string, _expectedMs = 15000) {
    state.recordingDirectiveId = directiveId;
    state.recordingState = "ready";
    state.recordingPrompt = null;
    state.recordingError = null;
    state.oralAnalysisResult = null;
    emit();
  },

  /** SSE recording_closed → backend ended the recording window. */
  closeRecording() {
    if (state.recordingState === "ready") {
      state.recordingState = "idle";
      state.recordingDirectiveId = null;
      emit();
    }
  },

  /** User taps "Start Recording" in the sheet — activates the mic. */
  confirmStartRecording() {
    const directiveId = state.recordingDirectiveId;
    if (!directiveId || !state.sessionId) return;
    if (state.recordingState === "recording" || state.recordingState === "permission_request") return;

    state.recordingState = "permission_request";
    emit();

    audioRecorderService.start(directiveId, state.sessionId, {
      onStateChange: (s) => {
        state.recordingState = s;
        emit();
      },
      onSilenceDetected: () => {
        state.recordingPrompt = "silence";
        emit();
      },
      onDurationCap: () => {
        state.recordingPrompt = "cap";
        emit();
      },
      onUploadComplete: (gcsUri, dId) => {
        audioStore.submitOralResult(dId, gcsUri);
      },
      onError: (msg) => {
        console.warn("[Recording]", msg);
        state.recordingError = msg;
        state.recordingState = "error";
        emit();
      },
    });
  },

  /** User taps "Stop" — ends recording, triggering the upload flow. */
  stopRecording() {
    audioRecorderService.stop();
  },

  /** Cancel/close the recording sheet entirely. */
  dismissRecording() {
    audioRecorderService.stop();
    state.recordingState = "idle";
    state.recordingPrompt = null;
    state.recordingError = null;
    state.recordingDirectiveId = null;
    state.oralAnalysisResult = null;
    emit();
  },

  dismissPrompt() {
    state.recordingPrompt = null;
    emit();
  },

  async submitOralResult(directiveId: string, gcsUri: string) {
    if (!state.sessionId || state.sessionId === "new") return;
    state.recordingState = "processing";
    state.oralAnalysisResult = null;
    emit();
    try {
      const result = await studentService.submitOralResult(state.sessionId, directiveId, gcsUri);
      state.recordingState = "completed";
      state.oralAnalysisResult = result;
      emit();
    } catch (err) {
      console.warn("[OralResult] failed:", err);
      state.recordingState = "error";
      state.recordingError = "Failed to analyze your reading. Please try again.";
      emit();
    }
  },
};

// ── React hooks ────────────────────────────────────────────────────────────────

export function useAudioSnapshot(): AudioState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Playback state scoped to one directive (drives a KaraokeView Play button). */
export function useAudioPlayback(directiveId: string) {
  const s = useAudioSnapshot();
  const isActive = s.activeDirectiveId === directiveId;
  return {
    isReady: s.ttsReadyDirectiveIds.has(directiveId),
    isActive,
    isLoading: isActive && (s.playbackState === "loading" || s.playbackState === "buffering"),
    isPlaying: isActive && s.playbackState === "playing",
    isPaused: isActive && s.playbackState === "paused",
  };
}

/** Recording state for the active read-aloud directive. */
export function useRecordingState() {
  const s = useAudioSnapshot();
  return {
    recordingState: s.recordingState,
    recordingPrompt: s.recordingPrompt,
    recordingError: s.recordingError,
    directiveId: s.recordingDirectiveId,
    oralAnalysisResult: s.oralAnalysisResult,
  };
}
