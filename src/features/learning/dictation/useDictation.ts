"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Dictation for the chat box: the browser's own speech recognition (Chrome,
 * Edge, Safari). In Chrome the audio is transcribed by Google's servers.
 * Where the browser has none (Firefox), `supported` is false and the mic hides.
 *
 * The recogniser gives no audio level, so while listening the microphone is
 * also opened through Web Audio for the waveform; that stream never leaves
 * the page.
 */

/** The slice of the Web Speech API this uses (not in the DOM typings). */
interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type DictationState = "idle" | "listening";

export interface Dictation {
  supported: boolean;
  state: DictationState;
  /** Everything heard so far: settled words, then the words still being recognised. */
  transcript: string;
  /** Microphone level 0..1 for the waveform. */
  level: number;
  seconds: number;
  /** Why dictation stopped, in words for the learner (cleared on the next start). */
  error: string | null;
  start: () => void;
  /** Stop and keep what was heard; returns it. */
  stop: () => string;
  /** Stop and throw away what was heard. */
  cancel: () => void;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow it in your browser to dictate.",
  "service-not-allowed": "Microphone access is blocked. Allow it in your browser to dictate.",
  "audio-capture": "No microphone was found.",
  network: "Dictation needs an internet connection.",
};

const noSubscribe = () => () => {};

const join = (a: string, b: string) => [a.trim(), b.trim()].filter(Boolean).join(" ");

export function useDictation(lang = "en-IN"): Dictation {
  // False on the server and the first client render, so they agree; the real answer on the client.
  const supported = useSyncExternalStore(noSubscribe, () => recognitionCtor() !== null, () => false);
  const [state, setState] = useState<DictationState>("idle");
  const [settled, setSettled] = useState("");
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognition = useRef<Recognition | null>(null);
  /** Whether the learner still wants to listen: Chrome ends a session on long silence, and it is restarted. */
  const wanted = useRef(false);
  const settledRef = useRef("");
  const interimRef = useRef("");
  const audio = useRef<{ ctx: AudioContext; stream: MediaStream; frame: number } | null>(null);

  const stopAudio = useCallback(() => {
    const a = audio.current;
    audio.current = null;
    if (!a) return;
    cancelAnimationFrame(a.frame);
    a.stream.getTracks().forEach((t) => t.stop());
    void a.ctx.close().catch(() => undefined);
    setLevel(0);
  }, []);

  const startAudio = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!wanted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
        if (audio.current) audio.current.frame = requestAnimationFrame(tick);
      };
      audio.current = { ctx, stream, frame: requestAnimationFrame(tick) };
    } catch {
      // The waveform is decoration; recognition reports a blocked mic itself.
    }
  }, []);

  const finish = useCallback(() => {
    wanted.current = false;
    const r = recognition.current;
    recognition.current = null;
    if (r) {
      r.onend = null;
      r.onresult = null;
      r.onerror = null;
      try {
        r.abort();
      } catch {
        // already stopped
      }
    }
    stopAudio();
    setState("idle");
  }, [stopAudio]);

  const begin = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = lang;
    r.onresult = (e) => {
      let finals = "";
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) finals = join(finals, text);
        else pending = join(pending, text);
      }
      if (finals) {
        settledRef.current = join(settledRef.current, finals);
        setSettled(settledRef.current);
      }
      interimRef.current = pending;
      setInterim(pending);
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setError(ERRORS[e.error] ?? "Dictation stopped. Try again.");
      finish();
    };
    r.onend = () => {
      // A recogniser that ends on its own (silence, time limit) while the learner is still dictating is restarted.
      if (wanted.current) {
        settledRef.current = join(settledRef.current, interimRef.current);
        setSettled(settledRef.current);
        interimRef.current = "";
        setInterim("");
        try {
          r.start();
        } catch {
          finish();
        }
      }
    };
    recognition.current = r;
    r.start();
  }, [finish, lang]);

  const start = useCallback(() => {
    if (wanted.current) return;
    wanted.current = true;
    settledRef.current = "";
    interimRef.current = "";
    setSettled("");
    setInterim("");
    setSeconds(0);
    setError(null);
    setState("listening");
    try {
      begin();
    } catch {
      setError("Dictation couldn't start.");
      finish();
      return;
    }
    void startAudio();
  }, [begin, finish, startAudio]);

  const stop = useCallback(() => {
    const heard = join(settledRef.current, interimRef.current);
    finish();
    return heard;
  }, [finish]);

  const cancel = useCallback(() => {
    finish();
    settledRef.current = "";
    interimRef.current = "";
    setSettled("");
    setInterim("");
  }, [finish]);

  // The recording timer.
  useEffect(() => {
    if (state !== "listening") return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  // Never leave the mic open when the box goes away.
  useEffect(() => () => finish(), [finish]);

  return { supported, state, transcript: join(settled, interim), level, seconds, error, start, stop, cancel };
}
