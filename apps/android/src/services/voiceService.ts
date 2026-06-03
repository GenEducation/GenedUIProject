/**
 * VoiceService — real-time bidirectional audio streaming over WebSocket.
 *
 * Ported from the web's voiceService.ts. Handles:
 *  - WebSocket connection to /ws/april-live-graph
 *  - Microphone capture via react-native-live-audio-stream → raw 16kHz PCM
 *  - Incoming audio playback via expo-av (PCM→WAV conversion)
 *  - Jitter buffer, reconnection, mute/unmute, typewriter text sync
 */
import LiveAudioStream from "react-native-live-audio-stream";
import { Audio } from "expo-av";
import { getToken } from "./storage";
import { Buffer } from "buffer";

// ── Types ────────────────────────────────────────────────────────────────────

export interface VoiceEvent {
  type: string;
  [key: string]: any;
}

type EventCallback = (event: VoiceEvent) => void;
type TextRevealCallback = (text: string, role: "user" | "assistant") => void;
type QualityCallback = (q: "good" | "poor" | "reconnecting") => void;

// ── Helpers ──────────────────────────────────────────────────────────────────

function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const newLength = Math.round(input.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const nextIndex = i * ratio;
    const index = Math.floor(nextIndex);
    const interpolation = nextIndex - index;
    const nextValue = index + 1 < input.length ? input[index + 1] : input[index];
    result[i] = input[index] + interpolation * (nextValue - input[index]);
  }
  return result;
}

/** Convert Int16 PCM data to a playable WAV ArrayBuffer */
function pcmToWav(pcmData: Int16Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const output = new Uint8Array(buffer);
  output.set(new Uint8Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength), 44);
  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ── VoiceService Class ───────────────────────────────────────────────────────

class VoiceService {
  private ws: WebSocket | null = null;
  private isSessionActive = false;
  private currentStudentId: string | null = null;
  private currentSessionId: string | null = null;
  private currentSubject: string | null = null;
  private currentVoice: string | null = null;
  private currentDocumentTitle: string | null = null;
  private currentAgentId: string | null = null;
  private currentGrade: number | null = null;
  private wsEndpoint = "/ws/april-live-graph";
  private onEventCallback: EventCallback | null = null;
  private onTextRevealCallback: TextRevealCallback | null = null;
  private onConnectionQualityCallback: QualityCallback | null = null;
  private isMuted = true;
  private micStarted = false;

  // Connection & Retry
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;
  private currentConnectionId: string | null = null;

  // Jitter Buffer
  private bufferQueue: ArrayBuffer[] = [];
  private isBuffering = true;
  private readonly TARGET_BUFFER_SIZE = 6;
  private playbackQueue: ArrayBuffer[] = [];
  private isPlaying = false;

  // Typewriter Sync
  private pendingAssistantText = "";
  private revealedAssistantText = "";
  private typewriterInterval: ReturnType<typeof setInterval> | null = null;

  // Connection Quality
  private starvationTimes: number[] = [];

  // ── Public API ─────────────────────────────────────────────────────────────

  async startSession(
    studentId: string,
    onEvent: EventCallback,
    onTextReveal: TextRevealCallback,
    sessionId?: string,
    subject?: string,
    voice?: string,
    documentTitle?: string,
    agentId?: string,
    grade?: number,
    onConnectionQuality?: QualityCallback,
  ) {
    this.currentStudentId = studentId;
    this.currentSessionId = sessionId || null;
    this.currentSubject = subject ?? null;
    this.currentVoice = voice ?? null;
    this.currentDocumentTitle = documentTitle ?? null;
    this.currentAgentId = agentId ?? null;
    this.currentGrade = grade ?? null;
    this.onEventCallback = onEvent;
    this.onTextRevealCallback = onTextReveal;
    this.onConnectionQualityCallback = onConnectionQuality || null;

    if (this.isSessionActive) {
      this.sendInitMessage();
      return;
    }

    this.isSessionActive = true;
    this.retryCount = 0;
    this.starvationTimes = [];
    this.pendingAssistantText = "";
    this.revealedAssistantText = "";

    // Configure audio session for playback + recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    const connId = Math.random().toString(36).substring(7);
    this.currentConnectionId = connId;

    const micOk = await this.initMicrophone();
    if (!micOk) {
      // Mic init failed — abort cleanly, no WebSocket, no retries
      this.isSessionActive = false;
      return;
    }
    this.connect(connId);
    this.startTypewriterLoop();
  }

