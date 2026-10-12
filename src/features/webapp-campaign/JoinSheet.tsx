"use client";

import { useEffect, useRef } from "react";
import { PILOT_TAGLINE } from "@/constants/campaign";
import { BetaSignupForm } from "./BetaSignupForm";

/** The pilot sign-up as a sheet over the still-playing film (a bottom sheet on phones). */
export function JoinSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Put the cursor straight into the first field.
    panelRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="gc-sheet" role="dialog" aria-modal="true" aria-labelledby="gc-sheet-title">
      <div className="gc-sheet-scrim" onClick={onClose} />
      <div className="gc-sheet-panel" ref={panelRef}>
        {/* eslint-disable-next-line no-restricted-syntax -- icon-only close for the campaign sheet */}
        <button type="button" className="gc-sheet-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <span className="gc-eyebrow">{PILOT_TAGLINE}</span>
        <h2 id="gc-sheet-title">
          Join the free pilot. <em>It takes a minute.</em>
        </h2>
        <BetaSignupForm />
      </div>
    </div>
  );
}
