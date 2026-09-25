"use client";

import { useEffect, useState } from "react";
import { voiceService } from "../services/voiceService";

/** Mic RMS above this counts as the student talking (post echo-cancel + AGC). */
export const TALK_THRESHOLD = 0.02;
/** Talking holds this long past the last loud buffer, so pauses between words don't flicker. */
export const TALK_HOLD_MS = 600;
/** ~15Hz: plenty for a face, cheap enough to leave on for a whole session. */
const POLL_MS = 66;

/**
 * Whether the student is speaking into the mic right now.
 *
 * Polls only while `active` (a voice session is live), and re-renders only
 * when the answer flips — never per sample.
 */
export function useStudentTalking(active: boolean): boolean {
  const [talking, setTalking] = useState(false);

  useEffect(() => {
    if (!active) return;
    let lastLoudAt = 0;
    let current: boolean | null = null;
    const id = window.setInterval(() => {
      const now = performance.now();
      if (voiceService.getInputLevel() > TALK_THRESHOLD) lastLoudAt = now;
      const next = now - lastLoudAt < TALK_HOLD_MS;
      if (next !== current) {
        current = next;
        setTalking(next);
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [active]);

  // A stale `true` from the last session must not leak into the next one.
  return active && talking;
}

/**
 * Drive a CSS custom property from the tutor's playback level while `active`,
 * written straight to the element — this changes 15 times a second and must
 * not go through React state.
 *
 * `--pet-talk` is 0–1, eased so the bob swells and settles rather than
 * twitching sample to sample.
 */
export function useTutorLevelVar(element: HTMLElement | null, active: boolean): void {
  useEffect(() => {
    if (!element || !active) {
      element?.style.setProperty("--pet-talk", "0");
      return;
    }
    let level = 0;
    const id = window.setInterval(() => {
      // Speech RMS rarely passes ~0.25; scale so normal speech spans most of 0–1.
      const target = Math.min(1, voiceService.getOutputLevel() * 4);
      level += (target - level) * 0.5;
      element.style.setProperty("--pet-talk", level.toFixed(3));
    }, POLL_MS);
    return () => {
      window.clearInterval(id);
      element.style.setProperty("--pet-talk", "0");
    };
  }, [element, active]);
}
