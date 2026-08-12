import { useEffect } from "react";

/**
 * Runs `handler` once on mount and again on window resize, debounced —
 * several student components previously attached an undebounced `resize`
 * listener that called setState on every single event during a drag-resize.
 */
export function useDebouncedResize(handler: () => void, delayMs = 150) {
  useEffect(() => {
    handler();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const debounced = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(handler, delayMs);
    };
    window.addEventListener("resize", debounced);
    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("resize", debounced);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delayMs]);
}
