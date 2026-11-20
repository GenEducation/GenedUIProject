"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";

/**
 * How a chosen answer reads after a check: `try` is an answer the learner should change and check again (warm, never a red
 * "wrong"). The server alone decides it; nothing here judges an answer.
 */
export type ChoiceTone = "try" | null;

/** The mark at the start of a choice: a round one for choose-one, a square one for choose-several. Decorative: the control's role and checked state say it. */
export function ChoiceMark({ kind, checked, label }: { kind: "radio" | "check"; checked: boolean; label?: string }) {
  return (
    <span aria-hidden className="lesson-choice-mark" data-kind={kind} data-label={label ? "" : undefined}>
      {label ?? (checked && (kind === "radio" ? <span className="block size-2 rounded-full bg-white" /> : <Check size={14} strokeWidth={3} />))}
    </span>
  );
}

/** The data attributes the `.lesson-choice` styles read: chosen, and the tone after a check. */
export function choiceState(selected: boolean, tone: ChoiceTone = null) {
  return {
    "data-selected": selected ? "" : undefined,
    "data-tone": selected && tone ? tone : undefined,
  } as const;
}

/**
 * One answer option drawn as a hand-drawn tile with a mark (see `.lesson-choice` in globals.css). A plain button: the caller
 * gives it its role (`radio` in a radiogroup, `checkbox`…) and checked state, so the look follows what assistive tech hears.
 */
export function ChoiceTile({
  selected,
  tone = null,
  mark,
  markLabel,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean;
  tone?: ChoiceTone;
  /** The mark drawn before the label; none for chips and tiles. */
  mark?: "radio" | "check";
  /** A letter (A, B, C…) drawn in the mark instead of a dot, so an option can be named aloud ("I think it's B"). */
  markLabel?: string;
  children: ReactNode;
}) {
  return (
    // eslint-disable-next-line no-restricted-syntax -- an answer option: its role and checked state are its look.
    <button type="button" {...choiceState(selected, tone)} className={`lesson-choice lesson-sketch-sm lesson-hand ${className}`} {...rest}>
      {mark && <ChoiceMark kind={mark} checked={selected} label={markLabel} />}
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}
