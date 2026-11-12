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
  const typedProblem =
    number === null || number === "" ? null : !valid ? t("notANumber") : (placed as number) < min || (placed as number) > max ? t("outOfRange", { min: valueText(min), max: valueText(max) }) : null;
  const pct = (value: number) => Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const steps = Math.round((max - min) / step);
  const labelled = ticks(min, max, step);
  // Every step gets a small mark while there are few enough to tell apart; the labels stay at about eleven.
  const marks = isLine && steps <= 40 ? Array.from({ length: steps + 1 }, (_, i) => min + i * step) : labelled;

  return (
    <div className="mt-4">
      {isLine && (
        <p id={`${id}-help`} className="lesson-hand mb-2 text-[16px] text-[var(--ls-ink-mid)]">
          {t("placeOnLine")}
        </p>
      )}
      <div className="flex items-start gap-2">
        {/* eslint-disable-next-line no-restricted-syntax -- steps the value down by one step: a tap alternative to dragging. */}
        <button type="button" disabled={disabled} onClick={() => move(-1)} aria-label={t("smaller")} className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full bg-[var(--ls-sage)] hover:bg-[var(--ls-primary-soft)] disabled:opacity-40">
          <Minus size={20} aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={valid ? Math.min(max, Math.max(min, placed as number)) : min}
            disabled={disabled}
            data-unplaced={valid ? undefined : ""}
            aria-labelledby={`check-${check.id}`}
            aria-describedby={`${isLine ? `${id}-help ` : ""}${id}-value`}
            aria-valuetext={valid ? t("yourPoint", { n: valueText(placed as number) }) : t("notPlaced")}
            onChange={(e) => onChange(valueText(Number(e.target.value)))}
            // A tap on the line where the hidden thumb already sits (the low end) changes nothing, so it would never place a point: place it.
            onPointerUp={(e) => {
              if (!valid && !disabled) onChange(valueText(Number(e.currentTarget.value)));
            }}
            className="lesson-range"
          />
          {isLine && (
            <div aria-hidden className="relative mx-[14px] h-9 text-[13px] text-[var(--ls-ink-mid)]">
              {marks.map((tick) => (
                <span key={`m${tick}`} className="absolute top-0 h-2 w-0.5 -translate-x-1/2 rounded bg-[var(--ls-ink-faint)]" style={{ left: `${pct(tick)}%` }} />
              ))}
              {labelled.map((tick) => (
                <span key={`l${tick}`} className="absolute top-3 -translate-x-1/2 tabular-nums" style={{ left: `${pct(tick)}%` }}>
                  {valueText(tick)}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* eslint-disable-next-line no-restricted-syntax -- steps the value up by one step: a tap alternative to dragging. */}
        <button type="button" disabled={disabled} onClick={() => move(1)} aria-label={t("larger")} className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full bg-[var(--ls-sage)] hover:bg-[var(--ls-primary-soft)] disabled:opacity-40">
          <Plus size={20} aria-hidden />
        </button>
      </div>
      <p id={`${id}-value`} aria-live="polite" className={`lesson-hand mt-1 text-[18px] ${valid ? "font-bold text-[var(--ls-primary)]" : "text-[var(--ls-ink-mid)]"}`}>
        {valid ? t("yourPoint", { n: valueText(placed as number) }) : t("notPlaced")}
      </p>
      <label className="lesson-hand mt-2 flex flex-wrap items-center gap-3 text-[16px] text-[var(--ls-ink-mid)]">
        {t("orTypeNumber")}
        <input
          inputMode="decimal"
          autoComplete="off"
          value={number ?? ""}
          disabled={disabled}
          aria-invalid={typedProblem ? true : undefined}
          aria-describedby={typedProblem ? `${id}-typed` : undefined}
          onChange={(e) => onChange(e.target.value.trim() === "" ? null : e.target.value)}
          className="lesson-hand min-h-11 w-28 border-0 border-b-2 border-dashed border-[var(--ls-ink-faint)] bg-transparent px-1 py-1 text-[18px] text-[var(--ls-ink)] outline-none focus:border-solid focus:border-[var(--ls-primary)] aria-[invalid=true]:border-[var(--ls-warn)]"
        />
      </label>
      {typedProblem && (
        <p id={`${id}-typed`} role="status" className="lesson-hand mt-1 text-[15px] text-[var(--ls-warn)]">
          {typedProblem}
        </p>
      )}
    </div>
  );
}
