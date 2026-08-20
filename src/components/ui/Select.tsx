"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";
import { usePopoverPosition, VIEWPORT_MARGIN } from "./usePopoverPosition";
import { withBorderLonghands } from "./fieldStyles";

export type SelectVariant = "field" | "filter" | "inline";
export type SelectSize = "sm" | "md" | "lg";
export type SelectTheme = "light" | "dark";

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  /** Optional second line under the label. */
  hint?: string;
}

export interface SelectProps<T extends string | number = string> {
  value: T | "";
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  size?: SelectSize;
  variant?: SelectVariant;
  theme?: SelectTheme;
  /** Tints the focus ring, chevron and selected option. Defaults to --primary. */
  accentColor?: string;
  /** Shows a filter box above the list. Auto-enables at 10+ options. */
  searchable?: boolean;
  /** Emitted as a hidden input so existing form/FormData wiring keeps working. */
  name?: string;
  id?: string;
  required?: boolean;
  className?: string;
  /** Applied to the trigger button. */
  buttonClassName?: string;
  /**
   * Merged last onto the trigger's inline styles. Needed by surfaces whose
   * design tokens are scoped to a wrapper class (e.g. `.gened-preorder`)
   * rather than `:root`, so the component's token defaults don't apply.
   */
  buttonStyle?: React.CSSProperties;
  /**
   * Merged onto the portalled panel. The panel renders under `<body>`, outside
   * any scoped-token wrapper, so fonts/colors from such a scope must be passed
   * explicitly here.
   */
  panelStyle?: React.CSSProperties;
  /** Overrides the panel width. Defaults to matching the trigger. */
  panelWidth?: number | "trigger";
  "aria-label"?: string;
}

/**
 * Shared panel chrome for every popover in the app (Select, DatePicker,
 * TimePicker, NotificationBell). Exported so those components can match this
 * one without re-deriving radius/border/shadow by hand — that drift is exactly
 * what this component exists to end.
 */
export const PANEL_CLASSNAME =
  "overflow-hidden rounded-2xl border border-[rgba(4,46,92,0.10)] bg-white shadow-[0_12px_32px_-8px_rgba(4,46,92,0.18),0_2px_8px_rgba(4,46,92,0.06)]";

export const PANEL_CLASSNAME_DARK =
  "overflow-hidden rounded-2xl border border-white/10 bg-[#13283a] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55)]";

const SIZE_STYLES: Record<SelectSize, { padding: string; fontSize: number; optionPad: string }> = {
  sm: { padding: "6px 12px", fontSize: 12, optionPad: "py-1.5 px-3" },
  md: { padding: "9px 14px", fontSize: 13.5, optionPad: "py-2 px-3.5" },
  lg: { padding: "13px 16px", fontSize: 14, optionPad: "py-2.5 px-4" },
};

const OPTION_ROW_HEIGHT = 38;
const MAX_PANEL_HEIGHT = 288; // max-h-72
const SEARCH_ROW_HEIGHT = 48;

// Border is written as longhands, never the `border` shorthand: the focus and
// open states override `borderColor` on re-render, and React warns (and can
// mis-apply styles) when a shorthand and its longhand are mixed on one element.
function triggerStyles(
  variant: SelectVariant,
  theme: SelectTheme,
  size: SelectSize,
  hasError: boolean,
): React.CSSProperties {
  const s = SIZE_STYLES[size];
  const base: React.CSSProperties = {
    padding: s.padding,
    fontSize: s.fontSize,
    fontFamily: "var(--font-body)",
    fontWeight: 500,
  };

  if (theme === "dark") {
    return {
      ...base,
      background: variant === "inline" ? "transparent" : "rgba(255,255,255,0.05)",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: hasError ? "var(--danger-2)" : "rgba(255,255,255,0.12)",
      borderRadius: variant === "filter" ? "var(--radius-pill)" : "var(--radius-control)",
      color: "#e8f0f7",
    };
  }

  switch (variant) {
    case "filter":
      return {
        ...base,
        background: "#FFFFFF",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: hasError ? "var(--danger-2)" : "var(--surface-border)",
        borderRadius: "var(--radius-pill)",
        color: "var(--text-primary)",
      };
    case "inline":
      return {
        ...base,
        background: "transparent",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "transparent",
        borderRadius: "var(--radius-control)",
        color: "var(--text-primary)",
      };
    default:
      return {
        ...base,
        background: "var(--surface-sunken)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: hasError ? "var(--danger-2)" : "rgba(4,46,92,0.05)",
        borderRadius: 16,
        color: "var(--text-primary)",
      };
  }
}

