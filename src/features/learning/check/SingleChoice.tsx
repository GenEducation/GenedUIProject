"use client";

import type { CheckItem } from "../types";

/** Single choice: one radio button per option; the chosen one is marked. The lesson screen and the partner's preview both use it. */
export function SingleChoice({
  check,
  selected,
  onSelect,
}: {
  check: CheckItem;
  selected: string | null;
  onSelect: (optionId: string) => void;
}) {
  return (
    <div role="radiogroup" aria-labelledby={`check-${check.id}`} className="mt-4 grid gap-2 sm:grid-cols-2">
      {check.options.map((option) => (
        // eslint-disable-next-line no-restricted-syntax -- an answer option: a radio, its selected state is its look.
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={selected === option.id}
          onClick={() => onSelect(option.id)}
          className={`lesson-sketch-sm lesson-hand px-4 py-2.5 text-left text-[18px] transition-colors ${
            selected === option.id ? "bg-[var(--ls-accent)] font-bold" : "hover:bg-[var(--ls-primary-soft)]"
          }`}
        >
          {option.text}
        </button>
      ))}
    </div>
  );
}
