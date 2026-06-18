/**
 * VoiceService — real-time bidirectional audio over WebSocket.
 *
 *   INPUT:  react-native-live-audio-stream → 16kHz mono PCM16 (base64) → ws.send(binary)
 *   OUTPUT: ws binary → Int16 → Float32 → AudioContext.createBuffer →
 *           AudioBufferSourceNode.start(scheduledTime)  [gapless jitter buffer]
 */
import {
  AudioContext,
  AudioManager,
  type AudioBufferSourceNode,
} from "react-native-audio-api";
import LiveAudioStream from "react-native-live-audio-stream";
import { DeviceEventEmitter } from "react-native";
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

  // Microphone (react-native-live-audio-stream)
  private audioSubscription: any = null;
  private isMuted = true;
  private isRecording = false;
  // The backend's first receive() on a new connection is receive_json(), expecting
  // the `init` TEXT frame. We must NOT send any binary (mic) frame until init has
  // been sent on the current socket, or the backend crashes with KeyError: 'text'.
  private audioReadyToSend = false;

  // Playback (Web Audio API — mirrors web jitter buffer exactly)
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private bufferQueue: ArrayBuffer[] = [];
  private isBuffering = true;
  private readonly TARGET_BUFFER_SIZE = 6;
  // Finished playback nodes must be disconnected explicitly — RN's native audio
  // graph does not GC them like browsers do, so they accumulate and cause
  // progressive jitter over long sessions.
  private activeSources = new Set<AudioBufferSourceNode>();

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
    this.isMuted = true;
    this.retryCount = 0;
    this.starvationTimes = [];
    this.pendingAssistantText = "";
    this.revealedAssistantText = "";

    // Request microphone permission.
    const perm = await AudioManager.requestRecordingPermissions();
    if (String(perm).toLowerCase() !== "granted") {
      this.isSessionActive = false;
      this.onEventCallback?.({ type: "error", error: "mic_permission_denied", message: "Microphone permission denied." });
      return;
    }

    // Set audio session (iOS routing; on Android forces speaker output)
    AudioManager.setAudioSessionOptions({
      iosCategory: "playAndRecord",
      iosMode: "voiceChat",
      iosOptions: ["defaultToSpeaker", "allowBluetoothHFP"],
    });

    // Create AudioContext for 24kHz playback (matches backend output).
    // Must call resume() — AudioContext starts suspended per Web Audio API spec.
    this.audioCtx = new AudioContext({ sampleRate: 24000 });
    await this.audioCtx.resume();
    this.nextStartTime = this.audioCtx.currentTime;

    // Start microphone via react-native-live-audio-stream (reliable PCM16 on Android)
    LiveAudioStream.init({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      bufferSize: 4096,
    });

    this.audioSubscription = DeviceEventEmitter.addListener("data", (base64Data: string) => {
      // Block all binary until init has been sent on the current socket, otherwise
      // the backend's first receive_json() gets binary and crashes the connection.
      if (!this.isSessionActive || this.ws?.readyState !== WebSocket.OPEN || !this.audioReadyToSend) {
        return;
      }

      const pcmBuffer = this.decodeBase64(base64Data);

      if (this.isMuted) {
        // Send silence of same length (keeps backend VAD timing)
        this.ws!.send(new ArrayBuffer(pcmBuffer.byteLength));
      } else {
        this.ws!.send(pcmBuffer);
      }
    });

    LiveAudioStream.start();
    this.isRecording = true;

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

    this.audioReadyToSend = false;
    if (this.ws) { this.ws.close(); this.ws = null; }

    // Stop LiveAudioStream recorder
    if (this.isRecording) {
      try { LiveAudioStream.stop(); } catch {}
      this.isRecording = false;
    }
    if (this.audioSubscription) {
      try { this.audioSubscription.remove(); } catch {}
      this.audioSubscription = null;
    }

    // Stop & disconnect any in-flight playback nodes before closing the context
    this.stopAllSources();

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

    // New socket: block mic uplink until we've sent the init frame on it.
    this.audioReadyToSend = false;
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      const wasReconnecting = this.retryCount > 0;
      console.log(`[VoiceService] WS OPEN (reconnect=${wasReconnecting}, connId=${connId})`);
      this.retryCount = 0;
      this.starvationTimes = [];
      // Kill any audio still scheduled from the dropped connection before
      // resetting the jitter buffer, so stale speech can't overlap the new stream.
      this.stopAllSources();
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
        // Binary frame — audio from backend
        if (event.data instanceof ArrayBuffer) {
          this.handleIncomingAudio(event.data);
        } else if (typeof (event.data as any)?.arrayBuffer === "function") {
          (event.data as Blob).arrayBuffer().then((buf) => this.handleIncomingAudio(buf));
        }
      }
    };

    this.ws.onclose = (e: any) => {
      console.log(`[VoiceService] WS CLOSE — code=${e?.code}, reason=${e?.reason || "(none)"}, retryCount=${this.retryCount}, sessionActive=${this.isSessionActive}`);
      if (this.isSessionActive && this.retryCount < this.MAX_RETRIES && this.currentConnectionId === connId) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount - 1) * 1000;
        console.log(`[VoiceService] reconnecting in ${delay}ms (attempt ${this.retryCount}/${this.MAX_RETRIES})`);
        this.onConnectionQualityCallback?.("reconnecting");
        setTimeout(() => this.connect(connId), delay);
      } else if (this.retryCount >= this.MAX_RETRIES) {
        console.log(`[VoiceService] MAX RETRIES reached — tearing down session (mic will stop)`);
        this.onEventCallback?.({ type: "error", error: "max_retries", message: "Connection lost. Please try again." });
        this.stopSession();
      } else {
        this.onEventCallback?.({ type: "disconnected" });
      }
    };

    this.ws.onerror = (e: any) => console.warn(`[VoiceService] WS error: ${e?.message ?? ""}`);
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
    // Re-check OPEN: the await above may have spanned a close/reconnect.
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
    // Init is now the first frame on this socket — mic binary may flow.
    this.audioReadyToSend = true;
  }

  // ── Audio Playback ────────────────────────────────────────────────────────

  private stopAllSources() {
    for (const src of this.activeSources) {
      try { src.stop(); } catch {}
      try { src.disconnect(); } catch {}
    }
    this.activeSources.clear();
  }

  private handleIncomingAudio(buffer: ArrayBuffer) {
    if (!this.isSessionActive || !this.audioCtx) return;

    const currentTime = this.audioCtx.currentTime;

    if (!this.isBuffering && this.nextStartTime < currentTime - 0.05) {
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

    const int16 = new Int16Array(buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 0x7fff;
    }

    const audioBuf = this.audioCtx.createBuffer(1, float32.length, 24000);
    audioBuf.getChannelData(0).set(float32);

    const src = this.audioCtx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(this.audioCtx.destination);

    // Track the node and disconnect it once it finishes so the native audio
    // graph doesn't accumulate dead nodes (cause of long-session jitter).
    // NOTE: react-native-audio-api uses `onEnded` (capital E), not the
    // Web-standard `onended` — the lowercase form silently never fires.
    this.activeSources.add(src);
    src.onEnded = () => {
      try { src.disconnect(); } catch {}
      this.activeSources.delete(src);
    };

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
      const count = (this.bufferQueue.length > 0 || !this.isBuffering)
        ? Math.max(1, Math.ceil(40 * 0.05))
        : remaining.length;
      const next = remaining.substring(0, count);
      this.revealedAssistantText += next;
      this.onTextRevealCallback?.(next, "assistant");
    }, 50);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private decodeBase64(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const voiceService = new VoiceService();
