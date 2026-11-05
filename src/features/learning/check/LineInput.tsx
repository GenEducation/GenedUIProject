"use client";

import { Minus, Plus } from "lucide-react";
import type { CheckItem } from "../types";
import { useUiText } from "../i18n";
import { stepped, ticks, toNumber, valueText } from "./lineMath";

/**
 * A number line or a slider. Both are a native range input (so arrow keys step, Home/End jump to the ends, PageUp/PageDown take bigger
 * steps, and a finger or pointer drags), plus the ways in for anyone who cannot drag: "smaller" and "larger" buttons that move by one
 * step, and a box to type the number. The line draws its labelled ticks and marks the point once placed; the slider shows its value as
 * it moves. Nothing is sent until the learner has placed a value, and a first look at the control sends nothing.
 */
export function LineInput({
  check,
  number,
  onChange,
  disabled = false,
}: {
  check: CheckItem;
  number: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
}) {
  const t = useUiText();
  const entry = check.entry;
  if (!entry || entry.mode === "tiles") return null;
  const min = toNumber(entry.min);
  const max = toNumber(entry.max);
  const step = toNumber(entry.step);
  const placed = number === null || number === "" ? null : toNumber(number);
  const valid = placed !== null && Number.isFinite(placed);
  const isLine = entry.mode === "number_line";
  const id = `line-${check.id}`;
  const move = (delta: number) => onChange(valueText(stepped(valid ? (placed as number) : delta > 0 ? min - step : max + step, delta, min, max, step)));
  const share = valid ? Math.min(100, Math.max(0, (((placed as number) - min) / (max - min)) * 100)) : 0;

  return (
    <div className="mt-4">
      <p id={`${id}-help`} className="lesson-hand mb-2 text-[16px] text-[var(--ls-ink-mid)]">
        {isLine ? t("placeOnLine") : null}
      </p>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line no-restricted-syntax -- steps the value down by one step: a tap alternative to dragging. */}
        <button type="button" disabled={disabled} onClick={() => move(-1)} aria-label={t("smaller")} className="min-h-11 min-w-11 rounded-full bg-[var(--ls-sage)] p-2">
          <Minus size={18} aria-hidden className="mx-auto" />
        </button>
        <div className="relative min-w-0 flex-1 pb-6">
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={valid ? (placed as number) : min}
            disabled={disabled}
            aria-labelledby={`check-${check.id}`}
            aria-describedby={`${id}-help ${id}-value`}
            aria-valuetext={valid ? t("yourPoint", { n: valueText(placed as number) }) : t("notPlaced")}
            onChange={(e) => onChange(valueText(Number(e.target.value)))}
            className={`h-11 w-full cursor-pointer accent-[var(--ls-primary)] ${valid ? "" : "opacity-60"}`}
          />
          {isLine && (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between text-[13px] text-[var(--ls-ink-mid)]">
              {ticks(min, max, step).map((tick) => (
                <span key={tick}>{valueText(tick)}</span>
              ))}
            </div>
          )}
          {isLine && valid && (
            <span aria-hidden className="pointer-events-none absolute -top-1 text-[18px] font-bold text-[var(--ls-primary)]" style={{ left: `calc(${share}% - 6px)` }}>
              ●
            </span>
          )}
        </div>
        {/* eslint-disable-next-line no-restricted-syntax -- steps the value up by one step: a tap alternative to dragging. */}
        <button type="button" disabled={disabled} onClick={() => move(1)} aria-label={t("larger")} className="min-h-11 min-w-11 rounded-full bg-[var(--ls-sage)] p-2">
          <Plus size={18} aria-hidden className="mx-auto" />
        </button>
      </div>
      <p id={`${id}-value`} aria-live="polite" className="lesson-hand mt-1 text-[18px] text-[var(--ls-primary)]">
        {valid ? t("yourPoint", { n: valueText(placed as number) }) : t("notPlaced")}
      </p>
      <label className="lesson-hand mt-2 flex flex-wrap items-center gap-3 text-[16px] text-[var(--ls-ink-mid)]">
        {t("orTypeNumber")}
        <input
          inputMode="decimal"
          autoComplete="off"
          value={number ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.trim() === "" ? null : e.target.value)}
          className="lesson-hand w-28 border-0 border-b-2 border-dashed border-[var(--ls-ink-faint)] bg-transparent px-1 py-1 text-[18px] outline-none focus:border-solid focus:border-[var(--ls-primary)]"
        />
      </label>
    </div>
  );
}
