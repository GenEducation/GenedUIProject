"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { PANEL_CLASSNAME } from "./Select";
import { usePopoverPosition, VIEWPORT_MARGIN } from "./usePopoverPosition";
import { withBorderLonghands } from "./fieldStyles";
import {
  addDays,
  formatDateDisplay,
  parseIsoDate,
  toIsoDate,
  todayDateString,
} from "@/utils/datetime";

export type DatePickerSize = "sm" | "md" | "lg";

export interface DatePickerProps {
  /** `YYYY-MM-DD`, or "" for empty. */
  value: string;
  onChange: (value: string) => void;
  /** Inclusive bounds, `YYYY-MM-DD`. */
  min?: string;
  max?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Tints focus ring, selection and today. Defaults to --primary. */
  accentColor?: string;
  size?: DatePickerSize;
  /** Shows an inline clear button once a date is set. */
  clearable?: boolean;
  /** Shows the "Today" shortcut in the panel footer. */
  showToday?: boolean;
  name?: string;
  id?: string;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  panelStyle?: React.CSSProperties;
  "aria-label"?: string;
}

const PANEL_WIDTH = 300;
const PANEL_HEIGHT_ESTIMATE = 380;
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_FORMAT: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };

const SIZE_STYLES: Record<DatePickerSize, { padding: string; fontSize: number }> = {
  sm: { padding: "6px 12px", fontSize: 12 },
  md: { padding: "9px 14px", fontSize: 13.5 },
  lg: { padding: "13px 16px", fontSize: 14 },
};

