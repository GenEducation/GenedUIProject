"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, X } from "lucide-react";
import { PANEL_CLASSNAME } from "./Select";
import { usePopoverPosition, VIEWPORT_MARGIN } from "./usePopoverPosition";
import { formatTimeDisplay, from12Hour, parseHhMm, to12Hour, toHhMm } from "@/utils/datetime";
import { withBorderLonghands } from "./fieldStyles";

export type TimePickerSize = "sm" | "md" | "lg";
/**
 * `auto` picks by pointer type: wheels on touch, typed entry on mouse.
 * Pin a mode when a surface needs one specifically — and in tests, so both
 * paths are driven deterministically without faking media queries.
 */
export type TimePickerMode = "auto" | "wheel" | "typed";

export interface TimePickerProps {
  /** `HH:MM`, 24-hour. "" for empty. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  accentColor?: string;
  size?: TimePickerSize;
  mode?: TimePickerMode;
  /** Minute granularity for the wheel. Defaults to 5. */
  minuteStep?: number;
  clearable?: boolean;
  name?: string;
  id?: string;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  panelStyle?: React.CSSProperties;
  "aria-label"?: string;
}

const PANEL_WIDTH = 240;
const WHEEL_HEIGHT_ESTIMATE = 260;
const TYPED_HEIGHT_ESTIMATE = 130;
const ROW_HEIGHT = 36;
const DEFAULT_MINUTES = 9 * 60; // 9:00 AM — a sane default for an empty picker

const SIZE_STYLES: Record<TimePickerSize, { padding: string; fontSize: number }> = {
  sm: { padding: "6px 12px", fontSize: 12 },
  md: { padding: "9px 14px", fontSize: 13.5 },
  lg: { padding: "13px 16px", fontSize: 14 },
};

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1));

const COARSE_POINTER_QUERY = "(pointer: coarse)";

