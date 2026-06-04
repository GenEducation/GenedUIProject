/**
 * VoiceService — real-time bidirectional audio over WebSocket.
 *
 * Uses react-native-audio-api (Web Audio API port by Software Mansion) for
 * both directions — a near-verbatim port of the website's voiceService.ts:
 *
 *   INPUT:  AudioRecorder → 16kHz mono Float32 → Int16 → ws.send(binary)
 *   OUTPUT: ws binary → Int16 → Float32 → AudioContext.createBuffer →
 *           AudioBufferSourceNode.start(scheduledTime)  [gapless jitter buffer]
 *
 * This replaces the previous expo-audio / temp-WAV-file approach which was
 * too slow for realtime PCM streaming.
 */
import {
  AudioContext,
  AudioRecorder,
  AudioManager,
} from "react-native-audio-api";
import { getToken } from "./storage";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VoiceEvent {
  type: string;
  [key: string]: any;
}

type EventCallback      = (event: VoiceEvent) => void;
type TextRevealCallback = (text: string, role: "user" | "assistant") => void;
type QualityCallback    = (q: "good" | "poor" | "reconnecting") => void;

// ── VoiceService ──────────────────────────────────────────────────────────────

class VoiceService {
  // WebSocket
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

  // Microphone
  private recorder: AudioRecorder | null = null;
  private isMuted = true;

  // Playback (Web Audio API — mirrors web jitter buffer exactly)
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private bufferQueue: ArrayBuffer[] = [];
  private isBuffering = true;
  private readonly TARGET_BUFFER_SIZE = 6;

  // Typewriter sync
  private pendingAssistantText = "";
  private revealedAssistantText = "";
  private typewriterInterval: ReturnType<typeof setInterval> | null = null;

  // Connection & retry
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;
  private currentConnectionId: string | null = null;

  // Connection quality
  private starvationTimes: number[] = [];

  // ── Public API ────────────────────────────────────────────────────────────

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

    if (this.isSessionActive) { this.sendInitMessage(); return; }

    this.isSessionActive = true;
    this.retryCount = 0;
    this.starvationTimes = [];
    this.pendingAssistantText = "";
    this.revealedAssistantText = "";

    // Request microphone permission.
    // Native returns a capitalized PermissionStatus ('Granted' | 'Denied' | 'Undetermined'),
    // so compare case-insensitively.
    const perm = await AudioManager.requestRecordingPermissions();
    if (String(perm).toLowerCase() !== "granted") {
      this.isSessionActive = false;
      this.onEventCallback?.({ type: "error", error: "mic_permission_denied", message: "Microphone permission denied." });
      return;
    }

    // Set audio session for recording + playback (iOS routing; no-op on Android)
    AudioManager.setAudioSessionOptions({
      iosCategory: "playAndRecord",
      iosMode: "voiceChat",
      iosOptions: ["defaultToSpeaker", "allowBluetoothHFP"],
    });

    // Create AudioContext for 24kHz playback (matches backend output)
    this.audioCtx = new AudioContext({ sampleRate: 24000 });
    this.nextStartTime = this.audioCtx.currentTime;

