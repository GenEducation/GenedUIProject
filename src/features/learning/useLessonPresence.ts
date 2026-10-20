"use client";

import { useEffect, useState } from "react";
import { useIdle } from "@/hooks/useIdle";
import { lessonService } from "./lessonService";

/** `H`: a text presence beat every 30 s while the learner is here (LEARNING_ACTIVITY_v1 §4). */
export const PRESENCE_BEAT_MS = 30_000;
/** `IDLE`: no input and no streamed reply for this long ends text presence. */
export const PRESENCE_IDLE_MS = 120_000;
/** While the server answers `active: false`, beats slow down to `4 × H`. */
export const PRESENCE_BACKOFF = 4;

interface LessonPresence {
  /** The open lesson (plan instance), or null before it loads. */
  instanceId: string | null;
  /** The lesson screen has loaded (`status === "ready"`). */
  ready: boolean;
  /** A teacher reply is streaming to this tab right now. */
  streaming: boolean;
  /** A voice session is live in this tab: voice presence comes from the server then, never from text beats. */
  voiceRunning: boolean;
}

/**
 * Tells the backend the learner is studying this lesson in this tab, so estimated learning time is credited
 * (`POST /v1/instances/{id}/presence`, LEARNING_ACTIVITY_v1 §4.4, §7). Having a lesson open is never studying: a beat
 * is sent only while the lesson is ready, the page is visible, no voice session runs here, and there was input or a
 * streamed reply in the last two minutes. It sends one at once when that starts to hold (the lesson becomes ready,
 * the page becomes visible, the first input after idle), then one every 30 s, and stops the moment it no longer holds.
 * A failed beat is dropped, never queued or replayed. The tab's `source_id` is random per mount and kept in memory only.
 */
export function useLessonPresence({ instanceId, ready, streaming, voiceRunning }: LessonPresence): void {
  const [sourceId] = useState(() => crypto.randomUUID());
  const idle = useIdle(PRESENCE_IDLE_MS);
  const visible = usePageVisible();
  const streamedRecently = useRecently(streaming, PRESENCE_IDLE_MS);
  const present = Boolean(instanceId) && ready && visible && !voiceRunning && (!idle || streamedRecently);

  useEffect(() => {
    if (!present || !instanceId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const beat = async () => {
      let interval = PRESENCE_BEAT_MS;
      try {
        const { active } = await lessonService.presence(instanceId, sourceId);
        if (!active) interval = PRESENCE_BEAT_MS * PRESENCE_BACKOFF;
      } catch {
        // Dropped: a lost beat is never queued or replayed.
      }
      if (!stopped) timer = setTimeout(beat, interval);
    };
    void beat();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [present, instanceId, sourceId]);
}

/** Whether the page is visible, following `visibilitychange`. */
function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

/** `on`, and for `forMs` after it last turned off. */
function useRecently(on: boolean, forMs: number): boolean {
  const [recent, setRecent] = useState(on);
  const [wasOn, setWasOn] = useState(on);
  if (on !== wasOn) {
    // Adjusted while rendering, as React recommends for state that follows a prop.
    setWasOn(on);
    if (on) setRecent(true);
  }
  useEffect(() => {
    if (on || !recent) return;
    const timer = setTimeout(() => setRecent(false), forMs);
    return () => clearTimeout(timer);
  }, [on, recent, forMs]);
  return on || recent;
}
