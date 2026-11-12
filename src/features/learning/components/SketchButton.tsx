"use client";

import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

/** Drawn on the board like its visuals: handwriting, ink lines, a wobbly hand-drawn edge. */
const SKETCH_VARIANT = {
  primary:
    "lesson-sketch-sm border-[var(--ls-ink)] bg-[var(--ls-primary)] text-white hover:bg-[var(--ls-accent)] hover:text-[var(--ls-ink)]",
  secondary: "lesson-sketch-sm hover:bg-[var(--ls-accent)]",
  tertiary: "rounded-[12px_4px_13px_5px/5px_13px_4px_12px] hover:bg-[var(--ls-accent)]",
} as const;

/** A hand-drawn button for the board's cards: ink edge, handwriting, citron on hover. At least 44px tall. */
export function SketchButton({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof SKETCH_VARIANT; loading?: boolean }) {
  return (
    // eslint-disable-next-line no-restricted-syntax -- a hand-drawn button, part of the board's sketch style.
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`lesson-hand inline-flex min-h-11 items-center gap-1.5 px-4 py-1.5 text-[18px] font-bold text-[var(--ls-ink)] transition-[background-color,color,transform] duration-200 hover:-rotate-1 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 ${SKETCH_VARIANT[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
