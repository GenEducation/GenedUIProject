"use client";

import { useEffect, useState, type RefObject } from "react";

export const VIEWPORT_MARGIN = 12;

export interface PopoverPosition {
  top: number;
  left: number;
  width?: number;
  /** True when the panel was flipped to sit above the trigger. */
  flipped: boolean;
}

interface Options {
  /** Fixed panel width in px, or "trigger" to match the trigger's width. */
  width: number | "trigger";
  /** Used to decide whether the panel fits below the trigger. */
  estimatedHeight: number;
  /** Gap between trigger and panel. */
  gap?: number;
}

/**
 * Viewport-anchored positioning for portalled popovers.
 *
 * Anchoring a panel to its trigger with plain `absolute left-0` breaks in two
 * ways this hook fixes: the panel is clipped by any ancestor with `overflow:
 * hidden` (modals, scrolling tables), and it runs off the bottom or right edge
 * when the trigger sits low or far right. The logic was originally written
 * inline in DatePickerField; it now lives here so Select, DatePicker and
 * TimePicker share one implementation instead of three drifting copies.
 *
 * Returns null until the first measurement, so callers should not render the
 * panel before a position exists (otherwise it flashes at 0,0).
 */
export function usePopoverPosition(
  isOpen: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  { width, estimatedHeight, gap = 8 }: Options,
): PopoverPosition | null {
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const panelWidth = width === "trigger" ? rect.width : width;
      const left = Math.min(
        Math.max(rect.left, VIEWPORT_MARGIN),
        Math.max(VIEWPORT_MARGIN, window.innerWidth - panelWidth - VIEWPORT_MARGIN),
      );

      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const fitsBelow = spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove;
      const top = fitsBelow ? rect.bottom + gap : rect.top - gap - estimatedHeight;

      setPosition({
        top: Math.min(
          Math.max(top, VIEWPORT_MARGIN),
          Math.max(VIEWPORT_MARGIN, window.innerHeight - VIEWPORT_MARGIN - estimatedHeight),
        ),
        left,
        width: width === "trigger" ? rect.width : undefined,
        flipped: !fitsBelow,
      });
    };

    reposition();
    window.addEventListener("resize", reposition);
    // Capture phase so scrolling any ancestor container repositions the panel,
    // not just the window.
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [isOpen, triggerRef, width, estimatedHeight, gap]);

  // Derived rather than cleared in the effect above: a stale position must not
  // survive a close, but clearing it via setState inside the effect would cause
  // an extra cascading render on every open/close.
  return isOpen ? position : null;
}
