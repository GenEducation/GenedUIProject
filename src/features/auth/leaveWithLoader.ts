import { useLoaderStore } from "@/stores/useLoaderStore";
import { LOADER_RESUME_KEY } from "./loaderResume";

export { LOADER_RESUME_KEY };

/**
 * Logging out plays the same study-deck loader as signing in. The page still
 * reloads to "/" (so no signed-in state survives in memory), so the loader is
 * carried across the reload:
 *
 *  1. the loader fades in over the current page;
 *  2. a session flag is set and the browser navigates;
 *  3. an inline script in the root layout sees the flag and paints a plain
 *     canvas cover before anything else, so the home page never flashes;
 *  4. GlobalLoader picks the flag up (resumeLoaderAfterReload), restarts the
 *     deck, and finishes once the home page's visuals have loaded and the deck
 *     has played through.
 */
// Long enough for the overlay to fade in and the first object to pop.
const LEAVE_AFTER_MS = 450;

export function leaveWithLoader(to: string, beforeLeave?: () => void): void {
  useLoaderStore.getState().startLoading({ reason: "logout" });
  try {
    sessionStorage.setItem(LOADER_RESUME_KEY, "logout");
  } catch {
    // Storage blocked: the deck still plays here, just not after the reload.
  }
  setTimeout(() => {
    beforeLeave?.();
    window.location.href = to;
  }, LEAVE_AFTER_MS);
}

/**
 * Called once by GlobalLoader on mount: if a logout is mid-flight, restart the
 * deck and report that it did (the caller then waits for the page's visuals).
 */
export function resumeLoaderAfterReload(): boolean {
  let flagged = false;
  try {
    flagged = sessionStorage.getItem(LOADER_RESUME_KEY) !== null;
    sessionStorage.removeItem(LOADER_RESUME_KEY);
  } catch {
    // ignore
  }
  if (flagged) useLoaderStore.getState().startLoading({ reason: "logout" });
  return flagged;
}

/** Lifts the pre-hydration cover once the real loader is on screen. */
export function clearResumeCover(): void {
  document.documentElement.removeAttribute("data-loader-resume");
}
