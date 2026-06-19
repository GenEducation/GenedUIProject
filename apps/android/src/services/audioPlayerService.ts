/**
 * audioPlayerService.ts — native (expo-av) port of the web audioPlayerService.
 *
 * Rules (mirrors web):
 *  - SSE is the control plane; this file owns the DATA plane (audio bytes).
 *  - Only ONE active playback at a time.
 *  - Streams audio/mpeg from GET /english/audio/tts?directive_id=<uuid> and
 *    GET /english/audio/word-tts?word=… via authFetch (Bearer token injected).
 *
 * Because authFetch is needed for the Bearer token, we fetch the bytes, write
 * them to a temp cache file, and play that file with expo-av Audio.Sound.
 */
import { Audio, type AVPlaybackStatus } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { authFetch } from "./authFetch";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export type PlaybackState =
  | "idle"
  | "loading"
  | "buffering"
  | "playing"
  | "paused"
  | "stopped"
  | "completed"
  | "error";

export interface PlaybackCallbacks {
  onStateChange?: (state: PlaybackState) => void;
  onComplete?: (directiveId: string) => void;
  onError?: (directiveId: string, message: string) => void;
}

class AudioPlayerService {
  private sound: Audio.Sound | null = null;
  private activeDirectiveId: string | null = null;
  private state: PlaybackState = "idle";
  private callbacks: PlaybackCallbacks = {};
  private audioModeReady = false;

  private setState(s: PlaybackState) {
    this.state = s;
    this.callbacks.onStateChange?.(s);
  }

  private async ensureAudioMode() {
    if (this.audioModeReady) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      this.audioModeReady = true;
    } catch {
      // best-effort
    }
  }

  /** Fetch authed audio bytes and write them to a playable temp file. */
  private async fetchToFile(url: string, key: string): Promise<string> {
    const res = await authFetch(url);
    if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);
    const buffer = await res.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    const fileUri = `${FileSystem.cacheDirectory}tts-${key}-${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
  }

  private async unload() {
    const prev = this.sound;
    this.sound = null;
    if (prev) {
      try {
        await prev.unloadAsync();
      } catch {
        /* already unloaded */
      }
    }
  }

  private onStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        const id = this.activeDirectiveId;
        this.setState("error");
        if (id) this.callbacks.onError?.(id, status.error);
      }
      return;
    }
    if (status.didJustFinish) {
      const id = this.activeDirectiveId;
      this.setState("completed");
      if (id) this.callbacks.onComplete?.(id);
      this.activeDirectiveId = null;
      this.unload();
    }
  };

  /** Play paragraph/sentence TTS for a directive. Stops any prior playback. */
  async play(directiveId: string, callbacks: PlaybackCallbacks): Promise<void> {
    if (this.activeDirectiveId && this.activeDirectiveId !== directiveId) {
      await this.stop();
    }
    this.callbacks = callbacks;
    this.activeDirectiveId = directiveId;
    this.setState("loading");

    try {
      await this.ensureAudioMode();
      const fileUri = await this.fetchToFile(
        `${BASE}/english/audio/tts?directive_id=${encodeURIComponent(directiveId)}`,
        directiveId
      );
      // Another play() may have superseded us while fetching
      if (this.activeDirectiveId !== directiveId) return;

      this.setState("buffering");
      await this.unload();
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true },
        this.onStatus
      );
      if (this.activeDirectiveId !== directiveId) {
        await sound.unloadAsync().catch(() => {});
        return;
      }
      this.sound = sound;
      this.setState("playing");
    } catch (err: any) {
      if (this.activeDirectiveId === directiveId) {
        this.setState("error");
        callbacks.onError?.(directiveId, err?.message || "Playback error");
        this.activeDirectiveId = null;
      }
    }
  }

  /** Play a single word/syllable (tap on a difficult word). */
  async playWord(
    word: string,
    grade = 5,
    slow = false,
    callbacks: PlaybackCallbacks = {}
  ): Promise<void> {
    await this.stop();
    this.callbacks = callbacks;
    const key = `word-${word}`;
    this.activeDirectiveId = key;
    this.setState("loading");
    try {
      await this.ensureAudioMode();
      const url = `${BASE}/english/audio/word-tts?word=${encodeURIComponent(
        word
      )}&grade=${grade}&slow=${slow}`;
      const fileUri = await this.fetchToFile(url, encodeURIComponent(word));
      if (this.activeDirectiveId !== key) return;
      this.setState("buffering");
      await this.unload();
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true },
        this.onStatus
      );
      this.sound = sound;
      this.setState("playing");
    } catch (err: any) {
      this.setState("error");
      callbacks.onError?.(key, err?.message || "Playback error");
      this.activeDirectiveId = null;
    }
  }

  async pause() {
    if (this.state !== "playing" || !this.sound) return;
    try {
      await this.sound.pauseAsync();
      this.setState("paused");
    } catch {
      /* ignore */
    }
  }

  async resume() {
    if (this.state !== "paused" || !this.sound) return;
    try {
      await this.sound.playAsync();
      this.setState("playing");
    } catch {
      /* ignore */
    }
  }

  async stop() {
    this.activeDirectiveId = null;
    await this.unload();
    this.setState("stopped");
  }

  getState(): PlaybackState {
    return this.state;
  }

  getActiveDirectiveId(): string | null {
    return this.activeDirectiveId;
  }
}

/** Convert an ArrayBuffer to a base64 string without Node Buffer. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result +=
      chars[(n >> 18) & 63] +
      chars[(n >> 12) & 63] +
      chars[(n >> 6) & 63] +
      chars[n & 63];
  }
  if (i < bytes.length) {
    const rem = bytes.length - i;
    const b0 = bytes[i];
    const b1 = rem > 1 ? bytes[i + 1] : 0;
    const n = (b0 << 16) | (b1 << 8);
    result += chars[(n >> 18) & 63] + chars[(n >> 12) & 63];
    result += rem > 1 ? chars[(n >> 6) & 63] : "=";
    result += "=";
  }
  return result;
}

export const audioPlayerService = new AudioPlayerService();
