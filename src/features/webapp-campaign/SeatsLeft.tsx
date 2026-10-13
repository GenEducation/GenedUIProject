"use client";

import { useSeatsLeft } from "./pilotSeats";

/** "11 seats left" — pulsing dot, number re-pops when it changes. */
export function SeatsLeft({ className = "" }: { className?: string }) {
  const n = useSeatsLeft();
  return (
    <span className={`gc-seats ${className}`.trim()} aria-live="polite">
      <b key={n}>{n}</b> {n === 1 ? "seat" : "seats"} left
    </span>
  );
}