function subscribeToCoarsePointer(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia(COARSE_POINTER_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getCoarsePointerSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}

/**
 * One wheel column.
 *
 * The previous student implementation faked infinite scroll by materializing
 * 50 copies of the list — 3000 DOM nodes for minutes alone — and re-centred it
 * on a debounce timer. This renders each item exactly once and relies on CSS
 * scroll-snap, so there is no timer, no reset jump, and no dangerouslySetInnerHTML
 * scrollbar hack.
 */
function WheelColumn({
  items,
  value,
  onChange,
  accent,
  ariaLabel,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  accent: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const index = Math.max(0, items.indexOf(value));

  // Centre the current item when the panel opens.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = index * ROW_HEIGHT;
    // Only on mount: later scrolls are user-driven and must not be yanked back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guarded because jsdom (and older webviews) don't implement Element.scrollTo.
  const scrollToItem = (item: string) => {
    ref.current?.scrollTo?.({ top: items.indexOf(item) * ROW_HEIGHT });
  };

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    const next = items[Math.round(el.scrollTop / ROW_HEIGHT)];
    if (next !== undefined && next !== value) onChange(next);
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={0}
      onScroll={handleScroll}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const next = items[index + (e.key === "ArrowDown" ? 1 : -1)];
          if (next !== undefined) {
            onChange(next);
            scrollToItem(next);
          }
        }
      }}
      className="time-wheel h-[144px] flex-1 snap-y snap-mandatory overflow-y-auto outline-none"
      style={{ scrollbarWidth: "none", paddingBlock: ROW_HEIGHT * 1.5 }}
    >
      {items.map((item) => {
        const isSelected = item === value;
        return (
          <button
            key={item}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => {
              onChange(item);
              scrollToItem(item);
            }}
            className="flex w-full snap-center items-center justify-center text-[15px] transition-colors"
            style={{
              height: ROW_HEIGHT,
              fontWeight: isSelected ? 800 : 500,
              color: isSelected ? accent : "var(--text-muted)",
            }}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The app's single time picker.
 *
 * Replaces three incompatible models: the student wheel picker (rendered in
 * document flow, so opening it grew its container), the lab typed picker, and
 * raw `<input type="time">`. Presentation adapts to pointer type; both modes
 * read and write the same `HH:MM` string through the shared datetime helpers,
 * which is what keeps them from drifting apart.
 */
export function TimePicker({
  value,
  onChange,
  label,
  error,
  disabled = false,
  placeholder = "Select a time",
  accentColor,
  size = "md",
  mode = "auto",
  minuteStep = 5,
  clearable = true,
  name,
  id,
  required,
  className,
  buttonClassName,
  buttonStyle,
  panelStyle,
  ...rest
}: TimePickerProps) {
  const reactId = useId();
  const fieldId = id ?? `time-${reactId}`;
  const accent = accentColor ?? "var(--primary)";

  const [isOpen, setIsOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // useSyncExternalStore rather than an effect: the server snapshot is `false`,
  // so SSR and the first client render agree (no hydration mismatch), and the
  // subscription updates without a setState-driven cascading render.
  const isCoarsePointer = useSyncExternalStore(
    subscribeToCoarsePointer,
    getCoarsePointerSnapshot,
    () => false,
  );

  const resolvedMode: "wheel" | "typed" =
    mode === "auto" ? (isCoarsePointer ? "wheel" : "typed") : mode;

  const minutes = parseHhMm(value) ?? DEFAULT_MINUTES;
  const { hour12, minute, period } = to12Hour(minutes);

  const position = usePopoverPosition(isOpen, triggerRef, {
    width: PANEL_WIDTH,
    estimatedHeight: resolvedMode === "wheel" ? WHEEL_HEIGHT_ESTIMATE : TYPED_HEIGHT_ESTIMATE,
  });

  const minuteItems = useMemo(
    () =>
      Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) =>
        String(i * minuteStep).padStart(2, "0"),
      ),
    [minuteStep],
  );

  const close = useCallback((refocus = true) => {
    setIsOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const open = useCallback(() => {
    if (disabled) return;
    // Committing the default on open means the wheel never shows a selection
    // the caller doesn't have.
    if (!parseHhMm(value)) onChange(toHhMm(DEFAULT_MINUTES));
    setIsOpen(true);
  }, [disabled, value, onChange]);

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

  const setParts = (h: number, m: number, p: "AM" | "PM") => onChange(toHhMm(from12Hour(h, m, p)));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        open();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  const displayValue = formatTimeDisplay(value);

  const periodToggle = (
    <div className="flex overflow-hidden rounded-xl border border-[var(--surface-border)]">
      {(["AM", "PM"] as const).map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={period === p}
          onClick={() => setParts(hour12, minute, p)}
          className="px-3 py-1.5 text-[12px] font-bold transition-colors"
          style={{
            background: period === p ? accent : "transparent",
            color: period === p ? "#FFFFFF" : "var(--text-muted)",
          }}
        >
          {p}
        </button>
      ))}
    </div>
  );

  const panel = isOpen && position && (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={label ?? rest["aria-label"] ?? "Choose a time"}
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
        ...panelStyle,
      }}
      className={`z-[200] p-3 ${PANEL_CLASSNAME}`}
    >
      {resolvedMode === "wheel" ? (
        <>
          <div className="relative flex items-stretch gap-1">
            {/* Selection band behind the wheels */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-xl"
              style={{
                height: ROW_HEIGHT,
                background: `color-mix(in srgb, ${accent} 10%, transparent)`,
              }}
            />
            <WheelColumn
              ariaLabel="Hour"
              items={HOURS_12}
              value={String(hour12)}
              onChange={(h) => setParts(Number(h), minute, period)}
              accent={accent}
            />
            <WheelColumn
              ariaLabel="Minute"
              items={minuteItems}
              value={String(minute).padStart(2, "0")}
              onChange={(m) => setParts(hour12, Number(m), period)}
              accent={accent}
            />
            <WheelColumn
              ariaLabel="AM or PM"
              items={["AM", "PM"]}
              value={period}
              onChange={(p) => setParts(hour12, minute, p as "AM" | "PM")}
              accent={accent}
            />
          </div>
          <button
            type="button"
            onClick={() => close()}
            className="mt-3 w-full rounded-xl py-2 text-[12px] font-bold uppercase tracking-wide text-white"
            style={{ background: accent }}
          >
            Done
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="numeric"
              aria-label="Hour"
              value={String(hour12)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, "").slice(0, 2));
                if (n >= 1 && n <= 12) setParts(n, minute, period);
              }}
              className="w-12 rounded-lg border border-[var(--surface-border)] px-1 py-2 text-center text-sm font-bold text-[var(--text-primary)] outline-none"
            />
            <span className="font-bold text-[var(--text-muted)]">:</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Minute"
              value={String(minute).padStart(2, "0")}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, "").slice(0, 2));
                if (n >= 0 && n <= 59) setParts(hour12, n, period);
              }}
              className="w-12 rounded-lg border border-[var(--surface-border)] px-1 py-2 text-center text-sm font-bold text-[var(--text-primary)] outline-none"
            />
            {periodToggle}
          </div>
          <button
            type="button"
            onClick={() => close()}
            className="mt-3 w-full rounded-xl py-2 text-[12px] font-bold uppercase tracking-wide text-white"
            style={{ background: accent }}
          >
            Done
          </button>
        </>
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
          <Clock size={16} className="shrink-0" style={{ color: isOpen ? accent : "var(--text-muted)" }} />
        </button>

        {clearable && value && !disabled && (
          <button
            type="button"
            aria-label="Clear time"
            onClick={() => onChange("")}
            className="absolute right-9 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--primary-ink)]"
          >
            <X size={13} />
          </button>
        )}
      </div>

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
