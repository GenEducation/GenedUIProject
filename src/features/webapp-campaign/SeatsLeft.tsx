"use client";

import { useSeatsLeft } from "./pilotSeats";

/** "● 11 seats left" */
export function SeatsLeft({ className = "" }: { className?: string }) {
  const n = useSeatsLeft();
  return (
    <p className={`gc-seats ${className}`.trim()} aria-live="polite">
      <b key={n}>{n}</b> {n === 1 ? "seat" : "seats"} left
    </p>
  );
}
