"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { LessonRail } from "./LessonRail";

/**
 * The steps rail as a slide-in drawer, for screens too narrow to keep it as
 * a column (tablets, a phone held sideways). Esc, the backdrop and the close
 * button all dismiss it.
 */
export function RailDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 transition-[visibility] ${open ? "visible" : "invisible delay-200"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-[rgb(18_45_48/0.35)] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lesson steps"
        className={`absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col bg-[var(--ls-canvas)] shadow-[0_20px_60px_-20px_rgb(18_45_48/0.5)] transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* eslint-disable-next-line no-restricted-syntax -- icon-only drawer close. */}
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close lesson steps"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/80 text-[var(--ls-ink-mid)] shadow-sm transition-colors hover:text-[var(--ls-primary)]"
        >
          <X size={18} />
        </button>
        <LessonRail />
      </div>
    </div>
  );
}
