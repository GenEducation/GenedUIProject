import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` during SSR and on the first client render, `true` from the commit on.
 *
 * Several stores in this app read `localStorage` when their module initializes
 * — `usePetStore`, and `avatarTraits` in `useStudentStore`. That happens
 * before hydration, so a component that renders straight from one of those
 * values produces different output on the client than the server sent, and
 * React 19 throws a hydration mismatch rather than patching it up.
 *
 * Gate the *persisted* part of the render on this and the first client render
 * matches the server by construction. It costs one extra render, which is why
 * it belongs only around values that genuinely come from storage.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: it needs no
 * state update to flip, so it cannot cascade a render, and it is the API React
 * provides for exactly this server/client snapshot split.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
