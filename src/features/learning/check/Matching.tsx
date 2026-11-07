"use client";

import type { CheckItem } from "../types";
import { useUiText } from "../i18n";

/**
 * Matching by choosing: each left entry has a labelled list of the right-hand candidates, so every pair is made with the
 * keyboard (or a tap) and read out by a screen reader as "Match X". A candidate already paired elsewhere is not offered again,
 * so the pairing stays one to one.
 */
export function Matching({
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
  const lefts = check.left_entries ?? [];
  const taken = new Set(Object.values(pairs));
  return (
    <div className="mt-4 grid gap-3">
      {lefts.map((left, index) => {
        const id = `match-${check.id}-${index}`;
        return (
          <div key={left} className="lesson-sketch-sm flex flex-wrap items-center gap-3 px-4 py-2.5">
            <label htmlFor={id} className="lesson-hand min-w-0 flex-1 text-[18px]">
              {left}
            </label>
            <select
              id={id}
              value={pairs[left] ?? ""}
              disabled={disabled}
              aria-label={t("matchItem", { item: left })}
              onChange={(e) => {
                const next = { ...pairs };
                if (e.target.value) next[left] = e.target.value;
                else delete next[left];
                onChange(next);
              }}
              className="lesson-hand min-h-11 rounded-lg border border-[var(--ls-ink-faint)] bg-white px-3 py-2 text-[18px]"
            >
              <option value="">{t("chooseMatch")}</option>
              {check.options.map((option) => (
                <option key={option.id} value={option.text} disabled={taken.has(option.text) && pairs[left] !== option.text}>
                  {option.text}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