    // Start microphone recorder (16kHz → backend input)
    this.recorder = new AudioRecorder();
    this.recorder.onAudioReady(
      { sampleRate: 16000, channelCount: 1, bufferLength: 4096 },
      ({ buffer }) => {
        if (!this.isSessionActive || this.ws?.readyState !== WebSocket.OPEN) return;

        const float32 = buffer.getChannelData(0);

        if (this.isMuted) {
          // Send silence when muted (keeps backend VAD timing)
          const silence = new Int16Array(float32.length);
          this.ws!.send(silence.buffer);
        } else {
          // Float32 [-1,1] → Int16 [-32767,32767]
          const i16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            i16[i] = Math.max(-1, Math.min(1, float32[i])) * 0x7fff;
          }
          this.ws!.send(i16.buffer);
        }
      },
    );
    this.recorder.start();

    const connId = Math.random().toString(36).substring(7);
    this.currentConnectionId = connId;
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

    if (this.ws) { this.ws.close(); this.ws = null; }

    // Stop recorder
    if (this.recorder) {
      try { this.recorder.stop(); } catch {}
      this.recorder = null;
    }

    // Close AudioContext
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }

    if (this.typewriterInterval) { clearInterval(this.typewriterInterval); this.typewriterInterval = null; }

    this.isBuffering = true;
    this.bufferQueue = [];
    this.nextStartTime = 0;
    this.starvationTimes = [];
    this.onEventCallback = null;
    this.onTextRevealCallback = null;
    this.onConnectionQualityCallback = null;
  }

  async setMuted(muted: boolean) {
    this.isMuted = muted;
    // isMuted flag is read inside onAudioReady — no need to stop/start recorder.
    // When muted, we send silence frames; when unmuted, real PCM.
    // This avoids all start/stop races on Android MediaRecorder.
  }

  getSessionId() { return this.currentSessionId; }

  // ── WebSocket ─────────────────────────────────────────────────────────────

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
      // Reset jitter buffer on reconnect
      this.isBuffering = true;
      this.bufferQueue = [];
      if (this.audioCtx) this.nextStartTime = this.audioCtx.currentTime;
      this.sendInitMessage();
      this.onEventCallback?.({ type: "connected" });
      if (wasReconnecting) this.onConnectionQualityCallback?.("good");
    };

    this.ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data);

          if (data.error === "rate_limit_exceeded") {
            const cb = this.onEventCallback;
            this.stopSession();
            cb?.({ type: "error", error: "rate_limit_exceeded", message: "Daily rate limit reached. Upgrade to Pro for more." });
            return;
          }

          if (data.type === "session_id" && data.session_id) this.currentSessionId = data.session_id;

          if (data.type === "transcript") {
            if (data.role === "user") {
              this.onTextRevealCallback?.(data.content, "user");
            } else {
              this.pendingAssistantText += (this.pendingAssistantText ? " " : "") + data.content;
            }
          }

          this.onEventCallback?.(data);
        } catch { console.warn("[VoiceService] JSON parse error"); }

      } else {
        // Binary frame — handle as ArrayBuffer or Blob
        if (event.data instanceof ArrayBuffer) {
          this.handleIncomingAudio(event.data);
        } else if (typeof (event.data as any)?.arrayBuffer === "function") {
          // React Native may deliver Blob on some devices
          (event.data as Blob).arrayBuffer().then((buf) => this.handleIncomingAudio(buf));
        }
      }
    };

    this.ws.onclose = () => {
      if (this.isSessionActive && this.retryCount < this.MAX_RETRIES && this.currentConnectionId === connId) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount - 1) * 1000;
        this.onConnectionQualityCallback?.("reconnecting");
        setTimeout(() => this.connect(connId), delay);
      } else if (this.retryCount >= this.MAX_RETRIES) {
        this.onEventCallback?.({ type: "error", error: "max_retries", message: "Connection lost. Please try again." });
        this.stopSession();
      } else {
        this.onEventCallback?.({ type: "disconnected" });
      }
    };

    this.ws.onerror = () => console.warn("[VoiceService] WS error");
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

  // ── Audio Playback (mirrors web voiceService.ts lines ~300-345) ───────────

  private handleIncomingAudio(buffer: ArrayBuffer) {
    if (!this.isSessionActive || !this.audioCtx) return;

    const currentTime = this.audioCtx.currentTime;

    // Jitter buffer starvation recovery (same as web)
    if (!this.isBuffering && this.nextStartTime < currentTime - 0.05) {
      console.warn(`[VoiceService] Jitter buffer starved. Re-buffering...`);
      this.isBuffering = true;
      this.nextStartTime = currentTime;
      const now = Date.now();
      this.starvationTimes = this.starvationTimes.filter((t) => now - t < 10_000);
      this.starvationTimes.push(now);
      if (this.starvationTimes.length >= 2) this.onConnectionQualityCallback?.("poor");
    }

    if (this.isBuffering) {
      this.bufferQueue.push(buffer);
      if (this.bufferQueue.length >= this.TARGET_BUFFER_SIZE) {
        this.isBuffering = false;
        this.flushBuffer();
      }
      return;
    }

    this.scheduleAudioFrame(buffer);
  }

  private flushBuffer() {
    while (this.bufferQueue.length > 0) this.scheduleAudioFrame(this.bufferQueue.shift()!);
  }

  private scheduleAudioFrame(buffer: ArrayBuffer) {
    if (!this.audioCtx) return;

    // Int16 → Float32  (mirrors web: int16[i] / 0x7FFF)
    const int16 = new Int16Array(buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 0x7fff;
    }

    // Create AudioBuffer at 24kHz (server output rate)
    const audioBuf = this.audioCtx.createBuffer(1, float32.length, 24000);
    audioBuf.getChannelData(0).set(float32);

    // Schedule gapless playback (same as web)
    const src = this.audioCtx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(this.audioCtx.destination);

    const startTime = Math.max(this.audioCtx.currentTime, this.nextStartTime);
    src.start(startTime);
    this.nextStartTime = startTime + audioBuf.duration;
  }

  // ── Typewriter Sync ───────────────────────────────────────────────────────

  private startTypewriterLoop() {
    if (this.typewriterInterval) return;
    this.typewriterInterval = setInterval(() => {
      if (!this.isSessionActive) { clearInterval(this.typewriterInterval!); this.typewriterInterval = null; return; }
      const remaining = this.pendingAssistantText.substring(this.revealedAssistantText.length);
      if (!remaining.length) return;
      // Sync text reveal with audio: ~40 chars/s when audio queued, burst otherwise
      const count = (this.bufferQueue.length > 0 || !this.isBuffering)
        ? Math.max(1, Math.ceil(40 * 0.05))
        : remaining.length;
      const next = remaining.substring(0, count);
      this.revealedAssistantText += next;
      this.onTextRevealCallback?.(next, "assistant");
    }, 50);
  }
}

export const voiceService = new VoiceService();