  stopSession() {
    this.isSessionActive = false;
    this.currentStudentId = null;
    this.currentSessionId = null;
    this.currentSubject = null;
    this.currentVoice = null;
    this.currentDocumentTitle = null;
    this.currentAgentId = null;
    this.currentGrade = null;
    this.pendingAssistantText = "";
    this.revealedAssistantText = "";

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.stopMicrophone();

    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }

    this.isBuffering = true;
    this.bufferQueue = [];
    this.playbackQueue = [];
    this.isPlaying = false;
    this.starvationTimes = [];
    this.onEventCallback = null;
    this.onTextRevealCallback = null;
    this.onConnectionQualityCallback = null;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  getSessionId(): string | null {
    return this.currentSessionId;
  }

  // ── Microphone ─────────────────────────────────────────────────────────────

  /** Returns true on success, false on any failure (caller should abort session). */
  private async initMicrophone(): Promise<boolean> {
    if (this.micStarted) return true;

    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        this.onEventCallback?.({ type: "error", error: "mic_permission_denied", message: "Microphone permission denied." });
        return false;
      }

      LiveAudioStream.init({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6, // VOICE_COMMUNICATION — enables echo cancellation on Android
        bufferSize: 4096,
      });

      LiveAudioStream.on("data", (base64: string) => {
        if (!this.isSessionActive || this.ws?.readyState !== WebSocket.OPEN) return;

        // Decode base64 → Int16 PCM
        const raw = Buffer.from(base64, "base64");
        const i16 = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);

        if (this.isMuted) {
          // Send silence when muted
          const silence = new Int16Array(i16.length);
          this.ws!.send(silence.buffer);
        } else {
          this.ws!.send(i16.buffer);
        }
      });

      LiveAudioStream.start();
      this.micStarted = true;
      return true;
    } catch (err) {
      console.error("[VoiceService] Mic init error:", err);
      this.onEventCallback?.({ type: "error", error: "mic_init_failed", message: "Could not start microphone. Please check permissions and try again." });
      return false;
    }
  }

  private stopMicrophone() {
    if (!this.micStarted) return;
    try {
      LiveAudioStream.stop();
    } catch {}
    this.micStarted = false;
  }

  // ── WebSocket ──────────────────────────────────────────────────────────────

  private async connect(connId: string) {
    if (!this.isSessionActive || !this.currentStudentId || this.currentConnectionId !== connId) return;

    const apiBase = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
    const wsBase = apiBase.replace(/^http/, "ws");
    const token = await getToken();
    const endpoint = this.wsEndpoint.startsWith("/") ? this.wsEndpoint : `/${this.wsEndpoint}`;
    const wsUrl = `${wsBase}${endpoint}?token=${token || ""}&user_id=${this.currentStudentId}`;

    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      const wasReconnecting = this.retryCount > 0;
      this.retryCount = 0;
      this.starvationTimes = [];
      this.sendInitMessage();
      this.onEventCallback?.({ type: "connected" });
      if (wasReconnecting) this.onConnectionQualityCallback?.("good");
    };

    this.ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data);

          if (data.error === "rate_limit_exceeded") {
            const callback = this.onEventCallback;
            this.stopSession();
            callback?.({
              type: "error",
              error: "rate_limit_exceeded",
              message: "Daily rate limit reached. Upgrade to Pro for more.",
            });
            return;
          }

          if (data.type === "session_id" && data.session_id) {
            this.currentSessionId = data.session_id;
          }

          if (data.type === "transcript") {
            if (data.role === "user") {
              this.onTextRevealCallback?.(data.content, "user");
            } else {
              this.pendingAssistantText += (this.pendingAssistantText ? " " : "") + data.content;
            }
          }

          this.onEventCallback?.(data);
        } catch (err) {
          console.error("[VoiceService] JSON parse error:", event.data);
        }
      } else if (event.data instanceof ArrayBuffer) {
        this.handleIncomingAudio(event.data);
      }
    };

    this.ws.onclose = () => {
      if (this.isSessionActive && this.retryCount < this.MAX_RETRIES && this.currentConnectionId === connId) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount - 1) * 1000;
        this.onConnectionQualityCallback?.("reconnecting");
        setTimeout(() => this.connect(connId), delay);
      } else {
        if (this.retryCount >= this.MAX_RETRIES) {
          this.onEventCallback?.({ type: "error", error: "Connection lost. Please try again." });
          this.stopSession();
        } else {
          this.onEventCallback?.({ type: "disconnected" });
        }
      }
    };

    this.ws.onerror = (err) => {
      console.error("[VoiceService] WS error:", err);
    };
  }

  private async sendInitMessage() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const token = await getToken();
    const payload: Record<string, any> = {
      type: "init",
      student_id: this.currentStudentId,
      session_id: this.currentSessionId,
      subject: this.currentSubject,
      voice: this.currentVoice,
      token,
    };
    if (this.currentDocumentTitle) payload.document_title = this.currentDocumentTitle;
    if (this.currentAgentId) payload.agent_id = this.currentAgentId;
    if (this.currentGrade != null) payload.grade = this.currentGrade;
    this.ws.send(JSON.stringify(payload));
  }

  // ── Audio Playback ─────────────────────────────────────────────────────────

  private handleIncomingAudio(buffer: ArrayBuffer) {
    if (!this.isSessionActive) return;

    if (this.isBuffering) {
      this.bufferQueue.push(buffer);
      if (this.bufferQueue.length >= this.TARGET_BUFFER_SIZE) {
        this.isBuffering = false;
        this.flushBuffer();
      }
      return;
    }

    this.enqueuePlayback(buffer);
  }

  private flushBuffer() {
    while (this.bufferQueue.length > 0) {
      this.enqueuePlayback(this.bufferQueue.shift()!);
    }
  }

  private enqueuePlayback(buffer: ArrayBuffer) {
    this.playbackQueue.push(buffer);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private async playNext() {
    if (this.playbackQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;

    // Concatenate several frames for smoother playback (fewer Sound objects)
    const frames: ArrayBuffer[] = [];
    const maxFrames = Math.min(this.playbackQueue.length, 10);
    for (let i = 0; i < maxFrames; i++) {
      frames.push(this.playbackQueue.shift()!);
    }

    // Merge into single Int16Array
    const totalLength = frames.reduce((sum, f) => sum + f.byteLength / 2, 0);
    const merged = new Int16Array(totalLength);
    let offset = 0;
    for (const frame of frames) {
      const chunk = new Int16Array(frame);
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to WAV and play
    const wavBuffer = pcmToWav(merged, 24000);
    const base64Wav = arrayBufferToBase64(wavBuffer);
    const uri = `data:audio/wav;base64,${base64Wav}`;

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          this.playNext();
        }
      });
    } catch (err) {
      console.error("[VoiceService] Playback error:", err);
      this.playNext();
    }
  }

  // ── Typewriter Sync ────────────────────────────────────────────────────────

  private startTypewriterLoop() {
    if (this.typewriterInterval) return;

    this.typewriterInterval = setInterval(() => {
      if (!this.isSessionActive) {
        if (this.typewriterInterval) clearInterval(this.typewriterInterval);
        this.typewriterInterval = null;
        return;
      }

      const remaining = this.pendingAssistantText.substring(this.revealedAssistantText.length);
      if (remaining.length === 0) return;

      // Reveal ~40 chars/sec when audio is playing, burst all if no audio queued
      const hasAudio = this.isPlaying || this.playbackQueue.length > 0 || this.isBuffering;
      const charsToReveal = hasAudio ? Math.max(1, Math.ceil(40 * 0.05)) : remaining.length;
      const nextChars = remaining.substring(0, charsToReveal);
      this.revealedAssistantText += nextChars;
      this.onTextRevealCallback?.(nextChars, "assistant");
    }, 50); // 20 fps
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const voiceService = new VoiceService();
