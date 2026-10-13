import type { useRouter } from "next/navigation";
import { useLoaderStore } from "@/stores/useLoaderStore";

// Overlay never hangs forever even if AuthGuard/navigation somehow never
// resolves (e.g. an unexpected route with no AuthGuard to call stopLoading).
const HANDOFF_WATCHDOG_MS = 12000;

/**
 * Reads the `redirect` query param that /login and /register
 * check after an auth call succeeds, so a mid-flow deep link is honored.
 */
export function getRedirectParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("redirect");
}

/**
 * Hands the loader overlay off to the destination route: marks the loader
 * complete (trophy + confetti), waits for the celebration to actually be
 * shown, then navigates while the overlay stays up covering compile/fetch
 * time. The destination's AuthGuard calls stopLoading() once it has
 * authorized and rendered, fading the overlay out from there.
 */
export function completeAndRedirect(router: ReturnType<typeof useRouter>, path: string): void {
  // The watchdog covers the whole hand-off — celebration, navigation and the
  // destination's own loading — so it is not cleared on navigation. It only
  // acts if this hand-off still owns the loader: a newer load (a fresh login,
  // say) bumps loadId and is left alone.
  const { loadId } = useLoaderStore.getState();
  setTimeout(() => {
    const state = useLoaderStore.getState();
    if (state.isVisible && state.loadId === loadId) state.stopLoading();
  }, HANDOFF_WATCHDOG_MS);

  useLoaderStore.getState().beginHandoff(() => {
    router.replace(path);
  });
}

/**
 * Puts up the right full-screen loader for a role, once the auth reply has
 * said which role it is. Sign-in can't know the role until then, so the form
 * shows its own button spinner while the request is in flight and the loader
 * starts here, already the right one — never the student loader first and the
 * parent one a moment later. Parents and partners get the GenEd logo toss;
 * everyone else gets the learning journey.
 */
export function startLoaderForRole(role: string, mode: "signin" | "signup"): void {
  const loader = useLoaderStore.getState();
  if (role === "parent") {
    loader.startLoading({ variant: "parent", stage: mode === "signup" ? "signup" : "signin-handoff" });
  } else if (role === "partner") {
    loader.startLoading({ variant: "parent", stage: mode === "signup" ? "partner-signup" : "partner-signin" });
  } else {
    loader.startLoading();
  }
}
