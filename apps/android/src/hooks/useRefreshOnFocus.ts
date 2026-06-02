/**
 * Calls `refetch` whenever the screen gains focus (e.g. switching tabs).
 * Uses expo-router's useFocusEffect so it works with the file-based router.
 *
 * Usage:
 *   useRefreshOnFocus(refetch);
 */
import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";

export function useRefreshOnFocus(refetch: () => void): void {
  const firstRun = useRef(true);

  useFocusEffect(
    useCallback(() => {
      // Skip the very first focus — useApi already fetches on mount
      if (firstRun.current) {
        firstRun.current = false;
        return;
      }
      refetch();
    }, [refetch])
  );
}
