"use client";

import { STUDENT_COLORS as C } from "../theme/colors";

interface UnitProps {
  value: number;
  label: string;
}

function Unit({ value, label }: UnitProps) {
  return (
    <div className="flex flex-col items-center" style={{ gap: 4 }}>
      <div
        className="rounded-xl flex items-center justify-center font-extrabold"
        style={{
          background: C.tutor + "10",
          color: C.tutor,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(18px, 2.2vw, 26px)",
          minWidth: "clamp(44px, 4.4vw, 58px)",
          padding: "clamp(6px, 0.8vw, 10px) clamp(8px, 1vw, 12px)",
          lineHeight: 1.1,
        }}
      >
        {String(value).padStart(2, "0")}
      </div>
      <div
        className="font-bold uppercase"
        style={{ color: C.textMuted, letterSpacing: "0.8px", fontSize: "clamp(7px, 0.7vw, 9px)" }}
      >
        {label}
      </div>
    </div>
  );
}

interface SessionCountdownProps {
  hours: number;
  minutes: number;
  /** Plain-language remaining time, announced instead of the digits. */
  label: string;
}

/**
 * Hours-and-minutes countdown to a scheduled session.
 *
 * Deliberately quiet: two tinted chips echoing the dashboard's stat tiles, no
 * seconds and no animation. Minutes change once a minute, so any transition
 * would be unseen ornament — and a moving element parked on screen for hours
 * is a distraction on a page whose job is to get the student into a session.
 *
 * The digits are `aria-hidden` behind a single `role="timer"` label so a
 * screen reader hears one sentence rather than every tick.
 */
export function SessionCountdown({ hours, minutes, label }: SessionCountdownProps) {
  return (
    <div role="timer" aria-label={label}>
      <div className="flex items-start" style={{ gap: "clamp(6px, 0.8vw, 10px)" }} aria-hidden="true">
        <Unit value={hours} label="Hrs" />
        <Unit value={minutes} label="Min" />
      </div>
    </div>
  );
}
