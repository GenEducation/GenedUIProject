"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { CheckItem } from "../types";
import { useUiText } from "../i18n";

/**
 * Sequencing by buttons: each entry has "move up" and "move down", so the whole answer is built with Tab and Enter or Space
 * (and by tap on a phone), no dragging needed. After each move a polite live note says where the entry now is. The list starts in
 * the order the server served the entries, which is never the key's order.
 */
export function Sequencing({
  check,
  order,
  onChange,
  disabled = false,
}: {
  check: CheckItem;
  order: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const t = useUiText();
  const [note, setNote] = useState("");
  const list = useRef<HTMLOListElement>(null);
  // A button that becomes disabled (an entry reaching an end) would drop the keyboard's place: keep the focus with the entry being
  // moved, on the same direction while it can still go that way, else on the other.
  const keepFocus = (entry: string, direction: "up" | "down", atEnd: boolean) =>
    window.setTimeout(() => {
      const wanted = atEnd ? (direction === "up" ? "down" : "up") : direction;
      list.current?.querySelector<HTMLButtonElement>(`button[data-entry="${CSS.escape(entry)}"][data-direction="${wanted}"]`)?.focus();
    }, 0);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    keepFocus(order[from], to < from ? "up" : "down", to === 0 || to === order.length - 1);
    const next = order.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setNote(t("atPosition", { item, n: to + 1, m: next.length }));
  };
  return (
    <div className="mt-4">
      <p id={`order-${check.id}`} className="lesson-hand mb-2 text-[16px] text-[var(--ls-ink-mid)]">
        {t("yourOrder")}
      </p>
      <ol ref={list} aria-labelledby={`order-${check.id}`} className="grid gap-2">
        {order.map((entry, index) => (
          <li key={entry} className="lesson-sketch-sm lesson-hand flex min-h-11 items-center gap-3 px-4 py-2 text-[18px]">
            <span aria-hidden className="w-6 shrink-0 text-[var(--ls-ink-mid)]">
              {index + 1}.
            </span>
            <span className="min-w-0 flex-1">{entry}</span>
            {/* eslint-disable-next-line no-restricted-syntax -- a move control inside the sequencing list. */}
            <button
              type="button"
              disabled={disabled || index === 0}
              data-entry={entry}
              data-direction="up"
              onClick={() => move(index, index - 1)}
              aria-label={t("moveUp", { item: entry })}
              className="rounded-full p-2 hover:bg-[var(--ls-primary-soft)] disabled:opacity-30"
            >
              <ArrowUp size={18} aria-hidden />
            </button>
            {/* eslint-disable-next-line no-restricted-syntax -- a move control inside the sequencing list. */}
            <button
              type="button"
              disabled={disabled || index === order.length - 1}
              data-entry={entry}
              data-direction="down"
              onClick={() => move(index, index + 1)}
              aria-label={t("moveDown", { item: entry })}
              className="rounded-full p-2 hover:bg-[var(--ls-primary-soft)] disabled:opacity-30"
            >
              <ArrowDown size={18} aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="sr-only">
        {note}
      </p>
    </div>
  );
}
