"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Lesson screen layout.
 *
 * - `wide` (≥ 1024px): rail · whiteboard · chat, with draggable dividers. As
 *   the window narrows the rail gives up width first (its step names collapse
 *   to one line with "…"); the board and chat hold their size until the rail
 *   is at its minimum.
 * - `compact` (< 1024px, incl. a phone held sideways): whiteboard · chat; the
 *   rail lives in a drawer opened from the header.
 * - `portrait` (a phone held upright): a "turn your phone sideways" prompt,
 *   with a fallback to one-panel-at-a-time tabs.
 */
export type LessonMode = "wide" | "compact" | "portrait";

const PORTRAIT_QUERY = "(max-width: 767px) and (orientation: portrait)";
const COMPACT_QUERY = "(max-width: 1023px)";

function readMode(): LessonMode {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "wide";
  if (window.matchMedia(PORTRAIT_QUERY).matches) return "portrait";
  if (window.matchMedia(COMPACT_QUERY).matches) return "compact";
  return "wide";
}

function subscribeMode(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const queries = [window.matchMedia(PORTRAIT_QUERY), window.matchMedia(COMPACT_QUERY)];
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}

export function useLessonMode(): LessonMode {
  return useSyncExternalStore(subscribeMode, readMode, () => "wide");
}

/* ── Column widths ─────────────────────────────────────────────────────── */

/** Gap between columns; the draggable divider lives in it. */
export const HANDLE_PX = 16;

export const RAIL = { default: 264, min: 184, max: 380 } as const;
export const CHAT = { default: 380, min: 300, max: 560 } as const;
/** The whiteboard never gets narrower than this while the others can give. */
const BOARD_MIN = { wide: 420, compact: 280 } as const;
/** Chat may go a little narrower beside the board on a phone held sideways. */
const CHAT_MIN_COMPACT = 240;

export interface LessonWidths {
  rail: number;
  chat: number;
}

const STORAGE_KEY = "gened.lesson.widths.v1";
const DEFAULTS: LessonWidths = { rail: RAIL.default, chat: CHAT.default };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function loadWidths(): LessonWidths {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<LessonWidths>;
    return {
      rail: clamp(Number(parsed.rail) || RAIL.default, RAIL.min, RAIL.max),
      chat: clamp(Number(parsed.chat) || CHAT.default, CHAT_MIN_COMPACT, CHAT.max),
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * The student's preferred rail/chat widths, remembered on this device.
 * `save` persists (call it when a drag ends, not on every move).
 */
export function useLessonWidths() {
  const [widths, setWidths] = useState<LessonWidths>(DEFAULTS);

  // Read after mount: localStorage is browser-only, and the first paint must
  // match the server render.
  useEffect(() => {
    setWidths(loadWidths());
  }, []);

  const save = useCallback((next: LessonWidths) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode / blocked storage: widths just won't persist */
    }
  }, []);

  const reset = useCallback(
    (key: keyof LessonWidths) => {
      setWidths((w) => {
        const next = { ...w, [key]: DEFAULTS[key] };
        save(next);
        return next;
      });
    },
    [save],
  );

  return { widths, setWidths, save, reset };
}

/**
 * Fit the preferred widths into the space there is. The rail gives way
 * first, then the chat; the board takes what's left (≥ its minimum).
 */
export function fitWidths(mode: Exclude<LessonMode, "portrait">, container: number, pref: LessonWidths): LessonWidths {
  if (mode === "compact") {
    const avail = container - HANDLE_PX;
    const chat = clamp(pref.chat, CHAT_MIN_COMPACT, Math.max(CHAT_MIN_COMPACT, avail - BOARD_MIN.compact));
    return { rail: 0, chat };
  }
  const avail = container - 2 * HANDLE_PX;
  let chat = clamp(pref.chat, CHAT.min, CHAT.max);
  const rail = clamp(Math.min(pref.rail, avail - chat - BOARD_MIN.wide), RAIL.min, RAIL.max);
  if (avail - rail - chat < BOARD_MIN.wide) chat = Math.max(CHAT.min, avail - rail - BOARD_MIN.wide);
  return { rail, chat };
}

/** The grid template both the header and the panels use, so they line up. */
export function gridTemplate(mode: Exclude<LessonMode, "portrait">, w: LessonWidths): string {
  return mode === "wide"
    ? `${w.rail}px ${HANDLE_PX}px minmax(0, 1fr) ${HANDLE_PX}px ${w.chat}px`
    : `minmax(0, 1fr) ${HANDLE_PX}px ${w.chat}px`;
}
