"use client";

import { useRef, type KeyboardEvent } from "react";
import type { CheckItem } from "../types";
import { ChoiceTile, type ChoiceTone } from "./ChoiceTile";

/** A, B, C… for an option's place; past Z, its number. */
export const optionLetter = (index: number) => (index < 26 ? String.fromCharCode(65 + index) : String(index + 1));

/**
 * Single choice: a radio group drawn as lettered tiles (A, B, C…), the chosen one filled. It behaves like a native radio group:
 * one Tab stop (the chosen option, else the first), arrow keys move and choose, Home and End jump to the ends. `tone` marks the
 * chosen option after a check the learner should change. The lesson screen and the partner's preview both use it.
 */
export function SingleChoice({
  check,
  selected,
  onSelect,
  tone = null,
  disabled = false,
}: {
  check: CheckItem;
  selected: string | null;
  onSelect: (optionId: string) => void;
  tone?: ChoiceTone;
  disabled?: boolean;
}) {
  const group = useRef<HTMLDivElement>(null);
  const options = check.options;
  const current = Math.max(0, options.findIndex((o) => o.id === selected));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next: number | null = null;
    if (event.key in keys) next = (current + keys[event.key] + options.length) % options.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    if (next === null || disabled || options.length === 0) return;
    event.preventDefault();
    onSelect(options[next].id);
    group.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div ref={group} role="radiogroup" aria-labelledby={`check-${check.id}`} onKeyDown={onKeyDown} className={`mt-4 grid gap-2 ${twoColumns(options)}`}>
      {options.map((option, index) => (
        <ChoiceTile
          key={option.id}
          role="radio"
          aria-checked={selected === option.id}
          tabIndex={index === current ? 0 : -1}
          selected={selected === option.id}
          tone={tone}
          mark="radio"
          markLabel={optionLetter(index)}
          disabled={disabled}
          onClick={() => onSelect(option.id)}
        >
          {option.text}
        </ChoiceTile>
      ))}
    </div>
  );
}

/** Two tiles a row only when each fits: short options in a card of 17rem or more, sentences in a wide one (34rem or more). */
export function twoColumns(options: ReadonlyArray<{ text: string }>): string {
  return options.some((o) => o.text.length > 28) ? "@[34rem]:grid-cols-2" : "@[17rem]:grid-cols-2";
}
