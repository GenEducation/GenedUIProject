"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formatDateDisplay, formatTimeDisplay, scheduledSessionStartMs } from "@/utils/datetime";
import { useNow } from "@/utils/useNow";
import type { ScheduleSessionResponse } from "../types/schedule";
import { useTestStore } from "../store/useTestStore";
import { STUDENT_COLORS as C } from "../theme/colors";
import { SessionCountdown } from "./SessionCountdown";

/** Spoken form of the remaining time, for the timer's aria-label. */
function spokenRemaining(hours: number, minutes: number): string {
  const parts: string[] = [];
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes || !hours) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  return `Starts in ${parts.join(" ")}`;
}

/** Whole hours and minutes between now and the start. */
function remainingParts(startMs: number, now: number) {
  const totalMinutes = Math.max(0, Math.floor((startMs - now) / 60_000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

interface UpcomingSessionPanelProps {
  session: ScheduleSessionResponse;
  style?: React.CSSProperties;
}

/**
 * Dashboard hero panel for a session that starts within the next 24 hours.
 *
 * Takes the slot Continue Learning normally occupies, and matches its shell
 * geometry exactly so the two swap without the layout shifting.
 */
export function UpcomingSessionPanel({ session, style }: UpcomingSessionPanelProps) {
  const router = useRouter();
  const loadTest = useTestStore((s) => s.loadTest);
  const [isStarting, setIsStarting] = useState(false);

  const startMs = scheduledSessionStartMs(session.scheduled_date, session.scheduled_time);

  // The shared 5s clock is plenty now that the display stops at minutes — no
  // dedicated per-second interval. Before mount it returns 0, so the server and
  // first client paint both render the countdown branch and hydration matches.
  const now = useNow();
  const hasStarted = now !== 0 && now >= startMs;
  const remaining = now === 0 ? null : remainingParts(startMs, now);

  const isReady = session.preparation_status === "COMPLETED" && !!session.session_id;

  const title = session.topic
    ? `${session.topic} — ${session.subject}`
    : session.subject;

  const startTime = formatTimeDisplay(session.scheduled_time) ?? "9:00 AM";
  const startDay = formatDateDisplay(session.scheduled_date, "medium");

  // Mirrors SchedulePage's handleStartSession — tests load through the test
  // store, learning sessions open straight into chat.
  const handleStart = async () => {
    if (!isReady || !session.session_id) return;
    setIsStarting(true);
    try {
      if (session.session_type === "TEST") {
        await loadTest(session.session_id);
        router.push("/student/test?from=schedule");
      } else {
        router.push(`/student/chat/${session.session_id}`);
      }
    } catch (error) {
      console.error("Error starting scheduled session:", error);
      setIsStarting(false);
    }
  };

  const chipColor = session.session_type === "TEST" ? C.warn : C.tutorSoft;

  return (
    <div
      className="rounded-[20px] relative overflow-hidden mb-8"
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        padding: "clamp(16px, 2vw, 24px)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        ...style,
      }}
    >
      <div
        className="absolute top-0 left-0 w-1 h-full"
        style={{
          background: `linear-gradient(to bottom, ${C.tutor}, ${C.tutorSoft})`,
          borderRadius: "20px 0 0 20px",
        }}
      />

      <div
        className="flex items-center pl-3 flex-wrap"
        style={{ gap: "clamp(12px, 2vw, 20px)" }}
      >
        <div className="flex-1 min-w-0" style={{ minWidth: 200 }}>
          <div
            className="font-bold uppercase mb-1"
            style={{ color: C.tutor, letterSpacing: "1.2px", fontSize: "clamp(9px, 0.9vw, 11px)" }}
          >
            {hasStarted ? "Starting now" : "Up next"}
          </div>

          <div
            className="font-bold truncate"
            style={{
              color: C.text,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(14px, 1.6vw, 18px)",
            }}
          >
            <span title={session.session_type === "TEST" ? "Test" : "Learning session"} style={{ marginRight: 5 }}>
              {session.session_type === "TEST" ? "📝" : "📖"}
            </span>
            {title}
          </div>

          <div className="mt-1.5 flex items-center" style={{ gap: 8, flexWrap: "wrap" }}>
            <span
              className="font-bold uppercase rounded-md"
              style={{
                color: chipColor,
                background: chipColor + "16",
                letterSpacing: "0.6px",
                fontSize: "clamp(8px, 0.8vw, 10px)",
                padding: "3px 7px",
              }}
            >
              {session.session_type === "TEST" ? "Test" : "Learning"}
            </span>
            <span style={{ color: C.textMuted, fontSize: "clamp(11px, 1vw, 13px)" }}>
              {startDay} · {startTime}
            </span>
          </div>
        </div>

        {hasStarted ? (
          <div className="flex flex-col items-stretch" style={{ gap: 6, minWidth: 190 }}>
            <button
              type="button"
              onClick={handleStart}
              disabled={!isReady || isStarting}
              className="rounded-xl text-white font-bold"
              style={{
                background: isReady
                  ? `linear-gradient(135deg, ${C.tutor}, ${C.tutorSoft})`
                  : C.textFaint,
                cursor: isReady && !isStarting ? "pointer" : "not-allowed",
                opacity: isStarting ? 0.7 : 1,
                padding: "clamp(10px, 1.2vw, 14px) clamp(16px, 2vw, 22px)",
                fontSize: "clamp(12px, 1.2vw, 15px)",
                transition: "transform 0.15s, box-shadow 0.2s",
                boxShadow: isReady ? "0 4px 14px rgba(91,77,199,0.28)" : "none",
              }}
            >
              {isStarting ? "Opening…" : isReady ? "Start now →" : "Getting ready…"}
            </button>
            {!isReady && (
              <span
                className="text-center"
                style={{ color: C.textMuted, fontSize: "clamp(10px, 0.9vw, 12px)" }}
              >
                Your session is still being prepared.
              </span>
            )}
          </div>
        ) : (
          <SessionCountdown
            hours={remaining?.hours ?? 0}
            minutes={remaining?.minutes ?? 0}
            label={
              remaining
                ? spokenRemaining(remaining.hours, remaining.minutes)
                : `Starts at ${startTime}`
            }
          />
        )}
      </div>
    </div>
  );
}
