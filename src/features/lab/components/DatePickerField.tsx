"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerFieldProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  buttonClassName?: string;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(iso: string): string {
  return parseIso(iso).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Custom calendar dropdown styled to match the app's card language
 * (white rounded panel, border-border, emerald accents, serif month header) —
 * replaces the native <input type="date"> whose popover can't be themed.
 */
const PANEL_WIDTH = 288; // w-72
const PANEL_HEIGHT_ESTIMATE = 400; // header + weekday row + up to 6 week rows + "Today" button
const VIEWPORT_MARGIN = 12;

export function DatePickerField({ value, onChange, className, buttonClassName }: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = parseIso(value);
  const [viewMonth, setViewMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Position the panel relative to the viewport (not the trigger) and clamp it
  // within screen bounds — anchoring to the trigger with right-0/left-0 alone
  // pushes it off-screen on narrow viewports, and anchoring only below the
  // trigger overflows the bottom edge when the trigger sits low on screen
  // (e.g. inside a modal), so flip above the trigger when there's more room there.
  useEffect(() => {
    if (!isOpen) return;

    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left = Math.min(
        Math.max(rect.left, VIEWPORT_MARGIN),
        window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN,
      );
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const top =
        spaceBelow >= PANEL_HEIGHT_ESTIMATE || spaceBelow >= spaceAbove
          ? rect.bottom + 8
          : rect.top - 8 - PANEL_HEIGHT_ESTIMATE;
      setPanelPos({
        top: Math.min(Math.max(top, VIEWPORT_MARGIN), window.innerHeight - VIEWPORT_MARGIN - PANEL_HEIGHT_ESTIMATE),
        left,
      });
    };

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [isOpen]);

  const today = toIso(new Date());

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const goToMonth = (delta: number) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));
  };

  const pick = (day: number) => {
    const picked = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    onChange(toIso(picked));
    setIsOpen(false);
  };

  const panel = isOpen && panelPos && (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      style={{
        position: "fixed",
        top: panelPos.top,
        left: panelPos.left,
        width: PANEL_WIDTH,
        maxHeight: `calc(100vh - ${VIEWPORT_MARGIN * 2}px)`,
      }}
      className="z-[110] overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <ChevronLeft size={15} />
        </button>
        <p className="font-serif text-[15px] font-semibold text-ink">{monthLabel}</p>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="flex h-7 items-center justify-center text-[10.5px] font-bold uppercase tracking-wide text-muted-light"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const iso = toIso(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
          const isSelected = iso === value;
          const isToday = iso === today;
          return (
            <button
              type="button"
              key={iso}
              onClick={() => pick(day)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-semibold transition-colors ${
                isSelected
                  ? "bg-emerald text-white shadow-[0_4px_12px_rgba(5,159,109,.35)]"
                  : isToday
                    ? "bg-emerald-50 text-emerald"
                    : "text-ink hover:bg-ink/5"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          onChange(today);
          setIsOpen(false);
        }}
        className="mt-3 w-full rounded-lg border border-border py-1.5 text-[11.5px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-emerald hover:text-emerald"
      >
        Today
      </button>
    </motion.div>
  );

  return (
    <div className={`relative ${className ?? ""}`} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm font-semibold text-ink outline-none transition-colors hover:border-emerald focus:border-emerald ${buttonClassName ?? ""}`}
      >
        <CalendarDays size={16} className="text-emerald" />
        {formatDisplay(value)}
      </button>

      {mounted && createPortal(<AnimatePresence>{panel}</AnimatePresence>, document.body)}
    </div>
  );
}
