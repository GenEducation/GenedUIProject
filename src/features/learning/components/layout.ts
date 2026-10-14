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
 *
 * A phone held upright gets the landscape layout too, drawn turned 90°, and a
 * short screen gets the lesson scaled to fit (see `useLessonFrame`): the
 * lesson is landscape only, with no prompt to rotate.
 */
export type LessonMode = "wide" | "compact";

const PORTRAIT_QUERY = "(max-width: 767px) and (orientation: portrait)";
const COMPACT_QUERY = "(max-width: 1023px)";

function subscribeMode(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const queries = [window.matchMedia(PORTRAIT_QUERY), window.matchMedia(COMPACT_QUERY)];
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}

/* ── Fitting the lesson to the screen ─────────────────────────────────── */

/**
 * How the lesson is drawn on this screen. On a roomy screen: as is (scale 1, not turned). On a short screen (a
 * phone held sideways) or a phone held upright, the lesson is laid out at a comfortable design size, at least
 * DESIGN_MIN.height tall and DESIGN_MIN.width wide, then scaled down to fit exactly, so text, logo, buttons, the
 * whiteboard and the chat all shrink together and keep their proportions. An upright phone also gets it turned
 * 90° (the lesson is landscape only).
 */
export interface LessonFrame {
  /** Drawn turned 90° clockwise to fill an upright phone. */
  turned: boolean;
  /** Screen pixels per layout pixel (≤ 1). */
  scale: number;
  /** The layout's own size, in layout pixels. */
  width: number;
  height: number;
  mode: LessonMode;
}

export const DESIGN_MIN = { width: 720, height: 500 } as const;
/** Below this the text would be too small to read; the layout overflows a little instead. */
export const MIN_SCALE = 0.6;

/** The frame for a viewport of `vw` × `vh`, upright or not (pure, for tests). */
export function frameFor(vw: number, vh: number, upright: boolean, compactQuery = vw < 1024): LessonFrame {
  const W = upright ? vh : vw;
  const H = upright ? vw : vh;
  let scale = 1;
  if (upright || H < DESIGN_MIN.height) {
    scale = Math.min(1, H / DESIGN_MIN.height, W / DESIGN_MIN.width);
    scale = Math.max(MIN_SCALE, Math.round(scale * 1000) / 1000);
  }
  const width = Math.round(W / scale);
  const height = Math.round(H / scale);
  // A screen drawn as is keeps the media-query layout. A fitted one (a phone) is always compact: whiteboard and
  // chat side by side, with the progress rail in a drawer the student opens from the header when they want it.
  const fitted = scale !== 1 || upright;
  const mode: LessonMode = fitted ? "compact" : compactQuery ? "compact" : "wide";
  return { turned: upright, scale, width, height, mode };
}

const SERVER_FRAME: LessonFrame = { turned: false, scale: 1, width: 1280, height: 800, mode: "wide" };
let cachedFrame: LessonFrame = SERVER_FRAME;

function readFrame(): LessonFrame {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return SERVER_FRAME;
  const next = frameFor(
    window.innerWidth,
    window.innerHeight,
    window.matchMedia(PORTRAIT_QUERY).matches,
    window.matchMedia(COMPACT_QUERY).matches,
  );
  const same =
    next.turned === cachedFrame.turned && next.scale === cachedFrame.scale && next.width === cachedFrame.width &&
    next.height === cachedFrame.height && next.mode === cachedFrame.mode;
  if (!same) cachedFrame = next;
  return cachedFrame;
}

function subscribeFrame(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const unsubscribeMode = subscribeMode(onChange);
  window.addEventListener("resize", onChange);
  window.addEventListener("orientationchange", onChange);
  return () => {
    unsubscribeMode();
    window.removeEventListener("resize", onChange);
    window.removeEventListener("orientationchange", onChange);
  };
}

/** How to draw the lesson on this screen; follows resizes and rotation. */
export function useLessonFrame(): LessonFrame {
  return useSyncExternalStore(subscribeFrame, readFrame, () => SERVER_FRAME);
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
export function fitWidths(mode: LessonMode, container: number, pref: LessonWidths): LessonWidths {
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
export function gridTemplate(mode: LessonMode, w: LessonWidths): string {
  return mode === "wide"
    ? `${w.rail}px ${HANDLE_PX}px minmax(0, 1fr) ${HANDLE_PX}px ${w.chat}px`
    : `minmax(0, 1fr) ${HANDLE_PX}px ${w.chat}px`;
}
