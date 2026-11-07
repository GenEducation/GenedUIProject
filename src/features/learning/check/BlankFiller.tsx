"use client";

import { useRef, useState } from "react";
import type { CheckItem } from "../types";
import { useUiText } from "../i18n";

/**
 * Fill-in blanks from a word bank. The blanks are numbered buttons and the bank is a row of buttons: choose a bank entry and it goes
 * into the blank that is current (the first empty one unless the learner picked another), choose a filled blank to empty it and
 * make it current. Each bank entry is used once. Everything is a button, so a keyboard (Tab, Enter, Space) and a tap work alike, a
 * screen reader hears "Blank 2: beta" or "Blank 2: empty", and a live note says what changed. The sentence itself is the question.
 */
export function BlankFiller({
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
  const blanks = check.left_entries ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const firstEmpty = blanks.find((b) => !pairs[b]) ?? null;
  const current = picked && !pairs[picked] ? picked : firstEmpty;
  // A word the text needs twice is in the bank twice: a chip is used when its text has been placed as many times as there are
  // chips of that text up to and including this one, so the second copy stays available after the first is placed.
  const placed = new Map<string, number>();
  for (const word of Object.values(pairs))
    placed.set(word, (placed.get(word) ?? 0) + 1);
  const seen = new Map<string, number>();
  const isUsed = (text: string) => {
    const nth = (seen.get(text) ?? 0) + 1;
    seen.set(text, nth);
    return (placed.get(text) ?? 0) >= nth;
  };

  const root = useRef<HTMLDivElement>(null);
  // The entry just used disables, which would drop the keyboard's place: the focus goes to the next entry still in the bank.
  const refocus = (afterIndex: number) =>
    window.setTimeout(() => {
      const bank = [
        ...(root.current?.querySelectorAll<HTMLButtonElement>(
          "button[data-bank-index]:not(:disabled)",
        ) ?? []),
      ];
      (
        bank.find((b) => Number(b.dataset.bankIndex) > afterIndex) ?? bank[0]
      )?.focus();
    }, 0);
  const fill = (word: string, index: number) => {
    if (!current) return;
    refocus(index);
    onChange({ ...pairs, [current]: word });
    setNote(t("fillBlank", { item: word, n: current }));
    setPicked(null);
  };
  const choose = (blank: string) => {
    if (pairs[blank]) {
      const next = { ...pairs };
      delete next[blank];
      onChange(next);
      setNote(t("clearBlank", { n: blank }));
    }
    setPicked(blank);
  };
  return (
    <div ref={root} className="mt-4 grid gap-3">
      <div className="flex flex-wrap gap-2">
        {blanks.map((blank) => (
          // eslint-disable-next-line no-restricted-syntax -- a blank: pressing it makes it current, or empties it if filled.
          <button
            key={blank}
            type="button"
            disabled={disabled}
            aria-pressed={current === blank}
            aria-label={`${t("blankN", { n: blank })}: ${pairs[blank] ?? t("blankEmpty")}`}
            onClick={() => choose(blank)}
            className={`lesson-sketch-sm lesson-hand min-h-11 min-w-24 px-4 py-2 text-[18px] ${current === blank ? "bg-[var(--ls-accent)]" : ""}`}
          >
            <span aria-hidden>{blank}. </span>
            {pairs[blank] ?? "____"}
          </button>
        ))}
      </div>
      <div>
        <p
          id={`wordbank-${check.id}`}
          className="lesson-hand mb-1 text-[16px] text-[var(--ls-ink-mid)]"
        >
          {t("wordBank")}
        </p>
        <div
          role="group"
          aria-labelledby={`wordbank-${check.id}`}
          className="flex flex-wrap gap-2"
        >
          {check.options.map((word, index) => {
            const taken = isUsed(word.text);
            return (
              // eslint-disable-next-line no-restricted-syntax -- a bank entry: pressing it puts it in the current blank.
              <button
                key={word.id}
                type="button"
                disabled={disabled || taken || current === null}
                data-bank-index={index}
                onClick={() => fill(word.text, index)}
                className="lesson-sketch-sm lesson-hand min-h-11 px-4 py-2 text-[18px] disabled:opacity-40"
              >
                {word.text}
              </button>
            );
          })}
        </div>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {note}
      </p>
    </div>
  );
}
