import { getAuthToken } from "@/utils/authFetch";

/**
 * VoiceService handles the real-time audio interaction with the April backend.
 * Now includes a Synchronized Typewriter to align text display with audio playback.
 */

// ─── Noise-suppression tuning ────────────────────────────────────────────────
// These thresholds gate which microphone frames are forwarded to Gemini Live.
// They sit on top of the browser's built-in noise suppression (echo / NS / AGC
// constraints below) and Gemini's tightened server-side VAD.

// Frames below this RMS are treated as ambient noise and dropped. -50 dBFS ≈
// breathing / fan noise; real speech sits well above this. Float32 samples
// are in [-1, 1], so RMS units are the same.
const RMS_NOISE_FLOOR = 0.0035;

// When Silero VAD flips to "speech", we flush this many cached frames before
// it so word onsets aren't clipped. 1 frame ≈ 256 ms at 4096 samples / 16 kHz.
const VAD_PREROLL_FRAMES = 1;

// After VAD declares end-of-speech we keep streaming this many more frames so
// trailing syllables aren't cut. Gemini's own end-of-speech sensitivity still
// closes the turn.
const VAD_POSTROLL_FRAMES = 1;

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
  private currentVoice: string | null = null;
  private wsEndpoint: string = "/ws/april-live";
  private onEventCallback: ((event: any) => void) | null = null;
  private onTextRevealCallback: ((text: string, role: "user" | "assistant") => void) | null = null;
  private isMuted = false;

  // VAD state — set up lazily in initMicrophone(). If init fails we fall back
  // to the RMS floor only.
  private vad: { destroy: () => void } | null = null;
  private vadReady = false;
  private vadSpeaking = false;
  private vadPostrollRemaining = 0;
  private prerollBuffer: ArrayBuffer[] = [];
  
  // Connection & Retry State
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;
  private currentConnectionId: string | null = null;
  
  // Jitter Buffer & Sync State
  private nextStartTime = 0;
  private bufferQueue: ArrayBuffer[] = [];
  private isBuffering = true;
  private readonly TARGET_BUFFER_SIZE = 6;

  // Typewriter Sync State
  private pendingAssistantText = "";
  private revealedAssistantText = "";
  private lastTypeTime = 0;
  private isTypewriterRunning = false;

  async startSession(
    studentId: string,
    onEvent: (event: any) => void,
    onTextReveal: (text: string, role: "user" | "assistant") => void,
    sessionId?: string,
    subject?: string,
    wsEndpoint: string = "/ws/april-live-graph",
    voice?: string
  ) {
    this.currentStudentId = studentId;
    this.currentSessionId = sessionId || null;
    this.currentSubject = subject ?? null;
    this.currentVoice = voice ?? null;
    this.wsEndpoint = wsEndpoint;
    this.onEventCallback = onEvent;
    this.onTextRevealCallback = onTextReveal;

    if (this.isSessionActive) {
      this.sendInitMessage();
      return;
    }

    this.isSessionActive = true;
    this.retryCount = 0;
    this.pendingAssistantText = "";
    this.revealedAssistantText = "";

    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
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

      // ── Mic constraints: lean on the browser's built-in DSP before audio
      // ever reaches us. echoCancellation + noiseSuppression + autoGainControl
      // together remove a large chunk of fan/keyboard/distant-voice noise on
      // every modern browser. Chromium-specific `google*` hints are harmless
      // elsewhere.
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // @ts-ignore — Chromium-only, but harmless on other UAs.
          googHighpassFilter: true,
          // @ts-ignore — Chromium-only.
          googNoiseSuppression2: true,
          // @ts-ignore — Chromium-only.
          googEchoCancellation2: true,
        },
      });
      const source = this.micCtx.createMediaStreamSource(this.mediaStream);
      this.processor = this.micCtx.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.isMuted) return;
        if (this.ws?.readyState !== WebSocket.OPEN) return;

        const input = e.inputBuffer.getChannelData(0);

        // ── Cheap RMS energy floor. Skips frames that are obviously below
        // the noise floor regardless of what VAD thinks. Catches the long
        // tail of low-energy hum that Silero sometimes lets through.
        let sumSq = 0;
        for (let i = 0; i < input.length; i++) sumSq += input[i] * input[i];
        const rms = Math.sqrt(sumSq / input.length);
        if (rms < RMS_NOISE_FLOOR) {
          // Push silence into the pre-roll ring so a VAD-triggered flush
          // doesn't replay stale loud audio.
          return;
        }

        // Convert to Int16 PCM once.
        const i16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          i16[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
        }
        const buf = i16.buffer;

        if (this.vadReady) {
          // VAD path: only send during speech (+ post-roll). Otherwise hold
          // the most recent frame as pre-roll so we don't clip word onsets
          // when VAD flips to "speaking".
          if (this.vadSpeaking) {
            // Flush any pre-roll frames we held back from before speech started.
            while (this.prerollBuffer.length > 0) {
              this.ws.send(this.prerollBuffer.shift()!);
            }
            this.ws.send(buf);
          } else if (this.vadPostrollRemaining > 0) {
            this.ws.send(buf);
            this.vadPostrollRemaining--;
          } else {
            // Maintain a tiny rolling pre-roll buffer.
            this.prerollBuffer.push(buf);
            while (this.prerollBuffer.length > VAD_PREROLL_FRAMES) {
              this.prerollBuffer.shift();
            }
          }
        } else {
          // No VAD available — RMS floor alone decides. We already passed it.
          this.ws.send(buf);
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.micCtx.destination);

      // Disable VAD model loading as requested. Speech gating uses the lightweight RMS-energy noise floor.
      console.log("🎙️ [VoiceService] VAD model disabled by request. Gating via local RMS-energy floor.");
      this.vadReady = false;
    } catch (err) {
      console.error("[VoiceService] Mic Error:", err);
      this.onEventCallback?.({ type: "error", error: err });
    }
  }

  /**
   * Boots Silero VAD against the same AudioContext / source node we already
   * use for streaming. On success, vadReady flips on and the processor begins
   * gating frames by speech presence. On failure (lib not installed, WASM
   * fetch blocked, etc.) we silently fall back to the RMS-only path — the
   * user still gets noise suppression, just less aggressive.
   */
  private async initVad(source: MediaStreamAudioSourceNode) {
    if (!this.micCtx) return;
    try {
      console.log("🎙️ [VoiceService] Loading VAD package dynamically...");
      // Dynamic import: avoids pulling the ONNX runtime into the SSR bundle
      // and lets the page load even if the package isn't yet installed.
      const vadMod: any = await import(
        /* webpackChunkName: "vad" */ "@ricky0123/vad-web"
      ).catch((err) => {
        console.warn("🎙️ [VoiceService] VAD package not available, falling back to RMS-only gating:", err);
        return null;
      });
      if (!vadMod || !vadMod.AudioNodeVAD) return;

      // STALENESS GUARD: Check if session was stopped during import
      if (!this.isSessionActive || !this.micCtx) return;

      console.log("🎙️ [VoiceService] VAD package loaded. Fetching & compiling ONNX model + WASM assets in background...");
      const vad = await vadMod.AudioNodeVAD.new(this.micCtx, {
        // Silero defaults are well-tuned for 16k mono; just wire up callbacks.
        // Assets (silero_vad_legacy.onnx, vad.worklet.bundle.min.js, ort
        // wasm files) are served from /public, so basePath is the site root.
        // v5 is the newer Silero model — better compatibility with the
        // onnxruntime-web 1.26 that npm installs (the VAD lib targets ^1.17
        // but doesn't pin, and the legacy model has triggered op-set errors
        // on newer ORT builds).
        model: "v5",
        baseAssetPath: "/",
        onnxWASMBasePath: "/",
        // Force ONNX Runtime to single-threaded WASM. The multi-threaded
        // variant needs SharedArrayBuffer, which only works on pages served
        // with COOP/COEP headers — and setting those globally breaks Google
        // OAuth popups + any third-party iframe. Single-thread is plenty fast
        // for a 256 ms frame and avoids the whole cross-origin-isolation
        // requirement.
        ortConfig: (ort: any) => {
          if (ort?.env?.wasm) {
            ort.env.wasm.numThreads = 1;
            ort.env.wasm.proxy = false;
          }
        },
        onSpeechStart: () => {
          console.log("🗣️ [VoiceService] VAD: Speech Started");
          this.vadSpeaking = true;
          this.vadPostrollRemaining = 0;
        },
        onSpeechEnd: () => {
          console.log("🤫 [VoiceService] VAD: Speech Ended");
          this.vadSpeaking = false;
          this.vadPostrollRemaining = VAD_POSTROLL_FRAMES;
        },
        onVADMisfire: () => {
          console.log("⚠️ [VoiceService] VAD: Speech Misfired (false alarm)");
          // Speech start was a false alarm — make sure we don't keep streaming.
          this.vadSpeaking = false;
          this.vadPostrollRemaining = 0;
        },
      });

      // STALENESS GUARD: Check if session was stopped during AudioNodeVAD.new()
      if (!this.isSessionActive || !this.micCtx) {
        vad.destroy();
        return;
      }

      vad.receive(source);
      vad.start();

      this.vad = { destroy: () => vad.destroy?.() };
      this.vadReady = true;
      console.log("✅ [VoiceService] Silero VAD gate active and monitoring microphone input.");
    } catch (err) {
      console.warn("🎙️ [VoiceService] VAD init failed, falling back to RMS-only:", err);
      this.vadReady = false;
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
    const endpoint = this.wsEndpoint || "/ws/april-live";
    
    // Ensure endpoint starts with a slash
    const formattedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    
    const wsUrl = `${wsBaseUrl}${formattedEndpoint}?token=${token || ""}&user_id=${this.currentStudentId}`;

    console.log(`[VoiceService] Connecting to: ${wsUrl}`);
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.retryCount = 0;
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

          if (data.type === "transcript") {
            if (data.role === "user") {
              // User transcript is shown immediately as it's not tied to playback
              this.onTextRevealCallback?.(data.content, "user");
            } else {
              // Assistant transcript is buffered for synchronized typewriter
              this.pendingAssistantText += (this.pendingAssistantText ? " " : "") + data.content;
            }
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
      if (this.isSessionActive && this.retryCount < this.MAX_RETRIES && this.currentConnectionId === connId) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount - 1) * 1000;
        console.log(`[VoiceService] Reconnecting in ${delay}ms (Attempt ${this.retryCount}/${this.MAX_RETRIES})...`);
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
    this.ws.send(
      JSON.stringify({
        type: "init",
        student_id: this.currentStudentId,
        session_id: this.currentSessionId,
        subject: this.currentSubject,
        voice: this.currentVoice,
        token: getAuthToken(),
      })
    );
  }

  private handleIncomingAudio(buffer: ArrayBuffer) {
    if (!this.isSessionActive || !this.audioCtx) return;

    const currentTime = this.audioCtx.currentTime;

    // Jitter Buffer Starvation Recovery:
    // If the playhead has already passed our scheduled play time by more than 50ms,
    // it means network lag/jitter starved our queue. We immediately re-engage buffering
    // to build a 6-frame (120ms) cushion for smooth playback instead of crackling.
    if (!this.isBuffering && this.nextStartTime < currentTime - 0.05) {
      console.warn(`[VoiceService] Jitter buffer starved (offset: ${(currentTime - this.nextStartTime).toFixed(3)}s). Re-buffering...`);
      this.isBuffering = true;
      this.nextStartTime = currentTime;
    }

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
    this.currentSessionId = null;
    this.currentSubject = null;
    this.currentVoice = null;
    this.pendingAssistantText = "";
    this.revealedAssistantText = "";
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.vad) {
      try { this.vad.destroy(); } catch { /* ignore */ }
      this.vad = null;
    }
    this.vadReady = false;
    this.vadSpeaking = false;
    this.vadPostrollRemaining = 0;
    this.prerollBuffer = [];

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
    
    this.isBuffering = true;
    this.bufferQueue = [];
    this.onEventCallback = null;
    this.onTextRevealCallback = null;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    console.log(`[VoiceService] Mic ${muted ? "Muted" : "Unmuted"}`);
  }
}

export const voiceService = new VoiceService();
