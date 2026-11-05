"use client";

import type { CheckItem } from "../types";
import { useUiText } from "../i18n";

/**
 * Grouping: every entry has its own set of group buttons (a radio group), so an entry is put in a group with one tap or Tab and
 * Enter or Space, and may be moved by choosing another. Several entries may share a group. There is nothing to drag, so the same
 * controls serve the keyboard, a screen reader ("Group for X", checked/not) and a young learner's tap.
 */
export function GroupSorter({
  check,
  pairs,
  onChange,
  disabled = false,
}: {
  check: CheckItem;
  pairs: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const t = useUiText();
  const entries = check.left_entries ?? [];
  return (
    <div className="mt-4 grid gap-3">
      {entries.map((entry) => (
        <div key={entry} className="lesson-sketch-sm flex flex-wrap items-center gap-3 px-4 py-2.5">
          <span id={`entry-${check.id}-${entry}`} className="lesson-hand min-w-0 flex-1 text-[18px]">
            {entry}
          </span>
          <div role="radiogroup" aria-label={t("groupFor", { item: entry })} className="flex flex-wrap gap-2">
            {check.options.map((group) => (
              // eslint-disable-next-line no-restricted-syntax -- a group choice for one entry: a radio, its checked state is its look.
              <button
                key={group.id}
                type="button"
                role="radio"
                aria-checked={pairs[entry] === group.text}
                disabled={disabled}
                onClick={() => onChange({ ...pairs, [entry]: group.text })}
                className={`lesson-hand min-h-11 rounded-full px-4 py-2 text-[17px] transition-colors ${
                  pairs[entry] === group.text ? "bg-[var(--ls-accent)] font-bold" : "bg-[var(--ls-sage)] hover:bg-[var(--ls-primary-soft)]"
                }`}
              >
                {group.text}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
