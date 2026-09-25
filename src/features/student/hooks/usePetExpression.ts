"use client";

import { useEffect, useRef, useState } from "react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useTestStore } from "@/features/student/store/useTestStore";
import { usePetStore } from "@/features/student/store/usePetStore";
import { usePlacementStore } from "@/features/placement/store/usePlacementStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useStudentTalking } from "./useVoiceLevels";
import {
  BACKEND_EMOTIONS,
  EMOTION_HANDOFF,
  PET_EMOTIONS,
  type PetEmotion,
} from "../theme/petExpressions";
import { LOCAL_SOURCES, fromStreakChange, fromTestVerdict } from "../utils/petEvents";

/**
 * What the student's pet is feeling right now.
 *
 * Two kinds of emotion, resolved in one precedence list:
 *
 *  - **Bursts** — a reaction that holds for a moment and ends: everything that
 *    arrives through `usePetStore.fireEmotion`, whether from a backend
 *    `pet_emotion` frame or from a local source (a widget answer, a test
 *    verdict, a streak, a notification). Each emotion's hold comes from the
 *    registry.
 *  - **Sustained states** — derived from state the app already keeps, lasting
 *    exactly as long as their condition: the tutor talking, the student
 *    talking, a muted mic, the tutor generating, the student gone quiet.
 *
 * Gesture reactions (pat, shake, hover) sit above all of this and live in
 * `PetCompanion`, which owns the pointer.
 *
 * Tone: positive only, matching the tutor. A wrong answer is `encouraging`
 * ("so close, go on"), reassurance is `supportive`; nothing frowns.
 */

/** Notifications can arrive in bursts; the buddy reacts to at most one a minute. */
const NOTICE_COOLDOWN_MS = 60000;
/**
 * The longest the pet will think after the child finishes speaking, waiting
 * for the tutor's first word. The wait is the tutor's whole think — the model,
 * any tools, and the backend's hold for the pet reaction (≤ 2.5 s) — so it is
 * sized generously; it only exists so a reply that never comes (a barge-in
 * drops it) cannot leave the pet thinking forever.
 */
export const AWAIT_REPLY_MS = 12_000;
/** On one test question this long without an answer changing: think along. */
export const STUCK_MS = 25_000;

/**
 * How strongly a burst holds its ground. A newer burst replaces the current
 * one unless it ranks lower — a notification must not cut a celebration short.
 */
const BURST_RANK: Partial<Record<PetEmotion, number>> = {
  // Every backend reaction ranks alike — derived, so a roster addition can
  // never land unranked and be cut short by a notification.
  ...Object.fromEntries(BACKEND_EMOTIONS.map((e) => [e, 2])),
  celebration: 3,
  noticing: 1, love: 1,
};

