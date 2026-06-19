/**
 * audioRecorderService.ts — native (expo-av) port of the web audioRecorderService.
 *
 * Flow (Wave 2/3):
 *  1. Record mic → .m4a/AAC (expo-av Audio.Recording HIGH_QUALITY preset).
 *  2. POST /english/session/{id}/audio-upload → signed GCS URL.
 *  3. PUT the file directly to GCS via FileSystem.uploadAsync (BINARY_CONTENT).
 *  4. Hand the gcs_uri back so the caller can POST /oral-result.
 *
 * Frontend never sends a transcript — the backend owns STT.
 */
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { studentService } from "./studentService";

export type RecordingState =
  | "idle"
  | "permission_request"
  | "ready"
  | "recording"
  | "uploading"
  | "processing"
  | "completed"
  | "error";

export interface RecordingCallbacks {
  onStateChange?: (state: RecordingState) => void;
  onSilenceDetected?: () => void;
  onDurationCap?: () => void;
  onUploadComplete?: (gcsUri: string, directiveId: string) => void;
  onError?: (message: string) => void;
}

const SILENCE_THRESHOLD_DB = -45; // metering below this counts as silence
const SILENCE_DURATION_MS = 3000;
const MIN_SPEECH_DURATION_MS = 2000;

class AudioRecorderService {
  private recording: Audio.Recording | null = null;
  private state: RecordingState = "idle";
  private callbacks: RecordingCallbacks = {};
  private directiveId: string | null = null;
  private sessionId: string | null = null;
  private durationCapTimer: ReturnType<typeof setTimeout> | null = null;

  // Silence tracking
  private totalSpeechMs = 0;
  private silenceStart: number | null = null;
  private lastSampleAt = 0;

  private setState(s: RecordingState) {
    this.state = s;
    this.callbacks.onStateChange?.(s);
  }

  private clearTimers() {
    if (this.durationCapTimer) {
      clearTimeout(this.durationCapTimer);
      this.durationCapTimer = null;
    }
  }

  async start(
    directiveId: string,
    sessionId: string,
    callbacks: RecordingCallbacks,
    expectedMs = 15000
  ): Promise<void> {
    if (this.state === "recording" || this.state === "permission_request") {
      if (this.directiveId === directiveId) return;
      await this.stop();
    }

    this.callbacks = callbacks;
    this.directiveId = directiveId;
    this.sessionId = sessionId;
    this.totalSpeechMs = 0;
    this.silenceStart = null;
    this.lastSampleAt = 0;

    this.setState("permission_request");
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        this.setState("error");
        callbacks.onError?.("Microphone permission denied");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      recording.setOnRecordingStatusUpdate(this.onStatus);
      recording.setProgressUpdateInterval(120);
      await recording.startAsync();
      this.recording = recording;
      this.setState("recording");

      this.clearTimers();
      this.durationCapTimer = setTimeout(() => {
        if (this.state === "recording") this.callbacks.onDurationCap?.();
      }, expectedMs);
    } catch (err: any) {
      this.setState("error");
      callbacks.onError?.(err?.message || "Recorder init failed");
    }
  }

  private onStatus = (status: Audio.RecordingStatus) => {
    if (!status.isRecording || status.metering == null) return;
    const now = Date.now();
    const dt = this.lastSampleAt > 0 ? now - this.lastSampleAt : 0;
    this.lastSampleAt = now;

    if (status.metering >= SILENCE_THRESHOLD_DB) {
      // speaking
      this.totalSpeechMs += dt;
      this.silenceStart = null;
    } else {
      if (this.silenceStart === null) this.silenceStart = now;
      const hasSpoken = this.totalSpeechMs >= MIN_SPEECH_DURATION_MS;
      if (hasSpoken && now - this.silenceStart >= SILENCE_DURATION_MS) {
        this.callbacks.onSilenceDetected?.();
        this.silenceStart = null;
      }
    }
  };

  /** Stop recording — kicks off the GCS upload flow. */
  async stop(): Promise<void> {
    this.clearTimers();
    const recording = this.recording;
    if (!recording || (this.state !== "recording" && this.state !== "ready")) {
      return;
    }
    this.recording = null;
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      /* may already be stopped */
    }
    const uri = recording.getURI();
    await this.handleUpload(uri);
  }

  private async handleUpload(uri: string | null) {
    const directiveId = this.directiveId;
    const sessionId = this.sessionId;
    if (!uri || !directiveId || !sessionId) {
      this.setState("idle");
      return;
    }

    this.setState("uploading");
    try {
      const info = await FileSystem.getInfoAsync(uri);
      const fileSize = info.exists ? (info as any).size ?? 0 : 0;

      // Step A — signed upload URL
      const signed = await studentService.requestAudioUpload(sessionId, {
        directive_id: directiveId,
        mime_type: "audio/mp4",
        file_size: fileSize,
        codec: "aac",
      });
      const uploadUrl = signed.upload_url || signed.signed_url;
      const gcsUri = signed.gcs_uri;
      if (!uploadUrl) throw new Error("No upload URL returned from backend");

      // Step B — PUT the file straight to GCS
      const putHeaders: Record<string, string> = { "Content-Type": "audio/mp4" };
      if (signed.headers) Object.assign(putHeaders, signed.headers);

      const res = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: putHeaders,
      });
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`GCS upload failed: ${res.status}`);
      }

      this.setState("processing");
      this.callbacks.onUploadComplete?.(gcsUri, directiveId);
    } catch (err: any) {
      this.setState("error");
      this.callbacks.onError?.(err?.message || "Upload failed");
    }
  }

  getState(): RecordingState {
    return this.state;
  }

  async destroy() {
    this.clearTimers();
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {
        /* ignore */
      }
      this.recording = null;
    }
    this.setState("idle");
  }
}

export const audioRecorderService = new AudioRecorderService();
