"use client";

import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { CheckItem } from "../types";
import { useUiText } from "../i18n";

/**
 * Matching by tapping: the items on the left and the candidates on the right are both on screen, so nothing is hidden in a list.
 * The current item (the first unmatched one, or the one the learner picked) is marked; tapping a candidate pairs it with that item,
 * and the pair shares a numbered badge on both sides. Tapping a matched item undoes its pair and makes it current; tapping a candidate
 * already paired elsewhere moves it, so the pairing stays one to one. Everything is a button (Tab, Enter or Space, or a tap), a screen
 * reader hears "cat: meow" or "cat: not matched yet", and a polite note says what changed.
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
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const firstOpen = lefts.find((left) => !pairs[left]) ?? null;
  const current = picked && !pairs[picked] ? picked : firstOpen;
  /** The left entry a candidate is paired with, if any. */
  const owner = (text: string) => lefts.find((left) => pairs[left] === text) ?? null;
  const number = (left: string) => lefts.indexOf(left) + 1;

  // After a pair is made, the keyboard's place moves to the next item still to match, so the learner can go on at once.
  const focusLeft = (left: string | null) =>
    window.setTimeout(() => {
      if (left) root.current?.querySelector<HTMLButtonElement>(`button[data-left="${CSS.escape(left)}"]`)?.focus();
    }, 0);

  const chooseLeft = (left: string) => {
    if (pairs[left]) {
      const next = { ...pairs };
      delete next[left];
      onChange(next);
      setNote(t("pairCleared", { item: left }));
    }
    setPicked(left);
  };

  const chooseRight = (text: string) => {
    if (!current) return;
    const next = { ...pairs };
    const from = owner(text);
    if (from) delete next[from];
    next[current] = text;
    onChange(next);
    setNote(t("pairMade", { item: current, other: text }));
    setPicked(null);
    focusLeft(lefts.find((left) => !next[left]) ?? null);
  };

  return (
    <div ref={root} className="mt-4 grid gap-4 sm:grid-cols-2">
      <div>
        <p id={`match-left-${check.id}`} className="lesson-hand mb-2 text-[16px] text-[var(--ls-ink-mid)]">
          {t("matchPick")}
        </p>
        <ul aria-labelledby={`match-left-${check.id}`} className="grid gap-2">
          {lefts.map((left) => {
            const pair = pairs[left];
            return (
              <li key={left}>
                {/* eslint-disable-next-line no-restricted-syntax -- an item to match: pressing it makes it current, or undoes its pair. */}
                <button
                  type="button"
                  data-left={left}
                  disabled={disabled}
                  aria-pressed={current === left}
                  aria-label={`${left}: ${pair ?? t("notMatched")}`}
                  onClick={() => chooseLeft(left)}
                  className="lesson-chip lesson-sketch-sm lesson-hand w-full justify-start text-left"
                >
                  <span aria-hidden className="lesson-pair-badge" data-empty={pair ? undefined : ""}>
                    {number(left)}
                  </span>
                  <span className="min-w-0 flex-1">{left}</span>
                  {pair && (
                    <span aria-hidden className="flex min-w-0 items-center gap-1 text-[var(--ls-primary)]">
                      <ArrowRight size={16} className="shrink-0" />
                      <span className="truncate">{pair}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <p id={`match-right-${check.id}`} className="lesson-hand mb-2 text-[16px] text-[var(--ls-ink-mid)]">
          {current ? t("matchWith", { item: current }) : t("allMatched")}
        </p>
        <div role="group" aria-labelledby={`match-right-${check.id}`} className="flex flex-wrap gap-2">
          {check.options.map((option) => {
            const from = owner(option.text);
            return (
              // eslint-disable-next-line no-restricted-syntax -- a candidate: pressing it pairs it with the current item.
              <button
                key={option.id}
                type="button"
                disabled={disabled || !current}
                aria-label={from ? t("matchedWith", { item: option.text, other: from }) : option.text}
                onClick={() => chooseRight(option.text)}
                data-used={from ? "" : undefined}
                className="lesson-chip lesson-sketch-sm lesson-hand"
              >
                {from && (
                  <span aria-hidden className="lesson-pair-badge">
                    {number(from)}
                  </span>
                )}
                {option.text}
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