/**
 * The app's single date picker.
 *
 * Replaces two divergent implementations: the student `DatePicker` (rendered
 * in normal document flow, so opening it grew whatever card contained it) and
 * the lab `DatePickerField` (correct, but emerald-only with no label/error
 * support). The panel portals to <body> and is positioned by the shared
 * `usePopoverPosition`, so it floats over the layout, flips above the trigger
 * near the viewport bottom, and is never clipped by an `overflow:hidden`
 * ancestor.
 *
 * Keyboard: Enter/Space/Arrow opens; arrows move by day, PageUp/PageDown by
 * month, Home/End to week bounds, Enter selects, Esc closes and restores focus.
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  label,
  error,
  disabled = false,
  placeholder = "Select a date",
  accentColor,
  size = "md",
  clearable = false,
  showToday = true,
  name,
  id,
  required,
  className,
  buttonClassName,
  buttonStyle,
  panelStyle,
  ...rest
}: DatePickerProps) {
  const reactId = useId();
  const fieldId = id ?? `date-${reactId}`;
  const accent = accentColor ?? "var(--primary)";

  const [isOpen, setIsOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const selected = useMemo(() => parseIsoDate(value), [value]);

  // The month on screen is derived, not synced. It follows `value` by default,
  // and a user paging through months stores an override keyed to the value it
  // was made against — so when `value` changes from outside, the key stops
  // matching and the override is discarded automatically. Doing this with an
  // effect would mean a setState-driven cascading render on every selection.
  const [monthOverride, setMonthOverride] = useState<{ key: string; date: Date } | null>(null);
  const viewMonth =
    monthOverride?.key === value
      ? monthOverride.date
      : (selected ?? parseIsoDate(min ?? "") ?? new Date());
  const [cursor, setCursor] = useState<string>(value || todayDateString());

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const position = usePopoverPosition(isOpen, triggerRef, {
    width: PANEL_WIDTH,
    estimatedHeight: PANEL_HEIGHT_ESTIMATE,
  });

  const close = useCallback((refocus = true) => {
    setIsOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const open = useCallback(() => {
    if (disabled) return;
    setCursor(value || todayDateString());
    setMonthOverride(null); // reopen on the selected month, not wherever we last paged to
    setIsOpen(true);
  }, [disabled, value]);

  // Both halves checked explicitly: the panel is portalled, so one container
  // ref cannot cover trigger and panel together.
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      close(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen, close]);

  const isOutOfRange = useCallback(
    (iso: string) => (min !== undefined && iso < min) || (max !== undefined && iso > max),
    [min, max],
  );

  const commit = (iso: string) => {
    if (isOutOfRange(iso)) return;
    onChange(iso);
    close();
  };

  const moveCursor = (days: number) => {
    const next = addDays(cursor, days);
    if (!next) return;
    setCursor(next);
    const d = parseIsoDate(next);
    if (d) setMonthOverride({ key: value, date: d });
  };

  const moveMonth = (delta: number) => {
    setMonthOverride({
      key: value,
      date: new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        open();
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        return;
      case "Tab":
        close(false);
        return;
      case "ArrowLeft":
        e.preventDefault();
        moveCursor(-1);
        return;
      case "ArrowRight":
        e.preventDefault();
        moveCursor(1);
        return;
      case "ArrowUp":
        e.preventDefault();
        moveCursor(-7);
        return;
      case "ArrowDown":
        e.preventDefault();
        moveCursor(7);
        return;
      case "Home":
        e.preventDefault();
        moveCursor(-(parseIsoDate(cursor)?.getDay() ?? 0));
        return;
      case "End":
        e.preventDefault();
        moveCursor(6 - (parseIsoDate(cursor)?.getDay() ?? 0));
        return;
      case "PageUp":
        e.preventDefault();
        moveCursor(-28);
        return;
      case "PageDown":
        e.preventDefault();
        moveCursor(28);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(cursor);
        return;
    }
  };

  const today = todayDateString();
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const displayValue = formatDateDisplay(value, "long");

  const panel = isOpen && position && (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={label ?? rest["aria-label"] ?? "Choose a date"}
      initial={{ opacity: 0, y: position.flipped ? 6 : -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: position.flipped ? 6 : -6, scale: 0.97 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: PANEL_WIDTH,
        maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
        maxHeight: `calc(100vh - ${VIEWPORT_MARGIN * 2}px)`,
        ...panelStyle,
      }}
      className={`z-[200] overflow-y-auto p-4 ${PANEL_CLASSNAME}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => moveMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--primary-ink)]/5 hover:text-[var(--primary-ink)]"
        >
          <ChevronLeft size={16} />
        </button>
        <span aria-live="polite" className="text-sm font-bold tracking-tight" style={{ color: "var(--primary-ink)" }}>
          {viewMonth.toLocaleDateString("en-US", MONTH_FORMAT)}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => moveMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--primary-ink)]/5 hover:text-[var(--primary-ink)]"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((d, i) => (
          <div
            key={`${d}-${i}`}
            aria-hidden="true"
            className="flex h-7 items-center justify-center text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const iso = toIsoDate(new Date(year, month, day))!;
          const isSelected = iso === value;
          const isToday = iso === today;
          const isCursor = iso === cursor;
          const outOfRange = isOutOfRange(iso);

          return (
            <button
              type="button"
              key={iso}
              role="gridcell"
              data-date={iso}
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              disabled={outOfRange}
              onClick={() => commit(iso)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-25"
              style={{
                background: isSelected
                  ? accent
                  : isCursor
                    ? `color-mix(in srgb, ${accent} 12%, transparent)`
                    : "transparent",
                color: isSelected
                  ? "#FFFFFF"
                  : isToday
                    ? accent
                    : "var(--text-primary)",
                boxShadow: isToday && !isSelected ? `inset 0 0 0 1.5px ${accent}` : undefined,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {showToday && (
        <button
          type="button"
          onClick={() => commit(today)}
          disabled={isOutOfRange(today)}
          className="mt-3 w-full rounded-xl border border-[var(--surface-border)] py-2 text-[11.5px] font-bold uppercase tracking-wide text-[var(--text-muted)] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={{ ["--tw-accent" as string]: accent }}
          onMouseEnter={(e) => {
            if (isOutOfRange(today)) return;
            e.currentTarget.style.borderColor = accent;
            e.currentTarget.style.color = accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.color = "";
          }}
        >
          Today
        </button>
      )}
    </motion.div>
  );

  return (
    <div className={`relative ${className ?? ""}`}>
      {label && (
        <label htmlFor={fieldId} className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-mid)]">
          {label}
          {required && <span style={{ color: "var(--danger-2)" }}> *</span>}
        </label>
      )}

      <div className="relative">
        <button
          ref={triggerRef}
          id={fieldId}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          aria-label={rest["aria-label"]}
          disabled={disabled}
          onClick={() => (isOpen ? close(false) : open())}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`flex w-full items-center justify-between gap-3 text-left outline-none transition-all duration-150 ${
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          } ${buttonClassName ?? ""}`}
          style={{
            ...withBorderLonghands({
            padding: SIZE_STYLES[size].padding,
            fontSize: SIZE_STYLES[size].fontSize,
            fontFamily: "var(--font-body)",
            fontWeight: 500,
            background: "var(--surface-sunken)",
            // Longhands, not the `border` shorthand — the focus/open states below
            // override borderColor, and React warns when the two are mixed.
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: error ? "var(--danger-2)" : "rgba(4,46,92,0.05)",
            borderRadius: 16,
            color: "var(--text-primary)",
            ...buttonStyle,
            }),
            ...(focused && !isOpen
              ? { boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 16%, transparent)`, borderColor: accent }
              : isOpen
                ? { borderColor: accent }
                : undefined),
          }}
        >
          <span
            className="min-w-0 flex-1 truncate"
            style={displayValue ? undefined : { color: "var(--text-muted)", fontWeight: 400 }}
          >
            {displayValue ?? placeholder}
          </span>
          <CalendarDays size={16} className="shrink-0" style={{ color: isOpen ? accent : "var(--text-muted)" }} />
        </button>

        {clearable && value && !disabled && (
          <button
            type="button"
            aria-label="Clear date"
            onClick={() => onChange("")}
            className="absolute right-9 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--primary-ink)]"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Mirrors the value for `new FormData(form)` — the visible control is a
          button, not an input. */}
      {name && <input type="hidden" name={name} value={value} />}

      {error && (
        <p
          id={`${fieldId}-error`}
          role="alert"
          className="mt-1.5 text-[12px] font-medium"
          style={{ color: "var(--danger-2)" }}
        >
          {error}
        </p>
      )}

      {typeof document !== "undefined" &&
        createPortal(<AnimatePresence>{panel}</AnimatePresence>, document.body)}
    </div>
  );
}
