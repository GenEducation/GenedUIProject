/**
 * VoiceService — real-time bidirectional audio over WebSocket.
 *
 *   INPUT:  VoiceAudioEngine (native, AEC3-cleaned 16kHz mono PCM16, base64) → ws.send(binary)
 *   OUTPUT: ws binary (24kHz PCM16) → VoiceAudioEngine.pushFarend (native gapless playback
 *           + AEC3 reference)
 *
 * Mic capture and speaker playback are owned by a single native module (VoiceAudioEngine)
 * so the WebRTC AudioProcessingModule (AEC3) sees the near-end and far-end signals
 * time-aligned and cancels the AI's voice from the mic on every device — independent of
 * whether the hardware HAL exposes AcousticEchoCanceler. This enables true full-duplex.
 */
import { AudioManager } from "react-native-audio-api";
import { DeviceEventEmitter, NativeModules } from "react-native";
import { getToken } from "./storage";

const { VoiceAudioEngine } = NativeModules as {
  VoiceAudioEngine: {
    start(): Promise<boolean>;
    stop(): Promise<boolean>;
    pushFarend(base64: string): void;
    flush(): void;
  };
};

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

  // Microphone (native VoiceAudioEngine "data" event — AEC3-cleaned PCM16)
  private audioSubscription: any = null;
  private isMuted = true;
  private isRecording = false;
  // The backend's first receive() on a new connection is receive_json(), expecting
  // the `init` TEXT frame. We must NOT send any binary (mic) frame until init has
  // been sent on the current socket, or the backend crashes with KeyError: 'text'.
  private audioReadyToSend = false;

  // aiSpeaking tracks whether the AI is currently outputting audio, driven by server
  // events (turn_complete) rather than a playback clock. With AEC3 the mic is never gated
  // on it — this is UI state only (orb animation, interrupt affordance).
  private aiSpeaking = false;
  private aiHangoverTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly AI_HANGOVER_MS = 1500;

  // Typewriter sync
  private pendingAssistantText = "";
  private revealedAssistantText = "";
  private typewriterInterval: ReturnType<typeof setInterval> | null = null;

  // Connection & retry
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;
  private currentConnectionId: string | null = null;

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
    this.pendingAssistantText = "";
    this.revealedAssistantText = "";

    // Request microphone permission.
    const perm = await AudioManager.requestRecordingPermissions();
    if (String(perm).toLowerCase() !== "granted") {
      this.isSessionActive = false;
      this.onEventCallback?.({ type: "error", error: "mic_permission_denied", message: "Microphone permission denied." });
      return;
    }

    // Voice-communication routing (forces speaker output on Android, AEC-friendly mode).
    AudioManager.setAudioSessionOptions({
      iosCategory: "playAndRecord",
      iosMode: "voiceChat",
      iosOptions: ["defaultToSpeaker", "allowBluetoothHFP"],
    });

    // Start the unified native engine: owns AudioRecord (16kHz mic) + AudioTrack (24kHz
    // playback) with WebRTC AEC3 between them. Emits AEC3-cleaned mic frames as the "data"
    // DeviceEventEmitter event (same shape the old mic library used).
    if (!VoiceAudioEngine || typeof VoiceAudioEngine.start !== "function") {
      // Native module isn't in this build (registration stripped, or app not rebuilt).
      // Distinct from an engine start failure so the cause is obvious from the message.
      this.isSessionActive = false;
      this.onEventCallback?.({
        type: "error",
        error: "voice_engine_missing",
        message: "Voice engine native module not found — rebuild the app (npx expo run:android).",
      });
      return;
    }
    try {
      await VoiceAudioEngine.start();
    } catch (e: any) {
      this.isSessionActive = false;
      this.onEventCallback?.({ type: "error", error: "voice_engine_failed", message: e?.message || "Could not start audio engine." });
      return;
    }

    this.audioSubscription = DeviceEventEmitter.addListener("data", (base64Data: string) => {
      if (!this.isSessionActive || this.ws?.readyState !== WebSocket.OPEN || !this.audioReadyToSend) {
        return;
      }

      if (this.isMuted) {
        // User-controlled mute: send silence sized to the frame.
        const bytes = this.base64ByteLength(base64Data);
        this.ws!.send(new ArrayBuffer(bytes));
      } else {
        // Full-duplex: send the AEC3-cleaned mic frame. The AI's voice has already been
        // removed natively, so it is never transcribed back as user input.
        this.ws!.send(this.decodeBase64(base64Data));
      }
    });
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

    // Tear down the native engine (mic + playback + APM).
    if (this.isRecording) {
      try { VoiceAudioEngine.stop(); } catch {}
      this.isRecording = false;
    }
    if (this.audioSubscription) {
      try { this.audioSubscription.remove(); } catch {}
      this.audioSubscription = null;
    }

    if (this.typewriterInterval) { clearInterval(this.typewriterInterval); this.typewriterInterval = null; }

    this.aiSpeaking = false;
    if (this.aiHangoverTimer) { clearTimeout(this.aiHangoverTimer); this.aiHangoverTimer = null; }
    this.onEventCallback = null;
    this.onTextRevealCallback = null;
    this.onConnectionQualityCallback = null;
  }

  async setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  sendInterrupt() {
    // Optimistically clear playback client-side first, then notify server.
    this.interruptPlayback();
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "interrupt" }));
    }
  }

  private interruptPlayback() {
    try { VoiceAudioEngine.flush(); } catch {}
    this.aiSpeaking = false;
    if (this.aiHangoverTimer) { clearTimeout(this.aiHangoverTimer); this.aiHangoverTimer = null; }
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
      // Drop any audio still playing from the dropped connection so stale speech can't
      // overlap the new stream.
      this.interruptPlayback();
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

          if (data.type === "interrupted") {
            this.interruptPlayback();
            // The student barged in: drop the unheard tail so it can't leak into a
            // new bubble, and forward the event so the hook finalizes the current
            // bubble (clearing its message ref). Previously this returned early, so
            // the hook never finalized → next turn merged into the old bubble.
            this.pendingAssistantText = "";
            this.revealedAssistantText = "";
            this.onEventCallback?.(data);
            return;
          }

          if (data.type === "turn_complete") {
            // Turn finished and the full text exists. Flush any tail the typewriter
            // hasn't revealed yet INTO the current bubble, then reset buffers so
            // nothing leaks into the next turn's bubble (which caused the split).
            const tail = this.pendingAssistantText.substring(this.revealedAssistantText.length);
            if (tail) this.onTextRevealCallback?.(tail, "assistant");
            this.pendingAssistantText = "";
            this.revealedAssistantText = "";
            // Schedule aiSpeaking=false after a short hangover so the UI's speaking
            // state covers the playback tail. Cancelled if more audio arrives.
            if (this.aiHangoverTimer) clearTimeout(this.aiHangoverTimer);
            this.aiHangoverTimer = setTimeout(() => {
              this.aiSpeaking = false;
              this.aiHangoverTimer = null;
            }, this.AI_HANGOVER_MS);
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

  // ── Audio Playback (native) ─────────────────────────────────────────────────

  private handleIncomingAudio(buffer: ArrayBuffer) {
    if (!this.isSessionActive) return;

    // Mark AI as speaking and cancel any pending hangover — new audio means the turn
    // isn't over yet, so back-to-back turns keep the UI in the speaking state.
    this.aiSpeaking = true;
    if (this.aiHangoverTimer) { clearTimeout(this.aiHangoverTimer); this.aiHangoverTimer = null; }

    // Hand the 24kHz PCM16 frame to the native engine: it plays it gaplessly AND feeds it
    // to AEC3 as the echo reference.
    try { VoiceAudioEngine.pushFarend(this.encodeBase64(buffer)); } catch {}
  }

  // ── Typewriter Sync ───────────────────────────────────────────────────────

  private startTypewriterLoop() {
    if (this.typewriterInterval) return;
    this.typewriterInterval = setInterval(() => {
      if (!this.isSessionActive) { clearInterval(this.typewriterInterval!); this.typewriterInterval = null; return; }
      const remaining = this.pendingAssistantText.substring(this.revealedAssistantText.length);
      if (!remaining.length) return;
      // Reveal while the AI is speaking; flush the rest once the turn ends.
      const count = this.aiSpeaking ? Math.max(1, Math.ceil(40 * 0.05)) : remaining.length;
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

  private base64ByteLength(base64: string): number {
    let len = (base64.length * 3) / 4;
    if (base64.endsWith("==")) len -= 2;
    else if (base64.endsWith("=")) len -= 1;
    return Math.floor(len);
  }

  private encodeBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
    }
    return btoa(binary);
  }
}

export const voiceService = new VoiceService();