/**
 * The app's single dropdown. Native `<select>` renders an OS-drawn option list
 * — system font, square corners, platform-specific highlight — which is why
 * dropdowns were the one control that never matched the design anywhere in the
 * app. This owns both the trigger and the list, so a dropdown looks identical
 * in the preorder modal, the student portal and the admin console.
 *
 * Keyboard: Enter/Space/Arrow to open, Up/Down/Home/End to move, Enter to
 * select, Esc to close and restore focus, printable keys for typeahead.
 */
export function Select<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  label,
  error,
  disabled = false,
  size = "md",
  variant = "field",
  theme = "light",
  accentColor,
  searchable,
  name,
  id,
  required,
  className,
  buttonClassName,
  buttonStyle,
  panelStyle,
  panelWidth = "trigger",
  ...rest
}: SelectProps<T>) {
  const reactId = useId();
  const fieldId = id ?? `select-${reactId}`;
  const listboxId = `${fieldId}-listbox`;

  const accent = accentColor ?? "var(--primary)";
  const isDark = theme === "dark";
  const enableSearch = searchable ?? options.length >= 10;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ buffer: "", timer: 0 });

  const visible = useMemo(() => {
    if (!enableSearch || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, enableSearch]);

  const selected = options.find((o) => o.value === value);

  const estimatedHeight = Math.min(
    MAX_PANEL_HEIGHT,
    visible.length * OPTION_ROW_HEIGHT + 8 + (enableSearch ? SEARCH_ROW_HEIGHT : 0),
  );
  const position = usePopoverPosition(isOpen, triggerRef, {
    width: panelWidth,
    estimatedHeight,
  });

  const close = useCallback((refocus = true) => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(-1);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const open = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx);
  }, [disabled, options, value]);

  // Outside click. The panel is portalled to <body>, so a single container ref
  // can't cover both halves — both are checked explicitly.
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

  useEffect(() => {
    if (isOpen && enableSearch) searchRef.current?.focus();
  }, [isOpen, enableSearch]);

  // Keep the highlighted option in view while arrowing through a long list.
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const el = panelRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    // Guarded because jsdom (and older webviews) don't implement scrollIntoView.
    el?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const commit = (option: SelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    close();
  };

  const moveActive = (delta: number) => {
    if (!visible.length) return;
    let next = activeIndex;
    for (let i = 0; i < visible.length; i++) {
      next = (next + delta + visible.length) % visible.length;
      if (!visible[next]?.disabled) break;
    }
    setActiveIndex(next);
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
      case "ArrowDown":
        e.preventDefault();
        moveActive(1);
        return;
      case "ArrowUp":
        e.preventDefault();
        moveActive(-1);
        return;
      case "Home":
        e.preventDefault();
        setActiveIndex(visible.findIndex((o) => !o.disabled));
        return;
      case "End":
        e.preventDefault();
        for (let i = visible.length - 1; i >= 0; i--) {
          if (!visible[i].disabled) {
            setActiveIndex(i);
            break;
          }
        }
        return;
      case "Enter":
        e.preventDefault();
        if (visible[activeIndex]) commit(visible[activeIndex]);
        return;
      case " ":
        // Space types a space in the search box; only selects when there isn't one.
        if (enableSearch) return;
        e.preventDefault();
        if (visible[activeIndex]) commit(visible[activeIndex]);
        return;
    }

    // Typeahead — skipped when a search box already handles printable keys.
    if (!enableSearch && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      window.clearTimeout(typeahead.current.timer);
      typeahead.current.buffer += e.key.toLowerCase();
      typeahead.current.timer = window.setTimeout(() => {
        typeahead.current.buffer = "";
      }, 600);
      const match = visible.findIndex(
        (o) => !o.disabled && o.label.toLowerCase().startsWith(typeahead.current.buffer),
      );
      if (match >= 0) setActiveIndex(match);
    }
  };

  const focusRing =
    focused && !isOpen
      ? { boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 16%, transparent)`, borderColor: accent }
      : isOpen
        ? { borderColor: accent }
        : undefined;

  const panel = isOpen && position && (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: position.flipped ? 6 : -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: position.flipped ? 6 : -6, scale: 0.97 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width ?? (panelWidth === "trigger" ? undefined : panelWidth),
        minWidth: 160,
        maxHeight: `min(${MAX_PANEL_HEIGHT}px, calc(100vh - ${VIEWPORT_MARGIN * 2}px))`,
        maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
        ...panelStyle,
      }}
      className={`z-[200] flex flex-col ${isDark ? PANEL_CLASSNAME_DARK : PANEL_CLASSNAME}`}
    >
      {enableSearch && (
        <div
          className={`flex shrink-0 items-center gap-2 border-b px-3 py-2 ${
            isDark ? "border-white/10" : "border-[rgba(4,46,92,0.08)]"
          }`}
        >
          <Search size={14} className={isDark ? "text-white/40" : "text-[var(--text-muted)]"} />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search…"
            className={`w-full bg-transparent text-[13px] font-medium outline-none ${
              isDark
                ? "text-[#e8f0f7] placeholder:text-white/30"
                : "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            }`}
          />
        </div>
      )}

      <div
        role="listbox"
        id={listboxId}
        aria-label={label ?? rest["aria-label"]}
        className="min-h-0 flex-1 overflow-y-auto py-1"
      >
        {visible.length === 0 && (
          <p
            className={`px-3.5 py-3 text-[13px] ${isDark ? "text-white/40" : "text-[var(--text-muted)]"}`}
          >
            No matches
          </p>
        )}
        {visible.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = index === activeIndex;
          return (
            <div
              key={String(option.value)}
              id={`${fieldId}-option-${index}`}
              data-index={index}
              role="option"
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              onMouseEnter={() => !option.disabled && setActiveIndex(index)}
              onClick={() => commit(option)}
              className={`flex cursor-pointer items-center gap-2.5 ${SIZE_STYLES[size].optionPad} text-[13.5px] transition-colors ${
                option.disabled ? "cursor-not-allowed opacity-40" : ""
              }`}
              style={{
                fontWeight: isSelected ? 600 : 500,
                color: isSelected ? accent : isDark ? "#e8f0f7" : "var(--text-primary)",
                background: isActive
                  ? isDark
                    ? "rgba(255,255,255,0.07)"
                    : `color-mix(in srgb, ${accent} 8%, transparent)`
                  : "transparent",
              }}
            >
              {option.icon}
              <span className="min-w-0 flex-1">
                <span className="block truncate">{option.label}</span>
                {option.hint && (
                  <span
                    className={`block truncate text-[11.5px] font-normal ${
                      isDark ? "text-white/40" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {option.hint}
                  </span>
                )}
              </span>
              {isSelected && <Check size={14} style={{ color: accent }} className="shrink-0" />}
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div className={`relative ${className ?? ""}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className={`mb-1.5 block text-[12.5px] font-semibold ${
            isDark ? "text-white/60" : "text-[var(--text-mid)]"
          }`}
        >
          {label}
          {required && <span style={{ color: "var(--danger-2)" }}> *</span>}
        </label>
      )}

      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-haspopup="listbox"
        aria-activedescendant={
          isOpen && activeIndex >= 0 ? `${fieldId}-option-${activeIndex}` : undefined
        }
        aria-invalid={error ? true : undefined}
        aria-label={rest["aria-label"]}
        disabled={disabled}
        onClick={() => (isOpen ? close(false) : open())}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`flex w-full items-center justify-between gap-2 text-left outline-none transition-all duration-150 ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        } ${buttonClassName ?? ""}`}
        style={{
          ...withBorderLonghands({
            ...triggerStyles(variant, theme, size, Boolean(error)),
            ...buttonStyle,
          }),
          ...focusRing,
        }}
      >
        <span
          className="min-w-0 flex-1 truncate"
          style={
            selected
              ? undefined
              : { color: isDark ? "rgba(255,255,255,0.4)" : "var(--text-muted)", fontWeight: 400 }
          }
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform duration-200"
          style={{
            transform: isOpen ? "rotate(180deg)" : "none",
            color: isOpen ? accent : isDark ? "rgba(255,255,255,0.45)" : "var(--text-muted)",
          }}
        />
      </button>

      {/* Keeps `new FormData(form)` and uncontrolled-form call sites working
          even though the visible control is a button, not a <select>. */}
      {name && <input type="hidden" name={name} value={value === "" ? "" : String(value)} />}

      {error && (
        <p className="mt-1.5 text-[12px] font-medium" style={{ color: "var(--danger-2)" }}>
          {error}
        </p>
      )}

      {/* Portalled so the list escapes `overflow:hidden` ancestors (modals,
          scrolling tables). Only reachable after a user opens the control, so
          it never runs during SSR — no mounted-flag guard needed. */}
      {typeof document !== "undefined" &&
        createPortal(<AnimatePresence>{panel}</AnimatePresence>, document.body)}
    </div>
  );
}
