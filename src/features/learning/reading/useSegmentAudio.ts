"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSegmentAudio, ListenError, LISTEN_MESSAGES, type ListenProblem } from "./passageAudio";

export type ListenPhase = "idle" | "loading" | "playing" | "paused";

export interface SegmentAudio {
  phase: ListenPhase;
  /** A plain sentence for the learner when the audio could not be had or played; null otherwise. */
  problem: string | null;
  play: () => void;
  pause: () => void;
  stop: () => void;
  replay: () => void;
}

export interface AudioDeps {
  fetchAudio: (instanceId: string, passageId: string, segment: number) => Promise<Blob>;
  createAudio: () => HTMLAudioElement;
  objectUrl: (blob: Blob) => string;
  revokeUrl: (url: string) => void;
}

const browserDeps: AudioDeps = {
  fetchAudio: fetchSegmentAudio,
  createAudio: () => new Audio(),
  objectUrl: (blob) => URL.createObjectURL(blob),
  revokeUrl: (url) => URL.revokeObjectURL(url),
};

/** Only one part plays at a time: starting one stops the one before it. */
let current: { stop: () => void } | null = null;

/**
 * Listen to one part of a passage: play, pause, stop and replay. The server makes (or remembers) the audio; this keeps it for
 * the page only, as an object URL it revokes when the part is left. Listening is never an answer, an engagement or progress,
 * so nothing is sent to the lesson.
 */
export function useSegmentAudio(
  instanceId: string | null,
  passageId: string,
  segment: number,
  deps: AudioDeps = browserDeps,
  onEnded?: () => void,
): SegmentAudio {
  const [phase, setPhase] = useState<ListenPhase>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const element = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const loading = useRef(false);
  const generation = useRef(0);
  const self = useRef({ stop: () => {} });

  const release = useCallback(() => {
    element.current?.pause();
    element.current = null;
    if (url.current) deps.revokeUrl(url.current);
    url.current = null;
  }, [deps]);

  const stop = useCallback(() => {
    const audio = element.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPhase("idle");
  }, []);
  useEffect(() => {
    self.current.stop = stop;
  }, [stop]);

  const invalidateLoad = useCallback(() => {
    generation.current++;
    loading.current = false;
  }, []);

  // A different part, or leaving the lesson: drop this one's audio.
  useEffect(() => {
    const mine = self.current;
    return () => {
      invalidateLoad();
      release();
      if (current === mine) current = null;
    };
  }, [invalidateLoad, release, passageId, segment, instanceId]);

  const fail = useCallback((why: ListenProblem) => {
    setProblem(LISTEN_MESSAGES[why]);
    setPhase("idle");
  }, []);

  const start = useCallback(async () => {
    if (!instanceId || loading.current) return;
    setProblem(null);
    if (current && current !== self.current) current.stop();
    current = self.current;
    const mine = generation.current;
    if (!element.current) {
      loading.current = true;
      setPhase("loading");
      try {
        const blob = await deps.fetchAudio(instanceId, passageId, segment);
        if (mine !== generation.current || current !== self.current) return;
        const audio = deps.createAudio();
        url.current = deps.objectUrl(blob);
        audio.src = url.current;
        audio.onended = () => {
          setPhase("idle");
          onEnded?.();
        };
        audio.onerror = () => fail("unsupported");
        element.current = audio;
      } catch (error) {
        if (mine !== generation.current || current !== self.current) return;
        fail(error instanceof ListenError ? error.problem : "unavailable");
        return;
      } finally {
        if (mine === generation.current) loading.current = false;
      }
    }
    try {
      await element.current.play();
      if (mine === generation.current && current === self.current) setPhase("playing");
    } catch {
      if (mine === generation.current) fail("unsupported");
    }
  }, [instanceId, passageId, segment, deps, fail, onEnded]);

  const pause = useCallback(() => {
    element.current?.pause();
    setPhase("paused");
  }, []);

  const replay = useCallback(() => {
    if (element.current) element.current.currentTime = 0;
    void start();
  }, [start]);

  return { phase, problem, play: () => void start(), pause, stop, replay };
}