export function usePetExpression(): PetEmotion {
  const isAITyping = useStudentStore((s) => s.isAITyping);
  const voiceSessionStatus = useStudentStore((s) => s.voiceSessionStatus);
  const connectionQuality = useStudentStore((s) => s.connectionQuality);
  const isMuted = useStudentStore((s) => s.isMuted);
  const pttHeld = useStudentStore((s) => s.pttHeld);
  const studentStats = useStudentStore((s) => s.studentStats);
  const isSubmitting = useTestStore((s) => s.isSubmitting);
  const testResult = useTestStore((s) => s.testResult);
  const currentTest = useTestStore((s) => s.currentTest);
  const testAnswers = useTestStore((s) => s.answers);
  const placementPhase = usePlacementStore((s) => s.phase);
  const placementCompletedAt = usePlacementStore((s) => s.completedAt);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const notificationsFetched = useNotificationStore((s) => s.hasFetched);
  const petBurst = usePetStore((s) => s.petBurst);
  const fireEmotion = usePetStore((s) => s.fireEmotion);

  const voiceActive = voiceSessionStatus === "active";
  const micOpen = voiceActive && (!isMuted || pttHeld);
  const studentTalking = useStudentTalking(micOpen);

  // ── Bursts ────────────────────────────────────────────────────────────────

  const [burst, setBurst] = useState<PetEmotion | null>(null);
  const burstRef = useRef<PetEmotion | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Show a burst for its registered hold, then hand off or clear. */
  const show = (emotion: PetEmotion) => {
    if (timer.current) clearTimeout(timer.current);
    burstRef.current = emotion;
    setBurst(emotion);
    timer.current = setTimeout(() => {
      const next = EMOTION_HANDOFF[emotion];
      if (next) {
        show(next);
      } else {
        burstRef.current = null;
        setBurst(null);
      }
    }, PET_EMOTIONS[emotion].holdMs ?? 2000);
  };

  const burstId = petBurst?.id ?? null;
  useEffect(() => {
    if (!petBurst) return;
    const current = burstRef.current;
    if (current && (BURST_RANK[petBurst.emotion] ?? 0) < (BURST_RANK[current] ?? 0)) return;
    show(petBurst.emotion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstId]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // ── Local sources ─────────────────────────────────────────────────────────

  // A result arriving is the event; the graded submission id is what changes.
  // Keyed on the id rather than the object so a re-fetch of the same
  // submission does not re-fire on every render.
  const submissionId = testResult?.submission_id ?? null;
  useEffect(() => {
    if (!submissionId || !testResult || !LOCAL_SOURCES.test) return;
    const emotion = fromTestVerdict(testResult.overall_verdict);
    if (emotion) fireEmotion(emotion, "local:test");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  /**
   * The day streak, compared against the last value seen — in this session,
   * or on this device last visit.
   *
   * The first in-session observation must not be compared against `0`: the
   * first stats fetch jumps from nothing to a streak of 7, and read naively
   * that is a streak event on every app load. With no remembered value it
   * fires nothing; with one, a streak gained or lost *between* visits is real.
   */
  const prevStreak = useRef<number | null>(null);
  const currentStreak = studentStats?.currentStreak ?? null;
  useEffect(() => {
    if (currentStreak === null) return;
    const store = usePetStore.getState();
    const prev = prevStreak.current ?? store.petLastSeenStreak;
    prevStreak.current = currentStreak;
    if (store.petLastSeenStreak !== currentStreak) store.setPetLastSeenStreak(currentStreak);
    if (!LOCAL_SOURCES.dayStreak) return;
    const emotion = fromStreakChange(prev, currentStreak);
    if (emotion) fireEmotion(emotion, "local:dayStreak");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStreak]);

  /**
   * Placement complete. The pet is suppressed while the placement flow owns the
   * screen, so the celebration waits until the student leaves the completion
   * screen and the pet is back. Requires having *seen* `complete` this session,
   * so resuming an already-finished attempt never celebrates.
   */
  const pendingPlacement = useRef<number | null>(null);
  useEffect(() => {
    if (placementPhase === "complete" && placementCompletedAt) {
      pendingPlacement.current = placementCompletedAt;
      return;
    }
    // `finish()` resets the store to "unavailable" — the same closed set the
    // student layout uses to un-suppress the pet.
    const closed =
      placementPhase === "idle" || placementPhase === "checking" || placementPhase === "unavailable";
    if (pendingPlacement.current !== null && closed) {
      pendingPlacement.current = null;
      if (LOCAL_SOURCES.placement) fireEmotion("celebration", "local:placement");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementPhase, placementCompletedAt]);

  /**
   * Something landed in the notification stream and the buddy noticed.
   *
   * Gated on `hasFetched` because `unreadCount` starts at 0 and a genuine zero
   * is indistinguishable from "not loaded yet" — without it the first fetch
   * reads as an arrival. The first observation seeds and fires nothing.
   */
  const prevUnread = useRef<number | null>(null);
  const lastNoticeAt = useRef(0);
  useEffect(() => {
    if (!notificationsFetched) return;
    const prev = prevUnread.current;
    prevUnread.current = unreadCount;
    if (prev === null || unreadCount <= prev) return;
    const now = Date.now();
    if (now - lastNoticeAt.current < NOTICE_COOLDOWN_MS) return;
    lastNoticeAt.current = now;
    fireEmotion("noticing", "local:notification");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount, notificationsFetched]);

  /**
   * Stuck on a test question: no answer has changed for `STUCK_MS`. The timer
   * records *which* answers object it expired on, so any change in answers
   * un-sticks immediately without a synchronous reset.
   */
  const testInProgress = !!currentTest && !testResult;
  const [stuckOn, setStuckOn] = useState<object | null>(null);
  useEffect(() => {
    if (!testInProgress) return;
    const t = setTimeout(() => setStuckOn(testAnswers), STUCK_MS);
    return () => clearTimeout(t);
  }, [testInProgress, testAnswers]);
  const stuck = testInProgress && stuckOn === testAnswers;

  /**
   * Where the voice turn is, read off the transcript the store already keeps.
   * `isAITyping` alone cannot say: the store sets it for the tutor's
   * "Thinking…" (`planning`) bubble and its tool status as well as for its
   * words, and a `status` frame can clear it mid-think — which is how the pet
   * used to show Speaking while the tutor thought, then drop to Idle.
   *
   *  - `child`: the child spoke last; the tutor has not answered yet.
   *  - `tutorThinking`: the tutor's latest message has no words yet — a
   *    "Thinking…" bubble or a tool status.
   *  - `tutorTalking`: the tutor's reply has words.
   */
  const voiceTurn = useStudentStore((s) => {
    const m = s.messages[s.messages.length - 1];
    if (!m) return null;
    if (m.sender === "user") return `child:${m.id}:${m.text.length}`;
    if (m.isPlanning || (!m.text.trim() && m.toolStatus)) return `tutorThinking:${m.id}`;
    return "tutorTalking";
  });
  // Each wait is bounded, keyed on what it is waiting on (as `stuck` is), so
  // a reply that never comes cannot leave the pet thinking forever.
  const [waitExpiredOn, setWaitExpiredOn] = useState<string | null>(null);
  const waiting = voiceTurn?.startsWith("child:") || voiceTurn?.startsWith("tutorThinking:");
  useEffect(() => {
    if (!voiceActive || !waiting || !voiceTurn) return;
    const t = setTimeout(() => setWaitExpiredOn(voiceTurn), AWAIT_REPLY_MS);
    return () => clearTimeout(t);
  }, [voiceActive, waiting, voiceTurn]);
  const tutorThinking = voiceActive && !!waiting && waitExpiredOn !== voiceTurn;
  // No transcript yet (a session's opening line) counts as talking too.
  const tutorTalking = voiceActive && isAITyping && (voiceTurn === "tutorTalking" || voiceTurn === null);

  // ── Resolve ───────────────────────────────────────────────────────────────

  if (burst) return burst;
  if (tutorTalking) return "speaking";
  if (micOpen && (studentTalking || pttHeld)) return "listening";
  if (
    voiceSessionStatus === "connecting" ||
    (voiceActive && (connectionQuality === "poor" || connectionQuality === "reconnecting"))
  ) {
    return "reconnecting";
  }
  // Waiting on the tutor outranks Muted: in push-to-talk the mic closes the
  // moment the child lets go, and that pause is thinking, not a muted mic.
  if (tutorThinking) return "thinking";
  if (voiceActive && isMuted && !pttHeld) return "muted";
  if (isAITyping || isSubmitting || stuck) return "thinking";
  return "idle";
}
