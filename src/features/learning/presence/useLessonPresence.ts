import { useEffect, useRef } from "react";
import { lessonService } from "../lessonService";
import { useLessonStore } from "../useLessonStore";
import { BACKOFF_MS, BEAT_MS, mayBeat } from "./rules";

const INPUT_EVENTS = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel", "scroll"] as const;
/** Pointer moves and scrolls are noisy: one mark per second is enough for a two-minute window. */
const INPUT_THROTTLE_MS = 1_000;

/**
 * Tells the backend this lesson tab is being used, so studying time can be estimated (LEARNING_ACTIVITY_v1 §4.4, §7).
 * An open lesson is never studying: a beat goes out only while the lesson is ready, the tab is visible, the learner
 * gave input or a reply streamed within the idle window, and no voice session runs here. It is sent when the lesson
 * becomes ready, when the tab becomes visible, on the first input after idle, and then every `H`; after an
 * `active: false` answer it waits `4 × H`. A failed beat is dropped: nothing is queued or replayed.
 */
export function useLessonPresence(instanceId: string): void {
  const ready = useLessonStore((s) => s.status === "ready");
  const voiceRunning = useLessonStore((s) => s.voiceSessionId !== null);
  const streaming = useLessonStore((s) => s.turns.some((t) => t.status === "streaming"));
  const mark = useRef({ input: null as number | null, stream: null as number | null });
  const live = useRef({ ready, voiceRunning, streaming });
  useEffect(() => {
    live.current = { ready, voiceRunning, streaming };
  });
  const beat = useRef<(() => void) | null>(null);

  useEffect(() => {
    // A reply streaming is activity, and so is its end (the last thing the learner was shown).
    if (streaming || mark.current.stream !== null) mark.current.stream = Date.now();
  }, [streaming]);

  useEffect(() => {
    const sourceId = crypto.randomUUID();
    let timer: number | undefined;
    let inFlight = false;
    let stopped = false;
    let delay = BEAT_MS;

    const eligible = () =>
      mayBeat({
        ready: live.current.ready,
        voiceRunning: live.current.voiceRunning,
        visible: document.visibilityState === "visible",
        lastInputAt: mark.current.input,
        lastStreamAt: live.current.streaming ? Date.now() : mark.current.stream,
        now: Date.now(),
      });

    const schedule = () => {
      window.clearTimeout(timer);
      if (!stopped) timer = window.setTimeout(send, delay);
    };

    const send = () => {
      if (stopped) return;
      if (inFlight || !eligible()) return schedule();
      inFlight = true;
      lessonService
        .presence(instanceId, sourceId)
        .then(({ active }) => {
          delay = active ? BEAT_MS : BACKOFF_MS;
        })
        .catch(() => {
          /* dropped: a lost beat is an under-count */
        })
        .finally(() => {
          inFlight = false;
          schedule();
        });
    };
    beat.current = send;

    let lastMark = 0;
    const onInput = () => {
      const now = Date.now();
      if (now - lastMark < INPUT_THROTTLE_MS) return;
      lastMark = now;
      const wasIdle = mark.current.input === null || now - mark.current.input > BEAT_MS * 4;
      mark.current.input = now;
      if (wasIdle) send(); // the first input after idle
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") send();
    };
    for (const name of INPUT_EVENTS) window.addEventListener(name, onInput, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisible);
    schedule();
    return () => {
      stopped = true;
      beat.current = null;
      window.clearTimeout(timer);
      for (const name of INPUT_EVENTS) window.removeEventListener(name, onInput, { capture: true });
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [instanceId]);

  useEffect(() => {
    if (ready) beat.current?.(); // the lesson became ready
  }, [ready]);
}
