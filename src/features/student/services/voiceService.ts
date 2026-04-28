import { getAuthToken } from "@/utils/authFetch";

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
  private currentStudentId: string | null = null;
  private currentSessionId: string | null = null;
  private currentSubject: string | null = null;
  private onEventCallback: ((event: any) => void) | null = null;
  
  // Jitter Buffer State
  private nextStartTime = 0;
  private bufferQueue: ArrayBuffer[] = [];
  private isBuffering = true;
  private readonly TARGET_BUFFER_SIZE = 3; // Number of chunks to buffer before starting playback

  async startSession(studentId: string, onEvent: (event: any) => void, sessionId?: string, subject?: string) {
    // Always update the current context
    this.currentStudentId = studentId;
    this.currentSessionId = sessionId || null;
    this.currentSubject = subject ?? null;
    this.onEventCallback = onEvent;

    if (this.isSessionActive) {
      // If already active, just re-send the init message to sync context
      this.sendInitMessage();
      return;
    }

    this.isSessionActive = true;

    // Initialize AudioContext on user gesture
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
    if (this.mediaStream) return;

    try {
      this.micCtx = new AudioContext({ sampleRate: 16000 });
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.micCtx.createMediaStreamSource(this.mediaStream);
      
      this.processor = this.micCtx.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          const input = e.inputBuffer.getChannelData(0);
          const i16 = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            i16[i] = Math.max(-1, Math.min(1, input[i])) * 0x7FFF;
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

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBaseUrl) {
      throw new Error("NEXT_PUBLIC_API_URL not defined");
    }

    const wsBaseUrl = apiBaseUrl.replace(/^http/, "ws");
    const token = getAuthToken();
    const wsUrl = `${wsBaseUrl}/ws/april-live?token=${token || ""}&user_id=${this.currentStudentId}`;

    console.log("[VoiceService] Connecting to unified WS:", wsUrl.split('token=')[0] + 'token=REDACTED');
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      console.log("[VoiceService] Connected");
      this.sendInitMessage();
      this.onEventCallback?.({ type: "connected" });
    };

    this.ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "session_id" && data.session_id) {
            this.currentSessionId = data.session_id;
          }
          
          this.onEventCallback?.(data);
        } catch (err) {
          console.error("[VoiceService] Error parsing JSON:", event.data);
        }
      } else {
        this.handleIncomingAudio(event.data);
      }
    };

    this.ws.onclose = () => {
      console.log("[VoiceService] WebSocket closed");
      if (this.isSessionActive) {
        setTimeout(() => this.connect(), 1000);
      } else {
        this.onEventCallback?.({ type: "disconnected" });
      }
    };

    this.ws.onerror = (err) => {
      console.error("[VoiceService] WebSocket error:", err);
    };
  }

  private sendInitMessage() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const token = getAuthToken();
    this.ws.send(
      JSON.stringify({
        type: "init",
        student_id: this.currentStudentId,
        session_id: this.currentSessionId,
        subject: this.currentSubject,
        token: token,
      })
    );
    console.log("[VoiceService] Sent Init:", {
      student_id: this.currentStudentId,
      session_id: this.currentSessionId,
      subject: this.currentSubject,
    });
  }

  private handleIncomingAudio(buffer: ArrayBuffer) {
    if (this.isBuffering) {
      this.bufferQueue.push(buffer);
      if (this.bufferQueue.length >= this.TARGET_BUFFER_SIZE) {
        this.isBuffering = false;
        this.flushBuffer();
      }
      return;
    }

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

    const startTime = Math.max(this.audioCtx!.currentTime, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
  }

  private flushBuffer() {
    while (this.bufferQueue.length > 0) {
      this.handleIncomingAudio(this.bufferQueue.shift()!);
    }
  }

  stopSession() {
    console.log("[VoiceService] Stopping session");
    this.isSessionActive = false;
    this.currentStudentId = null;
    this.currentSessionId = null;
    this.currentSubject = null;
    
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
    
    this.isBuffering = true;
    this.bufferQueue = [];
    this.onEventCallback = null;
  }
}

export const voiceService = new VoiceService();
