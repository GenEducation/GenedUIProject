"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import type { VoiceLanguage } from "../types";
import { DICTATION_LANGUAGES, dictationLanguage } from "./languages";

/**
 * Which language the mic listens in: a small pill in the composer that opens a list of the app's languages, each
 * in its own script. Escape or a click outside closes it.
 */
export function DictationLanguagePicker({
  value,
  onChange,
  disabled = false,
  label = "Dictation language",
  align = "left",
}: {
  value: VoiceLanguage;
  onChange: (code: VoiceLanguage) => void;
  disabled?: boolean;
  /** What the picker sets, for screen readers ("Dictation language", "Voice language"). */
  label?: string;
  /** Which edge the list lines up with; "right" near the right of a bar so it stays on screen. */
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = dictationLanguage(value) ?? DICTATION_LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      {/* eslint-disable-next-line no-restricted-syntax -- a compact pill tool in the composer, beside the round mic. */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${current.english}`}
        title={label}
        className="flex h-8 items-center gap-1 rounded-full border border-[var(--ls-border-strong)] bg-white px-2.5 text-[12.5px] font-semibold text-[var(--ls-ink-mid)] transition-colors hover:border-[var(--ls-primary)] hover:text-[var(--ls-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Languages size={14} aria-hidden />
        <span>{current.name}</span>
        <ChevronDown size={13} aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className={`absolute bottom-full ${align === "right" ? "right-0" : "left-0"} z-30 mb-2 max-h-[280px] w-[200px] overflow-y-auto rounded-2xl border border-[var(--ls-border)] bg-white p-1.5 shadow-[0_18px_40px_-18px_rgba(18,45,48,0.45)]`}
        >
          {DICTATION_LANGUAGES.map((lang) => {
            const selected = lang.code === current.code;
            return (
              <li
                key={lang.code}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                onClick={() => {
                  onChange(lang.code);
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(lang.code);
                    setOpen(false);
                  }
                }}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[14px] outline-none transition-colors focus-visible:bg-[var(--ls-primary-soft)] ${
                  selected ? "bg-[var(--ls-primary-soft)] font-semibold text-[var(--ls-primary)]" : "text-[var(--ls-ink)] hover:bg-[var(--ls-primary-soft)]"
                }`}
              >
                <span className="flex-1">{lang.name}</span>
                {lang.name !== lang.english && <span className="text-[11.5px] text-[var(--ls-ink-faint)]">{lang.english}</span>}
                {selected && <Check size={14} aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
