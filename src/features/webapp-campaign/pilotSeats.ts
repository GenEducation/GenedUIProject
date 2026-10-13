import { useSyncExternalStore } from "react";
import { PILOT_SEATS_LEFT } from "@/constants/campaign";

// No live sign-up count yet: every visitor sees PILOT_SEATS_LEFT, and one fewer
// once they've joined from this browser. Shared so the hero, join section and
// sheet all tick down together.
const KEY = "gened-pilot-joined";
const listeners = new Set<() => void>();

function hasJoined(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const getSnapshot = () => Math.max(1, PILOT_SEATS_LEFT - (hasJoined() ? 1 : 0));
const getServerSnapshot = () => PILOT_SEATS_LEFT;

export function useSeatsLeft(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function markPilotJoined() {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* storage blocked — the count just won't stick across reloads */
  }
  listeners.forEach((fn) => fn());
}
