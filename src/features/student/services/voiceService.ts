import { getAuthToken } from "@/utils/authFetch";
import type { ExactSubject } from "@/features/subjects/subjectCatalog";

/**
 * VoiceService handles the real-time audio interaction with the April backend.
 * Now includes a Synchronized Typewriter to align text display with audio playback.
 */

/**
 * Resamples floating point audio data to a target rate using linear interpolation.
 */
function resample(
  input: Float32Array<ArrayBufferLike>,
  fromRate: number,
  toRate: number,
): Float32Array<ArrayBufferLike> {
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

type VoiceEvent = {
  type?: string;
  error?: unknown;
  message?: string;
  content?: string;
  session_id?: string;
  role?: "user" | "assistant";
  reason?: string;
  [key: string]: unknown;
};

type NetworkInformation = {
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
};

class VoiceService {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private micCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isSessionActive = false;
  private currentStudentId: string | null = null;
  private currentDisplayName: string | null = null;
  private currentSessionId: string | null = null;
  private currentSubject: ExactSubject | null = null;
  private currentVoice: string | null = null;
  private currentDocumentTitle: string | null = null;
  private currentAgentId: string | null = null;
  private currentGrade: number | null = null;
  private wsEndpoint: string = "/ws/april-live";
  private onEventCallback: ((event: VoiceEvent) => void) | null = null;
  private onTextRevealCallback: ((text: string, role: "user" | "assistant") => void) | null = null;
  private isMuted = false;

  
  // Connection & Retry State
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;
  private readonly STABLE_CONNECTION_MS = 15_000;
  private retryResetTimer: ReturnType<typeof setTimeout> | null = null;
  private lastServerError: VoiceEvent | null = null;
  private currentConnectionId: string | null = null;
  
  // Jitter Buffer & Sync State
  private nextStartTime = 0;
  private bufferQueue: ArrayBuffer[] = [];
  private isBuffering = true;
  private readonly TARGET_BUFFER_SIZE = 6;
  private activeSources: AudioBufferSourceNode[] = [];

  // Typewriter Sync State
  private pendingAssistantText = "";
  private revealedAssistantText = "";
  private lastTypeTime = 0;
  private isTypewriterRunning = false;

  // Connection Quality State
  private currentQuality: "good" | "poor" | "reconnecting" | null = null;
  private qualityCheckTimer: ReturnType<typeof setInterval> | null = null;
  private onConnectionQualityCallback: ((q: "good" | "poor" | "reconnecting") => void) | null = null;

  // Quality check constants
  private readonly QUALITY_CHECK_INTERVAL_MS      = 3_000;  // re-evaluate every 3s
  private readonly WS_BUFFERED_POOR_BYTES         = 32_768; // 32KB queued = uplink congested (~4s of mic audio)
  private readonly NETWORK_RTT_POOR_MS            = 500;    // navigator.connection.rtt threshold (ms)
  private readonly NETWORK_DOWNLINK_POOR_MBPS     = 0.15;   // navigator.connection.downlink threshold (Mbps)

  /**
   * Set the resolved student display name to send with the voice init payload.
   * Call before startSession. TODO(backend): greet with display_name, not username.
   */
  setStudentDisplayName(name: string | null) {
    this.currentDisplayName = name;
  }

  async startSession(
    studentId: string,
    onEvent: (event: VoiceEvent) => void,
    onTextReveal: (text: string, role: "user" | "assistant") => void,
    sessionId?: string,
    subject?: ExactSubject,
    wsEndpoint: string = "/ws/april-live-graph",
    voice?: string,
    documentTitle?: string,
    agentId?: string,
    grade?: number,
    onConnectionQuality?: (q: "good" | "poor" | "reconnecting") => void,
  ) {
    this.currentStudentId = studentId;
    this.currentSessionId = sessionId || null;
    this.currentSubject = subject ?? null;
    this.currentVoice = voice ?? null;
    this.currentDocumentTitle = documentTitle ?? null;
    this.currentAgentId = agentId ?? null;
    this.currentGrade = grade ?? null;
    this.wsEndpoint = wsEndpoint;
    this.onEventCallback = onEvent;
    this.onTextRevealCallback = onTextReveal;
    this.onConnectionQualityCallback = onConnectionQuality || null;

    if (this.isSessionActive) {
      this.sendInitMessage();
      return;
    }

    this.isSessionActive = true;
    this.retryCount = 0;
    this.lastServerError = null;
    this.currentQuality = null;
    this.pendingAssistantText = "";
    this.revealedAssistantText = "";

    if (!this.audioCtx) {
      const AudioContextCtor =
        window.AudioContext ||
        (
          window as unknown as Window & {
            webkitAudioContext: typeof AudioContext;
          }
        ).webkitAudioContext;
      this.audioCtx = new AudioContextCtor({
        sampleRate: 24000,
      });
    }
    // Autoplay safety: Always check and explicitly resume the context
    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    this.nextStartTime = this.audioCtx.currentTime;
    const connId = Math.random().toString(36).substring(7);
    this.currentConnectionId = connId;

    await this.initMicrophone(connId);
    this.connect(connId);
    this.startTypewriterLoop();
  }

  private async initMicrophone(connId: string) {
    if (this.mediaStream) return;
    try {
      this.micCtx = new AudioContext({ sampleRate: 16000 });
      console.log(`🎙️ [VoiceService] micCtx sample rate: ${this.micCtx.sampleRate} Hz`);

      // ── Mic constraints: lean on the browser's built-in DSP before audio
      // ever reaches us. echoCancellation + noiseSuppression + autoGainControl
      // together remove a large chunk of fan/keyboard/distant-voice noise on
      // every modern browser. Chromium-specific `google*` hints are harmless
      // elsewhere.
      const audioConstraints: MediaTrackConstraints & {
        googHighpassFilter: boolean;
        googNoiseSuppression2: boolean;
        googEchoCancellation2: boolean;
      } = {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          googHighpassFilter: true,
          googNoiseSuppression2: true,
          googEchoCancellation2: true,
      };
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      // Staleness guard: session may have been stopped while getUserMedia was awaiting
      if (!this.isSessionActive || !this.micCtx || this.currentConnectionId !== connId) {
        this.mediaStream?.getTracks().forEach((t) => t.stop());
        this.mediaStream = null;
        return;
      }

      const source = this.micCtx.createMediaStreamSource(this.mediaStream);
      this.processor = this.micCtx.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.ws?.readyState !== WebSocket.OPEN) return;

        let input: Float32Array<ArrayBufferLike> = e.inputBuffer.getChannelData(0);
        const bufferSampleRate = e.inputBuffer.sampleRate;
        if (bufferSampleRate !== 16000) {
          input = resample(input, bufferSampleRate, 16000);
        }

        const i16 = new Int16Array(input.length);

        if (this.isMuted) {
          i16.fill(0);
        } else {
          for (let i = 0; i < input.length; i++) {
            i16[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
          }
        }

        this.ws.send(i16.buffer);
      };

      source.connect(this.processor);
      this.processor.connect(this.micCtx.destination);

    } catch (err) {
      console.error("[VoiceService] Mic Error:", err);
      this.onEventCallback?.({ type: "error", error: err });
    }
  }

  private connect(connId: string) {
    if (!this.isSessionActive || !this.currentStudentId || this.currentConnectionId !== connId) {
      console.log("🎙️ [VoiceService] Aborting connection attempt (newer connection is active or session was stopped).");
      return;
    }

    // Robustly construct the WebSocket URL
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "");
    
    // Clean up the base URL and swap protocol
    // http://api.example.com -> ws://api.example.com
    // https://api.example.com -> wss://api.example.com
    const wsBaseUrl = apiBaseUrl.replace(/^http/, "ws").replace(/\/$/, "");
    
    const token = getAuthToken();
    if (!token) {
      console.error("🎙️ [VoiceService] Missing auth token. Cannot connect to websocket.");
      this.onEventCallback?.({ type: "error", error: new Error("Not authenticated") });
      return;
    }

    const endpoint = this.wsEndpoint || "/ws/april-live";
    
    // Ensure endpoint starts with a slash
    const formattedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    
    const wsUrl = `${wsBaseUrl}${formattedEndpoint}?token=${token || ""}&user_id=${this.currentStudentId}`;

    console.log(`[VoiceService] Connecting to: ${wsUrl}`);
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      const wasReconnecting = this.retryCount > 0;
      this.lastServerError = null;
      this.sendInitMessage();
      this.onEventCallback?.({ type: "connected" });
      if (wasReconnecting) this.setQuality("good");
      // An `open` immediately followed by another close is not recovery. Reset the
      // retry budget only after the connection proves stable, otherwise flapping loops
      // forever at "attempt 1".
      if (this.retryResetTimer) clearTimeout(this.retryResetTimer);
      this.retryResetTimer = setTimeout(() => {
        if (this.ws?.readyState === WebSocket.OPEN && this.currentConnectionId === connId) {
          this.retryCount = 0;
        }
        this.retryResetTimer = null;
      }, this.STABLE_CONNECTION_MS);
      this.startQualityMonitoring();
    };

    this.ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data) as VoiceEvent;

          if (data.type === "error") {
            this.lastServerError = data;
          }
          
          if (data.error === "rate_limit_exceeded") {
            console.warn("🎙️ [VoiceService] Rate limit exceeded. Stopping session.");
            const callback = this.onEventCallback;
            this.stopSession();
            callback?.({
              type: "error",
              error: "rate_limit_exceeded",
              message: "Daily rate limit reached. Upgrade to Pro for more."
            });
            return;
          }

          if (data.type === "session_limit") {
            // The backend ended the lesson on purpose (duration or daily-budget cap) and
            // has already sent the child a warm explanation. It closes the socket right
            // after. Stop the session BEFORE that close lands: `onclose` cannot tell a
            // deliberate ending from a dropped connection, so left alone it would fire
            // up to MAX_RETRIES silent reconnects and then report "Connection lost" —
            // replacing the message above with an error, for a session that ended
            // exactly as designed. This ordering is why the cap is safe to enable.
            const callback = this.onEventCallback;
            this.stopSession();
            callback?.(data);
            return;
          }

          if (data.type === "interrupted") {
            this.interruptPlayback();
            return;
          }

          if (data.type === "flush") {
            // The backend is deliberately replacing the tutor's teaching plan or
            // switching surfaces. Provider rotations do not flush: their queued speech
            // remains valid and cutting it would make audio diverge from persisted text.
            //
            // The backend has emitted this on every one of those paths since swaps were
            // introduced. Nothing on this side had ever listened for it.
            this.interruptPlayback();
            this.pendingAssistantText = "";
            this.revealedAssistantText = "";
            return;
          }

          if (data.type === "session_id" && typeof data.session_id === "string") {
            this.currentSessionId = data.session_id;
          }

          if (data.type === "transcript" && typeof data.content === "string") {
            if (data.role === "user") {
              // User transcript is shown immediately as it's not tied to playback
              this.onTextRevealCallback?.(data.content, "user");
            } else {
              // Assistant transcript is buffered for synchronized typewriter
              this.pendingAssistantText += (this.pendingAssistantText ? " " : "") + data.content;
            }
          }
          
          this.onEventCallback?.(data);
        } catch {
          console.error("[VoiceService] Error parsing JSON:", event.data);
        }
      } else {
        this.handleIncomingAudio(event.data);
      }
    };

    this.ws.onclose = (event) => {
      if (this.retryResetTimer) {
        clearTimeout(this.retryResetTimer);
        this.retryResetTimer = null;
      }
      if (event.code === 1008) {
        const callback = this.onEventCallback;
        const serverError = this.lastServerError;
        this.stopSession();
        // 1008 means generic policy rejection, not a specific taxonomy failure. Prefer
        // the structured backend frame; use a neutral fallback if the close raced it.
        if (!serverError) {
          callback?.({
            type: "error",
            error: "SESSION_POLICY_REJECTED",
            message: "This voice session could not be started.",
          });
        }
        return;
      }
      if (this.isSessionActive && this.retryCount < this.MAX_RETRIES && this.currentConnectionId === connId) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount - 1) * 1000;
        console.log(`[VoiceService] Reconnecting in ${delay}ms (Attempt ${this.retryCount}/${this.MAX_RETRIES})...`);
        this.setQuality("reconnecting");
        setTimeout(() => this.connect(connId), delay);
      } else {
        if (this.retryCount >= this.MAX_RETRIES) {
          console.error("[VoiceService] Max retries reached. Connection failed.");
          this.onEventCallback?.({ type: "error", error: "Connection lost. Please try again." });
          this.stopSession();
        } else {
          this.onEventCallback?.({ type: "disconnected" });
        }
      }
    };
  }

  private sendInitMessage() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const usesV2LaunchContract = this.wsEndpoint === "/ws/v2/april-live-graph";
    const payload: Record<string, unknown> = {
      type: "init",
      student_id: this.currentStudentId,
      voice: this.currentVoice,
      token: getAuthToken(),
    };
    if (usesV2LaunchContract) {
      // A transport reconnect continues the immutable application session assigned by
      // the backend. A first connection has no identity and creates exactly one.
      payload.launch_mode = this.currentSessionId ? "continue_session" : "new";
      if (this.currentSessionId) payload.session_id = this.currentSessionId;
    } else {
      payload.session_id = this.currentSessionId;
    }
    if (this.currentSubject) payload.subject = this.currentSubject;
    if (this.currentDocumentTitle) payload.document_title = this.currentDocumentTitle;
    if (this.currentAgentId) payload.agent_id = this.currentAgentId;
    if (this.currentGrade != null) payload.grade = this.currentGrade;
    if (this.currentDisplayName) payload.display_name = this.currentDisplayName;
    this.ws.send(JSON.stringify(payload));
  }

  private handleIncomingAudio(buffer: ArrayBuffer) {
    if (!this.isSessionActive || !this.audioCtx) return;

    if (this.isBuffering) {
      this.bufferQueue.push(buffer);
      if (this.bufferQueue.length >= this.TARGET_BUFFER_SIZE) {
        this.isBuffering = false;
        this.nextStartTime = this.audioCtx.currentTime;
        this.flushBuffer();
      }
      return;
    }

    const currentTime = this.audioCtx.currentTime;
    if (this.nextStartTime < currentTime) this.nextStartTime = currentTime;

    const floatData = new Float32Array(buffer.byteLength / 2);
    const int16Data = new Int16Array(buffer);
    for (let i = 0; i < int16Data.length; i++) {
      floatData[i] = int16Data[i] / 0x7FFF;
    }

    const audioBuffer = this.audioCtx!.createBuffer(1, floatData.length, 24000);
    audioBuffer.getChannelData(0).set(floatData);

    const source = this.audioCtx!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioCtx!.destination);
    this.activeSources.push(source);
    source.onended = () => {
      this.activeSources = this.activeSources.filter(s => s !== source);
    };

    const startTime = Math.max(this.audioCtx!.currentTime, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
  }

  private flushBuffer() {
    while (this.bufferQueue.length > 0) {
      this.handleIncomingAudio(this.bufferQueue.shift()!);
    }
  }

  private interruptPlayback() {
    // Stop all scheduled/playing bot audio immediately.
    for (const src of this.activeSources) {
      try { src.stop(); } catch { /* already ended */ }
    }
    this.activeSources = [];
    this.bufferQueue = [];
    this.isBuffering = true;
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
  }

  private setQuality(q: "good" | "poor" | "reconnecting") {
    if (this.currentQuality === q) return;
    this.currentQuality = q;
    this.onConnectionQualityCallback?.(q);
  }

  private startQualityMonitoring() {
    if (this.qualityCheckTimer) return;
    this.qualityCheckTimer = setInterval(() => this.checkConnectionQuality(), this.QUALITY_CHECK_INTERVAL_MS);
    this.checkConnectionQuality(); // run immediately on connect
  }

  private stopQualityMonitoring() {
    if (this.qualityCheckTimer) {
      clearInterval(this.qualityCheckTimer);
      this.qualityCheckTimer = null;
    }
  }

  private checkConnectionQuality() {
    if (!this.isSessionActive || this.currentQuality === "reconnecting") return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setQuality("poor");
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN && this.ws.bufferedAmount > this.WS_BUFFERED_POOR_BYTES) {
      this.setQuality("poor");
      return;
    }

    const conn =
      typeof navigator !== "undefined"
        ? (navigator as Navigator & { connection?: NetworkInformation }).connection
        : undefined;
    if (conn) {
      const poorType = conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
      const highRtt  = (conn.rtt ?? 0) > this.NETWORK_RTT_POOR_MS;
      const lowDown  = conn.downlink !== undefined && conn.downlink < this.NETWORK_DOWNLINK_POOR_MBPS;
      if (poorType || highRtt || lowDown) {
        this.setQuality("poor");
        return;
      }
    }

    this.setQuality("good");
  }

  private startTypewriterLoop() {
    if (this.isTypewriterRunning) return;
    this.isTypewriterRunning = true;
    this.lastTypeTime = performance.now();
    
    const loop = (now: number) => {
      if (!this.isSessionActive) {
        this.isTypewriterRunning = false;
        return;
      }

      const dt = (now - this.lastTypeTime) / 1000; // seconds
      this.lastTypeTime = now;

      // Calculate how much text remains to be revealed
      const remainingText = this.pendingAssistantText.substring(this.revealedAssistantText.length);
      
      if (remainingText.length > 0) {
        // Calculate remaining audio duration
        const currentTime = this.audioCtx?.currentTime || 0;
        const remainingAudio = Math.max(0.1, this.nextStartTime - currentTime);
        
        // Target speed: reveal all remaining text over the remaining audio duration
        // We add a slight multiplier (1.1) to ensure text finishes just before audio ends
        const charsPerSecond = (remainingText.length / remainingAudio) * 1.1;
        
        // Calculate how many characters to reveal in this frame
        const charsToRevealCount = Math.ceil(charsPerSecond * dt);
        
        if (charsToRevealCount > 0) {
          const nextChars = remainingText.substring(0, charsToRevealCount);
          this.revealedAssistantText += nextChars;
          this.onTextRevealCallback?.(nextChars, "assistant");
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  stopSession() {
    this.isSessionActive = false;
    this.currentStudentId = null;
    this.currentDisplayName = null;
    this.currentSessionId = null;
    this.currentSubject = null;
    this.currentVoice = null;
    this.currentDocumentTitle = null;
    this.currentAgentId = null;
    this.currentGrade = null;
    this.pendingAssistantText = "";
    this.revealedAssistantText = "";
    this.lastServerError = null;
    if (this.retryResetTimer) {
      clearTimeout(this.retryResetTimer);
      this.retryResetTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.micCtx) {
      this.micCtx.close();
      this.micCtx = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (err) {
        console.warn("[VoiceService] Error closing audioCtx:", err);
      }
      this.audioCtx = null;
    }
    this.nextStartTime = 0;
    this.activeSources = [];
    this.isBuffering = true;
    this.bufferQueue = [];
    this.currentQuality = null;
    this.stopQualityMonitoring();
    this.onEventCallback = null;
    this.onTextRevealCallback = null;
    this.onConnectionQualityCallback = null;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    console.log(`[VoiceService] Mic ${muted ? "Muted" : "Unmuted"}`);
  }
}

export const voiceService = new VoiceService();
