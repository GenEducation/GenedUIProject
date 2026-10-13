import { useSyncExternalStore } from "react";
import { PILOT_SEATS_LEFT } from "@/constants/campaign";

// No live sign-up count yet: every visitor starts at PILOT_SEATS_LEFT, and each
// sign-up from this browser (e.g. one per child) takes one more seat. Shared so
// the hero, join section and sheet all tick down together.
const KEY = "gened-pilot-signups";
const listeners = new Set<() => void>();

function signups(): number {
  try {
    const n = Number.parseInt(window.localStorage.getItem(KEY) ?? "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const getSnapshot = () => Math.max(1, PILOT_SEATS_LEFT - signups());
const getServerSnapshot = () => PILOT_SEATS_LEFT;

export function useSeatsLeft(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function markPilotJoined() {
  try {
    window.localStorage.setItem(KEY, String(signups() + 1));
  } catch {
    /* storage blocked — the count just won't stick across reloads */
  }
  listeners.forEach((fn) => fn());
}
