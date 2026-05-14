/**
 * audioPlayerService.ts
 * Implements Wave 1 & Wave 3 audio transport contracts.
 *
 * Rules:
 * - SSE is the control plane (directives / events) — this file owns the DATA plane (audio bytes)
 * - Only ONE active playback session at a time
 * - Frontend owns playback lifecycle; backend owns audio generation
 * - Streams audio/mpeg from GET /audio/tts?directive_id=<uuid>
 * - Emits timepoint-based callbacks for word highlight sync
 */

import { authFetch } from "@/utils/authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export type PlaybackState =
  | "idle"
  | "loading"
  | "buffering"
  | "playing"
  | "paused"
  | "stopped"
  | "completed"
  | "error";

export interface TtsTimepoint {
  word: string;
  time_seconds: number;
}

export interface PlaybackCallbacks {
  onStateChange?: (state: PlaybackState) => void;
  onTimeUpdate?: (currentTime: number, wordIndex: number) => void;
  onComplete?: (directiveId: string) => void;
  onError?: (directiveId: string, message: string) => void;
}

class AudioPlayerService {
  private audioCtx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private activeDirectiveId: string | null = null;
  private playbackState: PlaybackState = "idle";
  private startedAt = 0;
  private pausedAt = 0;
  private highlightTimer: ReturnType<typeof setInterval> | null = null;
  private callbacks: PlaybackCallbacks = {};
  private timepoints: TtsTimepoint[] = [];
  private currentWordIndex = -1;

  private getOrCreateContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      this.audioCtx = new AudioContext();
    }
    // Resume a suspended context (browser autoplay policy)
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private setState(state: PlaybackState) {
    this.playbackState = state;
    this.callbacks.onStateChange?.(state);
  }

  private clearHighlightTimer() {
    if (this.highlightTimer !== null) {
      clearInterval(this.highlightTimer);
      this.highlightTimer = null;
    }
  }

  private startHighlightSync() {
    if (this.timepoints.length === 0) return;
    this.clearHighlightTimer();
    this.currentWordIndex = -1;

    this.highlightTimer = setInterval(() => {
      if (!this.audioCtx || this.playbackState !== "playing") return;
      const elapsed = this.audioCtx.currentTime - this.startedAt;

      // Walk timepoints to find the current word
      let newIdx = this.currentWordIndex;
      for (let i = 0; i < this.timepoints.length; i++) {
        if (this.timepoints[i].time_seconds <= elapsed) {
          newIdx = i;
        } else {
          break;
        }
      }

      if (newIdx !== this.currentWordIndex) {
        this.currentWordIndex = newIdx;
        this.callbacks.onTimeUpdate?.(elapsed, newIdx);
      }
    }, 50); // 50ms polling — within Wave 2's ±150ms drift tolerance
  }

  /** Stop any current playback (Wave 1: single active playback rule) */
  stop() {
    this.clearHighlightTimer();
    try {
      this.sourceNode?.stop();
    } catch {
      // already stopped
    }
    this.sourceNode = null;
    this.activeDirectiveId = null;
    this.timepoints = [];
    this.currentWordIndex = -1;
    this.setState("stopped");
  }

  /** Play TTS audio for a given directive_id. Stops any existing playback first. */
  async play(
    directiveId: string,
    timepoints: TtsTimepoint[],
    callbacks: PlaybackCallbacks
  ): Promise<void> {
    // Enforce single active playback rule (Wave 1 §3.1)
    if (this.activeDirectiveId && this.activeDirectiveId !== directiveId) {
      this.stop();
    }

    this.callbacks = callbacks;
    this.timepoints = timepoints || [];
    this.activeDirectiveId = directiveId;
    this.setState("loading");

    try {
      const ctx = this.getOrCreateContext();

      const response = await authFetch(
        `${API_BASE_URL}/audio/tts?directive_id=${directiveId}`
      );

      if (!response.ok) {
        // Wave 4: fail fast, emit skill_error equivalent
        this.setState("error");
        callbacks.onError?.(directiveId, `TTS fetch failed: ${response.status}`);
        return;
      }

      this.setState("buffering");

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Guard: another play() may have taken over while we were fetching
      if (this.activeDirectiveId !== directiveId) return;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      source.onended = () => {
        if (this.activeDirectiveId !== directiveId) return;
        this.clearHighlightTimer();
        this.setState("completed");
        callbacks.onComplete?.(directiveId);
      };

      this.sourceNode = source;
      this.startedAt = ctx.currentTime;
      this.pausedAt = 0;
      source.start(0);
      this.setState("playing");
      this.startHighlightSync();
    } catch (err: any) {
      if (this.activeDirectiveId === directiveId) {
        this.setState("error");
        callbacks.onError?.(directiveId, err?.message || "Playback error");
      }
    }
  }

  /** Play a single word/syllable TTS (Mode 2 — tap on difficult word) */
  async playWord(directiveId: string, word: string, slow = false, grade = 5): Promise<void> {
    this.stop();
    this.activeDirectiveId = directiveId;
    this.setState("loading");

    try {
      const ctx = this.getOrCreateContext();
      // Spec: GET /audio/word-tts?word={word}&grade={grade}&slow={bool}
      const url = word
        ? `${API_BASE_URL}/audio/word-tts?word=${encodeURIComponent(word)}&grade=${grade}&slow=${slow}`
        : `${API_BASE_URL}/audio/word-tts?directive_id=${directiveId}`;
      const response = await authFetch(url);
      if (!response.ok) {
        this.setState("error");
        return;
      }
      this.setState("buffering");
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      if (this.activeDirectiveId !== directiveId) return;
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (this.activeDirectiveId === directiveId) {
          this.setState("completed");
          this.activeDirectiveId = null;
        }
      };
      this.sourceNode = source;
      this.startedAt = ctx.currentTime;
      source.start(0);
      this.setState("playing");
    } catch {
      this.setState("error");
    }
  }

  getState(): PlaybackState {
    return this.playbackState;
  }

  getActiveDirectiveId(): string | null {
    return this.activeDirectiveId;
  }

  /** Call on route change / tab unload to clean up (Wave 1 §3.2) */
  destroy() {
    this.stop();
    this.setState("idle");
    try {
      this.audioCtx?.close();
    } catch {
      // ignore
    }
    this.audioCtx = null;
  }
}

// Singleton — one player for the whole session
export const audioPlayerService = new AudioPlayerService();
