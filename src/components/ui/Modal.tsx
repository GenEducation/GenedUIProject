"use client";

import React, { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * The app's dialog primitive.
 *
 * Every modal in the codebase (~22 of them) hand-rolled the same four things:
 * an AnimatePresence pair, a blurred scrim, a spring-in panel with
 * `role="dialog" aria-modal`, and an Escape handler. They drifted — different
 * z-indexes, different spring constants, several with no Escape and no focus
 * management at all. This is that pattern, extracted once.
 *
 * Deliberately unopinionated about the panel's *contents*: no built-in header
 * bar or close button, because the existing modals style their own headers
 * heavily and a mandatory chrome would just be fought. `title` exists only to
 * wire up `aria-labelledby`; pass `titleVisible={false}` when the visible
 * heading is rendered inside `children` (the common case).
 *
 * Omitting `onClose` makes the dialog non-dismissible — no backdrop click, no
 * Escape, no focus escape hatch. The placement form uses that: a student may
 * not abandon a graded item mid-answer.
 */

export type ModalSize = "sm" | "md" | "lg" | "full" | "fixed";

export interface ModalProps {
  open: boolean;
  /** Omit for a non-dismissible dialog (no Escape, no backdrop close). */
  onClose?: () => void;
  size?: ModalSize;
  /** Accessible name. Rendered visually only when `titleVisible`. */
  title?: React.ReactNode;
  titleVisible?: boolean;
  /** Default true, and ignored entirely when `onClose` is omitted. */
  dismissOnBackdrop?: boolean;
  dismissOnEscape?: boolean;
  /** Applied to the panel — the hook for scoped theming, e.g. "placement-theme". */
  className?: string;
  panelStyle?: React.CSSProperties;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const SIZE_CLASSNAME: Record<ModalSize, string> = {
  sm: "w-full max-w-sm",
  md: "w-full max-w-md",
  lg: "w-full max-w-2xl",
  // Not literally fullscreen: a sheet that fills the viewport on a phone and
  // stays a readable column on a desktop.
  full: "w-full max-w-3xl h-full sm:h-[min(92vh,900px)]",
  /**
   * A rigid width and height in actual pixels, not a fraction of the
   * viewport or of the content. Content that would overflow it must be split
   * into more screens by the caller (see the placement form's pagination) —
   * this size exists specifically so a caller can promise its content never
   * makes the dialog itself grow or shrink.
   *
   * The max-w/max-h are a phone-safety clamp only, not "size follows
   * content" — without them a 760px-wide dialog would run off a 375px
   * screen. They shrink the box on a small viewport; nothing ever grows it.
   */
  fixed: "w-[760px] h-[900px] max-w-[94vw] max-h-[92vh]",
};

/** Everything focusable, minus anything explicitly removed from the tab order. */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Focusable and not inside something hidden.
 *
 * Deliberately not an `offsetParent` check, which is the usual shorthand: it
 * returns null for every element under a `position: fixed` ancestor — which is
 * the whole panel — and jsdom returns null unconditionally, so the trap would
 * collapse to a single element and Tab would stick.
 */
function focusableWithin(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[hidden]") && el.getAttribute("aria-hidden") !== "true",
  );
}

export function Modal({
  open,
  onClose,
  size = "md",
  title,
  titleVisible = false,
  dismissOnBackdrop = true,
  dismissOnEscape = true,
  className = "",
  panelStyle,
  children,
  footer,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Where focus came from, so it can be handed back on close — otherwise a
  // keyboard user is dumped at the top of the document.
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const dismissible = Boolean(onClose);

  const requestClose = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  // Escape, plus a Tab loop that keeps focus inside the panel.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible && dismissOnEscape) {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = focusableWithin(panel);
      if (items.length === 0) {
        // Nothing to focus — keep Tab from walking out into the page behind.
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, dismissible, dismissOnEscape, requestClose]);

  // Scroll lock + initial focus + focus restore.
  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Next frame, so the panel has mounted and its children have laid out.
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = focusableWithin(panel)[0] ?? panel;
      target.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  // Portals need a DOM; this component renders inside client trees that are
  // still server-rendered once.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissible && dismissOnBackdrop ? requestClose : undefined}
            className="fixed inset-0 z-[100] backdrop-blur-sm"
            style={{ background: "rgb(16 20 32 / 0.55)" }}
          />

          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.92, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 18 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`${SIZE_CLASSNAME[size]} flex flex-col rounded-[24px] overflow-hidden pointer-events-auto outline-none ${className}`}
              style={{
                background: "var(--surface-card, #FFFFFF)",
                boxShadow: "0 30px 80px rgb(16 20 32 / 0.28)",
                fontFamily: "var(--font-body)",
                ...panelStyle,
              }}
            >
              {title && (
                <h2
                  id={titleId}
                  className={
                    titleVisible
                      ? "shrink-0 m-0 px-7 pt-7 font-extrabold text-[22px]"
                      : "sr-only"
                  }
                  style={titleVisible ? { fontFamily: "var(--font-display)" } : undefined}
                >
                  {title}
                </h2>
              )}
              <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
              {footer && <div className="shrink-0">{footer}</div>}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
