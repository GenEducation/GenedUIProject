/**
 * VoiceService handles the real-time audio interaction with the April backend.
 * It manages WebSocket connectivity, 16kHz PCM mic capture, and 24kHz PCM playback
 * with a jitter buffer to ensure smooth audio output.
 */

class VoiceService {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private micCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isSessionActive = false;
  private currentSessionId: string | null = null;
  private onEventCallback: ((event: any) => void) | null = null;
  
  // Jitter Buffer State
  private nextStartTime = 0;
  private bufferQueue: ArrayBuffer[] = [];
  private isBuffering = true;
  private readonly TARGET_BUFFER_SIZE = 3; // Number of chunks to buffer before starting playback

  async startSession(studentId: string, onEvent: (event: any) => void, sessionId?: string) {
    if (this.isSessionActive) return;

    this.isSessionActive = true;
    this.currentStudentId = studentId;
    this.currentSessionId = sessionId || null;
    this.onEventCallback = onEvent;

    // Initialize AudioContext on user gesture (triggered by startVoiceSession in store)
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    } else if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    this.nextStartTime = this.audioCtx.currentTime;
    this.bufferQueue = [];
    this.isBuffering = true;

    // Start Microphone once and keep it alive
    await this.initMicrophone();
    
    // Start WebSocket connection
    this.connect();
  }

  private async initMicrophone() {
    if (this.mediaStream) return; // Already running

    try {
      this.micCtx = new AudioContext({ sampleRate: 16000 });
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.micCtx.createMediaStreamSource(this.mediaStream);
      
      // ScriptProcessor is deprecated but widely supported for simple PCM conversion
      // AudioWorklet would be better for production but requires a separate file
      this.processor = this.micCtx.createScriptProcessor(2048, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const f32 = e.inputBuffer.getChannelData(0);
          const i16 = new Int16Array(f32.length);
          for (let i = 0; i < f32.length; i++) {
            i16[i] = Math.max(-1, Math.min(1, f32[i])) * 0x7fff;
          }
          this.ws.send(i16.buffer);
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.micCtx.destination);
      console.log("[VoiceService] Mic started at 16kHz");
    } catch (err) {
      console.error("[VoiceService] Mic Error:", err);
      this.onEventCallback?.({ type: "error", error: err });
    }
  }

  private connect() {
    if (!this.isSessionActive || !this.currentStudentId) return;

    let wsUrl = process.env.NEXT_PUBLIC_VOICE_API;
    if (!wsUrl) {
      throw new Error("NEXT_PUBLIC_VOICE_API not defined");
    }

    // Import getAuthToken dynamically to avoid circular dependencies if any
    const token = localStorage.getItem("gened_auth_token") || "";
    if (token) {
      const separator = wsUrl.includes("?") ? "&" : "?";
      wsUrl += `${separator}token=${encodeURIComponent(token)}`;
    }

    console.log("[VoiceService] Connecting to", wsUrl);
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      console.log("[VoiceService] Connected");
      this.ws?.send(
        JSON.stringify({
          type: "init",
          student_id: this.currentStudentId,
          session_id: this.currentSessionId,
        })
      );
      this.onEventCallback?.({ type: "connected" });
    };

    this.ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        this.handleIncomingAudio(e.data);
      } else {
        try {
          const data = JSON.parse(e.data);
          
          // Capture session_id from backend for reconnection persistence
          if (data.type === "session_id" && data.session_id) {
            console.log("[VoiceService] Captured session_id:", data.session_id);
            this.currentSessionId = data.session_id;
          }
          
          this.onEventCallback?.(data);
        } catch (err) {
          console.error("[VoiceService] Error parsing JSON:", e.data);
        }
      }
    };

    this.ws.onclose = () => {
      console.log("[VoiceService] WebSocket closed");
      
      // If the session is still supposed to be active, reconnect
      if (this.isSessionActive) {
        console.log("[VoiceService] Reconnecting in 1s...");
        setTimeout(() => this.connect(), 1000);
      } else {
        this.onEventCallback?.({ type: "disconnected" });
      }
    };

    this.ws.onerror = (err) => {
      console.error("[VoiceService] WebSocket error:", err);
      // Let onclose handle reconnection
    };
  }

  private handleIncomingAudio(buffer: ArrayBuffer) {
    if (this.isBuffering) {
      this.bufferQueue.push(buffer);
      if (this.bufferQueue.length >= this.TARGET_BUFFER_SIZE) {
        this.isBuffering = false;
        this.flushBuffer();
      }
    } else {
      this.playPCM(buffer);
    }
  }

  private flushBuffer() {
    while (this.bufferQueue.length > 0) {
      const chunk = this.bufferQueue.shift();
      if (chunk) this.playPCM(chunk);
    }
  }

  private playPCM(buffer: ArrayBuffer) {
    if (!this.audioCtx) return;

    const i16 = new Int16Array(buffer);
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) {
      f32[i] = i16[i] / 0x7fff;
    }

    const audioBuffer = this.audioCtx.createBuffer(1, f32.length, 24000);
    audioBuffer.copyToChannel(f32, 0);

    const src = this.audioCtx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;
    
    // Jitter Buffer Logic:
    // If we have lagged behind, catch up to 'now' + small buffer
    // Otherwise, continue from nextStartTime
    const startTime = Math.max(now + 0.05, this.nextStartTime); 
    
    src.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
  }

  stopSession() {
    console.log("[VoiceService] Stopping session");
    this.isSessionActive = false;
    this.ws?.close();
    this.cleanup();
  }

  private cleanup() {
    this.ws = null;
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
    
    this.isBuffering = true;
    this.bufferQueue = [];
    this.currentStudentId = null;
    this.onEventCallback = null;
  }
}

export const voiceService = new VoiceService();
