"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

/**
 * The selectable-option look shared by mcq, true_false and multi_select.
 *
 * Retokenised from the test paper's MultipleChoiceQuestion so the placement
 * form reads as the same family of control, in the placement theme's Deep
 * Ocean rather than the test paper's navy — but sized down from it: several of
 * these questions render on one screen at
 * once, so a full-page question's roomy touch target would only fit one or
 * two of them. Still comfortably tappable (a ~40px row), just not padded for
 * a question with the whole screen to itself.
 *
 * `shape` drives the indicator only — a circle reads as "pick one", a square
 * as "pick several", which is the one affordance distinguishing mcq from
 * multi_select once the options are on screen.
 */
export function ChoiceButton({
  selected,
  disabled,
  onClick,
  shape = "radio",
  children,
  lang,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  shape?: "radio" | "checkbox";
  children: React.ReactNode;
  lang?: string;
}) {
  return (
    <motion.button
      type="button"
      role={shape === "checkbox" ? "checkbox" : "radio"}
      aria-checked={selected}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
      onClick={onClick}
      className="w-full px-2.5 py-1.5 rounded-lg text-left transition-colors border flex items-center gap-2 disabled:cursor-default cursor-pointer focus-visible:outline-none focus-visible:ring-2"
      style={{
        background: selected ? "var(--pl-primary-soft)" : "var(--pl-card)",
        borderColor: selected ? "var(--pl-primary)" : "var(--pl-border)",
        color: selected ? "var(--pl-primary)" : "var(--pl-ink-mid)",
        // @ts-expect-error -- CSS custom property for the focus ring
        "--tw-ring-color": "var(--pl-ring)",
      }}
    >
      <span
        className={`w-4 h-4 shrink-0 border-2 flex items-center justify-center transition-colors ${
          shape === "checkbox" ? "rounded-[5px]" : "rounded-full"
        }`}
        style={{
          borderColor: selected ? "var(--pl-primary)" : "var(--pl-border)",
          background: selected ? "var(--pl-primary)" : "transparent",
        }}
      >
        {selected &&
          (shape === "checkbox" ? (
            <Check size={11} strokeWidth={3.5} style={{ color: "var(--pl-accent)" }} />
          ) : (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--pl-accent)" }}
            />
          ))}
      </span>
      <span className="text-[13px] font-medium leading-snug" lang={lang}>
        {children}
      </span>
    </motion.button>
  );
}
