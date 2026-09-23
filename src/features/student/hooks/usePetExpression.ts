"use client";

import { useEffect, useRef, useState } from "react";
import { idle, thinking, happy, unsure, sleepy, wink, surprised } from "blobatar/expression";
import type { Expression } from "blobatar";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useTestStore } from "@/features/student/store/useTestStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useIdle } from "@/hooks/useIdle";
import { useHydrated } from "@/hooks/useHydrated";

/**
 * The pose the student's creature is holding, derived from state the app
 * already keeps. Adds no state of its own.
 *
 * Expressions are a **state, not an event** — blobatar has no timers and
 * nothing returns to `idle` by itself. Anything that should read as a burst
 * (a celebration, a result) therefore schedules its own clear here, mirroring
 * the 3s pattern `StudentHome` already uses for its AI companion.
 *
 * Two of the triggers here watch a number *increase* rather than a value, and
 * both deliberately ignore their first observation — see `prevStreak` below.
 *
 * Tone: `sad`, `sick` and `scared` are deliberately absent from this app's
 * roster. A creature that looks ill at a child who scored badly is a worse
 * product, not a cuter one — a weak result gets `unsure`, which reads as
 * "hmm, let's look at this" rather than as a verdict on the student.
 */

/** How long a celebratory burst holds before easing back to `idle`. */
const BURST_MS = 2000;
/** A streak milestone is rare and earned, so it holds a little longer. */
const WINK_MS = 2600;
/** Noticing a notification is a glance, not an event. */
const NOTICE_MS = 1400;
/** Notifications can arrive in bursts; the buddy reacts to at most one a minute. */
const NOTICE_COOLDOWN_MS = 60000;
/** No pointer, key or scroll for this long and the buddy dozes off. */
const IDLE_MS = 3 * 60 * 1000;
/** Streak lengths worth a reaction, beyond simply beating your own record. */
const STREAK_MILESTONES = [3, 7, 30];

export function usePetExpression(): Expression {

  // The clock is deliberately not read on the first render: client components
  // are still server-rendered, the server's timezone is not the student's, and
  // a different pose on each side is different SVG — a hydration mismatch.
  const hydrated = useHydrated();
  const isAITyping = useStudentStore((s) => s.isAITyping);
  const isSubmitting = useTestStore((s) => s.isSubmitting);
  const testResult = useTestStore((s) => s.testResult);
  const studentStats = useStudentStore((s) => s.studentStats);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const notificationsFetched = useNotificationStore((s) => s.hasFetched);
  const isIdle = useIdle(IDLE_MS);

  // A burst is a pose plus an expiry. Held in state so the clear re-renders.
  const [burst, setBurst] = useState<Expression | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fire = (pose: Expression, holdMs: number = BURST_MS) => {
    if (timer.current) clearTimeout(timer.current);
    setBurst(pose);
    timer.current = setTimeout(() => setBurst(null), holdMs);
  };

  /**
   * Previous values for the two triggers that watch a number go **up**.
   *
   * `null` means "not yet observed", and that distinction is the whole point.
   * On mount both jump from nothing to their real value — the first stats
   * fetch sets a streak of 7, the first notification fetch sets an unread
   * count of 5 — and compared against an initial `0` that reads as an
   * increase. The buddy would then wink and act startled *every time the app
   * loads*, which looks like a charming greeting rather than the bug it is.
   * So the first observation seeds the ref and fires nothing.
   */
  const prevStreak = useRef<number | null>(null);
  const prevUnread = useRef<number | null>(null);
  const lastNoticeAt = useRef(0);

  // A result arriving is the event; the graded submission id is what changes.
  // Keyed on the id rather than the object so a re-fetch of the same
  // submission does not re-fire the burst on every render.
  const submissionId = testResult?.submission_id ?? null;
  useEffect(() => {
    if (!submissionId || !testResult) return;
    // `overall_verdict` is the app's own notion of how it went, which is a
    // better signal than an arbitrary cutoff on `overall_score`.
    fire(testResult.overall_verdict === "BELOW" ? unsure : happy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  // A streak the student just extended past their own record, or past a round
  // number worth noticing.
  const currentStreak = studentStats?.currentStreak ?? null;
  const longestStreak = studentStats?.longestStreak ?? null;
  useEffect(() => {
    if (currentStreak === null) return;
    const prev = prevStreak.current;
    prevStreak.current = currentStreak;
    if (prev === null || currentStreak <= prev) return;

    const beatOwnRecord = longestStreak !== null && currentStreak >= longestStreak;
    const hitMilestone = STREAK_MILESTONES.includes(currentStreak);
    if (beatOwnRecord || hitMilestone) fire(wink, WINK_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStreak]);

  // Something landed in the notification stream and the buddy noticed.
  //
  // Gated on `hasFetched` because `unreadCount` starts at 0 and a genuine zero
  // is indistinguishable from "not loaded yet" — without it the first fetch
  // reads as an arrival and the buddy is startled on every app open.
  useEffect(() => {
    if (!notificationsFetched) return;
    const prev = prevUnread.current;
    prevUnread.current = unreadCount;
    if (prev === null || unreadCount <= prev) return;

    const now = Date.now();
    if (now - lastNoticeAt.current < NOTICE_COOLDOWN_MS) return;
    lastNoticeAt.current = now;
    fire(surprised, NOTICE_MS);
  }, [unreadCount, notificationsFetched]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Precedence: a burst outranks an ongoing process, which outranks the clock.
  if (burst) return burst;
  if (isAITyping || isSubmitting) return thinking;
  // Dozing because the student went quiet reads as far more alive than dozing
  // because of the wall clock — but both count.
  if (isIdle) return sleepy;
  if (hydrated && isLateEvening()) return sleepy;
  return idle;
}

/**
 * After 21:00, matching the upper band of `StudentHome`'s `getGreeting()`
 * ("Hey" rather than "Evening"), so the greeting and the creature agree about
 * how late it is.
 */
function isLateEvening(): boolean {
  const h = new Date().getHours();
  return h >= 21 || h < 5;
}
