/**
 * audioRecorderService.ts
 * Implements Wave 2 & Wave 3 STT / GCS upload contracts.
 *
 * Rules:
 * - MediaRecorder captures audio in WebM/Opus (Wave 2 §9.1)
 * - Frontend uploads directly to GCS via signed URL (Wave 3 §7.2)
 * - Frontend never sends transcript — backend owns STT (Wave 2 §2.2)
 * - Mic may NEVER silently activate; explicit visual state always shown
 * - Silence detection: 4 s of audio below RMS threshold triggers callback
 */

import { authFetch } from "@/utils/authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

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
  /** Fires when 3s of silence follows at least 2s of active speech — suggest auto-stop */
  onSilenceDetected?: () => void;
  /** Fires when expected_duration_ms elapses — nudge user to tap done */
  onDurationCap?: () => void;
  onUploadComplete?: (gcsUri: string, directiveId: string) => void;
  onError?: (message: string) => void;
}

const SILENCE_THRESHOLD_RMS = 0.01;
const SILENCE_DURATION_MS = 3000;     // 3 s silence → suggest auto-stop
const MIN_SPEECH_DURATION_MS = 2000;  // must have spoken ≥ 2 s before silence triggers

class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private state: RecordingState = "idle";
  private callbacks: RecordingCallbacks = {};
  private activeDirectiveId: string | null = null;
  private activeSessionId: string | null = null;
  private activeStudentId: string | null = null;

  // Silence detection
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private silenceCheckInterval: ReturnType<typeof setInterval> | null = null;

  // Speech tracking — we only auto-suggest stop if student has spoken enough
  private speechStartedAt: number | null = null;  // timestamp of first above-threshold sample
  private totalSpeechMs: number = 0;
  private lastSampleAt: number = 0;

  // Safety cap
  private durationCapTimer: ReturnType<typeof setTimeout> | null = null;

  private setState(s: RecordingState) {
    this.state = s;
    this.callbacks.onStateChange?.(s);
  }

  private clearSilenceDetection() {
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    if (this.silenceCheckInterval) { clearInterval(this.silenceCheckInterval); this.silenceCheckInterval = null; }
  }

  private clearDurationCap() {
    if (this.durationCapTimer) { clearTimeout(this.durationCapTimer); this.durationCapTimer = null; }
  }

  private startSilenceDetection() {
    if (!this.analyser) return;
    const data = new Float32Array(this.analyser.fftSize);
    let silenceStart: number | null = null;
    this.totalSpeechMs = 0;
    this.speechStartedAt = null;

    this.silenceCheckInterval = setInterval(() => {
      if (!this.analyser || this.state !== "recording") return;
      this.analyser.getFloatTimeDomainData(data);
      const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length);
      const now = Date.now();

      if (rms >= SILENCE_THRESHOLD_RMS) {
        // Student is speaking
        if (this.speechStartedAt === null) this.speechStartedAt = now;
        if (this.lastSampleAt > 0) this.totalSpeechMs += now - this.lastSampleAt;
        silenceStart = null;
      } else {
        // Silence
        if (silenceStart === null) silenceStart = now;
        const hasSpoken = this.totalSpeechMs >= MIN_SPEECH_DURATION_MS;
        if (hasSpoken && (now - silenceStart) >= SILENCE_DURATION_MS) {
          this.callbacks.onSilenceDetected?.();
          silenceStart = null; // reset so we don't spam
        }
      }
      this.lastSampleAt = now;
    }, 100);
  }

  /** Request mic permission (separate step so UI can show a prompt) */
  async requestPermission(): Promise<boolean> {
    this.setState("permission_request");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,          // Mono — Wave 2 §9.1
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      this.stream = stream;
      this.setState("ready");
      return true;
    } catch (err: any) {
      this.setState("error");
      const msg = err?.message || "Microphone permission denied";
      console.warn("[RecorderService] Permission failed:", err);
      this.callbacks.onError?.(msg);
      return false;
    }
  }

  /** Start recording for a specific directive */
  async start(
    directiveId: string,
    sessionId: string,
    studentId: string,
    callbacks: RecordingCallbacks,
    expectedDurationMs = 15000
  ): Promise<void> {
    if (this.state !== "idle" && this.state !== "completed" && this.state !== "error") {
      console.warn("[RecorderService] start called while in state:", this.state);
      // If we are in permission_request, we shouldn't start again, but we should allow it if it's the same directive
      if (this.activeDirectiveId === directiveId) return;
      // Otherwise, force stop the previous one
      this.stop();
    }
    
    console.log("[RecorderService] Starting recording for directive:", directiveId);
    this.callbacks = callbacks;
    this.activeDirectiveId = directiveId;
    this.activeSessionId = sessionId;
    this.activeStudentId = studentId;
    this.chunks = [];
    this.totalSpeechMs = 0;
    this.speechStartedAt = null;
    this.lastSampleAt = 0;

    // Ensure we have a stream
    if (!this.stream || !this.stream.active) {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    // Set up silence detection analyser
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      const source = this.audioCtx.createMediaStreamSource(this.stream!);
      source.connect(this.analyser);
    } catch (err) {
      console.warn("Non-fatal: silence detection is best-effort", err);
    }

    // Prefer WebM/Opus (Wave 2 §9.1)
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
      ? "audio/ogg;codecs=opus"
      : "audio/webm";

    try {
      this.mediaRecorder = new MediaRecorder(this.stream!, { mimeType });
    } catch {
      this.setState("error");
      callbacks.onError?.("MediaRecorder initialisation failed");
      return;
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => this.handleStop();
    this.mediaRecorder.start(250);
    this.setState("recording");
    this.startSilenceDetection();

    // Safety cap: fire onDurationCap after expected_duration_ms
    this.clearDurationCap();
    this.durationCapTimer = setTimeout(() => {
      if (this.state === "recording") {
        this.callbacks.onDurationCap?.();
      }
    }, expectedDurationMs);
  }

  /** Stop recording — triggers upload flow */
  stop() {
    this.clearDurationCap();
    if (this.mediaRecorder && this.state === "recording") {
      this.clearSilenceDetection();
      try {
        if (this.mediaRecorder.state !== "inactive") {
          this.mediaRecorder.stop();
        } else {
          this.handleStop();
        }
      } catch (e) {
        console.warn("Failed to stop MediaRecorder gracefully", e);
        this.handleStop();
      }
    }
  }

  private async handleStop() {
    const directiveId = this.activeDirectiveId;
    const sessionId = this.activeSessionId;
    const studentId = this.activeStudentId;
    if (!directiveId || this.chunks.length === 0) {
      this.setState("idle");
      return;
    }

    const mimeType = this.mediaRecorder?.mimeType || "audio/webm";
    const blob = new Blob(this.chunks, { type: mimeType });
    this.chunks = [];
    this.setState("uploading");

    try {
      // 1. Obtain signed upload URL from backend — spec: POST /session/{id}/audio-upload
      const uploadUrlEndpoint = sessionId
        ? `${API_BASE_URL}/english/session/${sessionId}/audio-upload`
        : `${API_BASE_URL}/english/session/audio-upload`;

      console.log("[RecorderService] Requesting Step A from:", uploadUrlEndpoint);

      const signedRes = await authFetch(uploadUrlEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directive_id: directiveId,
          mime_type: mimeType.split(";")[0], // Clean mime type (e.g. audio/webm)
          file_size: blob.size,
          file_size_bytes: blob.size,
          codec: mimeType.includes("opus") ? "opus" : "webm",
        }),
      });

      if (!signedRes.ok) {
        let errorMessage = `Server Error: ${signedRes.status}`;
        try {
          const errorData = await signedRes.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // If not JSON, try text
          const errorText = await signedRes.text().catch(() => "");
          if (errorText) errorMessage = errorText.slice(0, 100);
        }
        throw new Error(errorMessage);
      }
      
      const { upload_url, signed_url, gcs_uri, headers: responseHeaders } = await signedRes.json();
      const finalUploadUrl = upload_url || signed_url;
      if (!finalUploadUrl) throw new Error("No upload URL returned from backend");

      // 2. PUT directly to GCS (backend never proxies blobs)
      let uploadRes;
      try {
        const putHeaders: Record<string, string> = { "Content-Type": mimeType };
        // Spread headers from backend if provided (Wave 3 §7.2)
        if (responseHeaders) {
          Object.assign(putHeaders, responseHeaders);
        }

        console.log("[RecorderService] Uploading to GCS with headers:", putHeaders);

        uploadRes = await fetch(finalUploadUrl, {
          method: "PUT",
          headers: putHeaders,
          body: blob,
        });
      } catch (err: any) {
        throw new Error(`GCS Network Error: ${err?.message || "Failed to connect to storage"}. This might be a CORS issue.`);
      }

      if (!uploadRes.ok) throw new Error(`GCS upload failed: ${uploadRes.status}`);

      this.setState("processing");
      this.callbacks.onUploadComplete?.(gcs_uri, directiveId);
    } catch (err: any) {
      // Wave 4: upload failure → allow retry, never crash session
      this.setState("error");
      this.callbacks.onError?.(err?.message || "Upload failed");
    } finally {
      this.releaseStream();
    }
  }

  private releaseStream() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    try {
      this.audioCtx?.close();
    } catch {
      // ignore
    }
    this.audioCtx = null;
    this.analyser = null;
  }

  getState(): RecordingState {
    return this.state;
  }

  /** Call on tab unload / route change */
  destroy() {
    this.clearSilenceDetection();
    this.clearDurationCap();
    if (this.mediaRecorder && this.state === "recording") {
      try { this.mediaRecorder.stop(); } catch { /* ignore */ }
    }
    this.releaseStream();
    this.setState("idle");
  }
}

export const audioRecorderService = new AudioRecorderService();
