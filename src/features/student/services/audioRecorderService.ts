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
  onSilenceDetected?: () => void;
  onUploadComplete?: (gcsUri: string, directiveId: string) => void;
  onError?: (message: string) => void;
}

const SILENCE_THRESHOLD_RMS = 0.01;
const SILENCE_DURATION_MS = 4000;

class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private state: RecordingState = "idle";
  private callbacks: RecordingCallbacks = {};
  private activeDirectiveId: string | null = null;

  // Silence detection
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private silenceCheckInterval: ReturnType<typeof setInterval> | null = null;

  private setState(s: RecordingState) {
    this.state = s;
    this.callbacks.onStateChange?.(s);
  }

  private clearSilenceDetection() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
      this.silenceCheckInterval = null;
    }
  }

  private startSilenceDetection() {
    if (!this.analyser) return;
    const data = new Float32Array(this.analyser.fftSize);
    let silenceStart: number | null = null;

    this.silenceCheckInterval = setInterval(() => {
      if (!this.analyser || this.state !== "recording") return;
      this.analyser.getFloatTimeDomainData(data);
      const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length);

      if (rms < SILENCE_THRESHOLD_RMS) {
        if (silenceStart === null) silenceStart = Date.now();
        else if (Date.now() - silenceStart >= SILENCE_DURATION_MS) {
          this.callbacks.onSilenceDetected?.();
          silenceStart = null; // reset so we don't spam
        }
      } else {
        silenceStart = null;
      }
    }, 200);
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
    } catch {
      this.setState("error");
      this.callbacks.onError?.("Microphone permission denied");
      return false;
    }
  }

  /** Start recording for a specific directive */
  async start(directiveId: string, callbacks: RecordingCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.activeDirectiveId = directiveId;
    this.chunks = [];

    // Ensure we have a stream
    if (!this.stream || !this.stream.active) {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    // Set up silence detection analyser
    try {
      this.audioCtx = new AudioContext();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      const source = this.audioCtx.createMediaStreamSource(this.stream!);
      source.connect(this.analyser);
    } catch {
      // Non-fatal: silence detection is best-effort
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

    this.mediaRecorder.start(250); // collect in 250ms chunks
    this.setState("recording");
    this.startSilenceDetection();
  }

  /** Stop recording — triggers upload flow */
  stop() {
    if (this.mediaRecorder && this.state === "recording") {
      this.clearSilenceDetection();
      this.mediaRecorder.stop();
      // onstop → handleStop
    }
  }

  private async handleStop() {
    const directiveId = this.activeDirectiveId;
    if (!directiveId || this.chunks.length === 0) {
      this.setState("idle");
      return;
    }

    const blob = new Blob(this.chunks, { type: "audio/webm" });
    this.chunks = [];
    this.setState("uploading");

    try {
      // 1. Obtain signed upload URL from backend (Wave 3 §7.2)
      const signedRes = await authFetch(
        `${API_BASE_URL}/session/audio-upload-url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ directive_id: directiveId }),
        }
      );

      if (!signedRes.ok) throw new Error("Failed to get upload URL");
      const { signed_url, gcs_uri } = await signedRes.json();

      // 2. PUT directly to GCS (Wave 3 §7.1 — backend never proxies blobs)
      const uploadRes = await fetch(signed_url, {
        method: "PUT",
        headers: { "Content-Type": "audio/webm" },
        body: blob,
      });

      if (!uploadRes.ok) throw new Error("GCS upload failed");

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
    if (this.mediaRecorder && this.state === "recording") {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.releaseStream();
    this.setState("idle");
  }
}

export const audioRecorderService = new AudioRecorderService();
