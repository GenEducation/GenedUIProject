import type { useRouter } from "next/navigation";
import { useLoaderStore } from "@/stores/useLoaderStore";

// Overlay never hangs forever even if AuthGuard/navigation somehow never
// resolves (e.g. an unexpected route with no AuthGuard to call stopLoading).
// Covers navigation, the destination's image wait (capped at 7s) and the deck's
// own full cycle + finale.
const HANDOFF_WATCHDOG_MS = 15000;

/**
 * A post-auth destination we are willing to navigate to: an in-app path only
 * (one leading slash; never `//host` or `/\host`, which browsers treat as
 * another site), and, given the signed-in role, only that role's own area —
 * a parent's invitation link (`/parent?token=…`) must not send a student to
 * the parent portal, where AuthGuard would sign them out.
 */
export function safeRedirect(path: string | null | undefined, role?: string | null): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return null;
  if (role) {
    const area = `/${role.toLowerCase()}`;
    const top = `/${path.split(/[/?#]/)[1] ?? ""}`;
    const roleAreas = ["/student", "/parent", "/partner", "/teacher", "/admin"];
    if (roleAreas.includes(top) && top !== area) return null;
  }
  return path;
}

/**
 * Reads the `redirect` query param that /login and /register check after an
 * auth call succeeds, so a mid-flow deep link (a parent's invitation, say) is
 * honored. Unsafe values, and another role's area when `role` is given, read
 * as none.
 */
export function getRedirectParam(role?: string | null): string | null {
  if (typeof window === "undefined") return null;
  return safeRedirect(new URLSearchParams(window.location.search).get("redirect"), role);
}

/**
 * `href` with the current page's safe `redirect` carried along, so moving
 * between landing, /login and /register keeps a parent's invitation context.
 */
export function withRedirect(href: string, redirect: string | null = getRedirectParam()): string {
  if (!redirect) return href;
  return `${href}${href.includes("?") ? "&" : "?"}redirect=${encodeURIComponent(redirect)}`;
}

/**
 * Hands the loader overlay off to the destination route: the loader
 * navigates under its own cover, keeps playing while the destination
 * compiles, fetches and loads its images, and leaves once AuthGuard calls
 * finishLoading() and the deck has played through.
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

