import type { useRouter } from "next/navigation";
import { useLoaderStore } from "@/stores/useLoaderStore";

// Overlay never hangs forever even if AuthGuard/navigation somehow never
// resolves (e.g. an unexpected route with no AuthGuard to call stopLoading).
const HANDOFF_WATCHDOG_MS = 12000;

/**
 * Reads the `redirect` query param that /login and the root LoginView both
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
  const watchdog = setTimeout(() => {
    useLoaderStore.getState().stopLoading();
  }, HANDOFF_WATCHDOG_MS);

  useLoaderStore.getState().beginHandoff(() => {
    clearTimeout(watchdog);
    router.replace(path);
  });
}
