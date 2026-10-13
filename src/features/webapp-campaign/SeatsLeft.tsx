"use client";

import { useSyncExternalStore } from "react";
import { PILOT_START_AT } from "@/constants/campaign";
import { useSeatsLeft } from "./pilotSeats";

const pad = (n: number) => String(n).padStart(2, "0");

function subscribeClock(tick: () => void) {
  const id = window.setInterval(tick, 1000);
  return () => window.clearInterval(id);
}
const nowSec = () => Math.floor(Date.now() / 1000);

/** Time until the pilot starts, ticking every second; null on the server (no
 *  hydration mismatch) and once the start has passed. */
function useCountdown(): string | null {
  const now = useSyncExternalStore(subscribeClock, nowSec, () => null);
  if (now === null) return null;
  const s = Math.floor(Date.parse(PILOT_START_AT) / 1000) - now;
  if (s <= 0) return null;
  const d = Math.floor(s / 86400);
  return `${d > 0 ? `${d}d ` : ""}${pad(Math.floor((s % 86400) / 3600))}h ${pad(Math.floor((s % 3600) / 60))}m ${pad(s % 60)}s`;
}

/** "● 11 seats left · Closes in 2d 14h 05m 09s" */
export function SeatsLeft({ className = "" }: { className?: string }) {
  const n = useSeatsLeft();
  const left = useCountdown();
  return (
    <p className={`gc-seats ${className}`.trim()}>
      <span aria-live="polite">
        <b key={n}>{n}</b> {n === 1 ? "seat" : "seats"} left
      </span>
      {left && (
        <span className="gc-seats-time">
          Closes in <time>{left}</time>
        </span>
      )}
    </p>
  );
}
