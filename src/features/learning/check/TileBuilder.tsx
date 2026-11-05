"use client";

import { useState } from "react";
import type { CheckItem } from "../types";
import { useUiText } from "../i18n";
import { tilesOf } from "./formats";

/**
 * Tiles to build an expression from. Tap (or Tab to and press Enter or Space on) a tile in the bank to add it to the answer row; tap
 * a tile in the row to take it back; "Undo" removes the last one and Backspace does the same from the keyboard; "Clear" starts again.
 * A tile can be used once. The row is read as the expression the tiles spell, so the order matters and nothing else does.
 */
export function TileBuilder({
  check,
  built,
  onChange,
  disabled = false,
}: {
  check: CheckItem;
  built: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}) {
  const t = useUiText();
  const tiles = tilesOf(check);
  const [note, setNote] = useState("");
  const add = (index: number) => {
    onChange([...built, index]);
    setNote(t("addTile", { item: tiles[index] }));
  };
  const remove = (position: number) => {
    setNote(t("removeTile", { item: tiles[built[position]] }));
    onChange(built.filter((_, i) => i !== position));
  };
  const undo = () => built.length > 0 && remove(built.length - 1);
  const tile = "lesson-sketch-sm lesson-hand min-h-11 min-w-11 px-3 py-2 text-[20px] disabled:opacity-40";

  return (
    <div
      className="mt-4 grid gap-3"
      onKeyDown={(e) => {
        if (e.key === "Backspace" && !(e.target instanceof HTMLInputElement) && built.length > 0) {
          e.preventDefault();
          undo();
        }
      }}
    >
      <div>
        <p id={`row-${check.id}`} className="lesson-hand mb-1 text-[16px] text-[var(--ls-ink-mid)]">
          {t("tilesAnswer")}
        </p>
        <div role="group" aria-labelledby={`row-${check.id}`} className="lesson-sketch-sm flex min-h-14 flex-wrap items-center gap-2 px-3 py-2">
          {built.length === 0 && <span className="lesson-hand text-[16px] text-[var(--ls-ink-faint)]">{t("tilesEmpty")}</span>}
          {built.map((index, position) => (
            // eslint-disable-next-line no-restricted-syntax -- a placed tile: pressing it takes it back.
            <button key={`${index}-${position}`} type="button" disabled={disabled} onClick={() => remove(position)} aria-label={t("removeTile", { item: tiles[index] })} className={`${tile} bg-[var(--ls-accent)]`}>
              {tiles[index]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p id={`bank-${check.id}`} className="lesson-hand mb-1 text-[16px] text-[var(--ls-ink-mid)]">
          {t("tilesBank")}
        </p>
        <div role="group" aria-labelledby={`bank-${check.id}`} className="flex flex-wrap gap-2">
          {tiles.map((text, index) => (
            // eslint-disable-next-line no-restricted-syntax -- a tile in the bank: pressing it adds it to the answer.
            <button key={`${text}-${index}`} type="button" disabled={disabled || built.includes(index)} onClick={() => add(index)} aria-label={t("addTile", { item: text })} className={tile}>
              {text}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        {/* eslint-disable-next-line no-restricted-syntax -- removes the last tile. */}
        <button type="button" disabled={disabled || built.length === 0} onClick={undo} className="lesson-hand rounded-full bg-[var(--ls-sage)] px-4 py-2 text-[16px] disabled:opacity-40">
          {t("undoTile")}
        </button>
        {/* eslint-disable-next-line no-restricted-syntax -- clears every tile. */}
        <button type="button" disabled={disabled || built.length === 0} onClick={() => { onChange([]); setNote(t("clearTiles")); }} className="lesson-hand rounded-full bg-[var(--ls-sage)] px-4 py-2 text-[16px] disabled:opacity-40">
          {t("clearTiles")}
        </button>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {note}
      </p>
    </div>
  );
}
