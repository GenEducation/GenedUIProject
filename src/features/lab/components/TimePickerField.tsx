"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";

interface TimePickerFieldProps {
  value: string; // HH:MM, 24-hour
  onChange: (value: string) => void;
  className?: string;
  buttonClassName?: string;
}

const PANEL_WIDTH = 200;
const VIEWPORT_MARGIN = 12;

function parseValue(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function toValue(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function to12Hour(totalMinutes: number): { hour12: number; minute: number; period: "AM" | "PM" } {
  const h24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const period: "AM" | "PM" = h24 < 12 ? "AM" : "PM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, minute, period };
}

function from12Hour(hour12: number, minute: number, period: "AM" | "PM"): number {
  const h24 = period === "AM" ? (hour12 === 12 ? 0 : hour12) : hour12 === 12 ? 12 : hour12 + 12;
  return h24 * 60 + minute;
}

function formatMinutes(totalMinutes: number): string {
  const { hour12, minute, period } = to12Hour(totalMinutes);
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

/**
 * Custom time picker: an exact hour/minute/AM-PM entry, free-typed rather
 * than restricted to preset steps, so any minute can be scheduled.
 * Rendered via portal to document.body so its fixed positioning is always
 * viewport-relative, even inside an animated/transformed modal (a CSS
 * `transform` on an ancestor otherwise becomes the containing block for
 * `position: fixed` descendants, breaking viewport-relative math).
 */
export function TimePickerField({ value, onChange, className, buttonClassName }: TimePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const selectedMinutes = parseValue(value);
  const { hour12, minute, period } = to12Hour(selectedMinutes);
  const [hourInput, setHourInput] = useState(String(hour12));
  const [minuteInput, setMinuteInput] = useState(String(minute).padStart(2, "0"));

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setHourInput(String(hour12));
    setMinuteInput(String(minute).padStart(2, "0"));
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

  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left = Math.min(
        Math.max(rect.left, VIEWPORT_MARGIN),
        window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN,
      );
      setPanelPos({ top: rect.bottom + 8, left });
    };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [isOpen]);

  const commitHour = (raw: string) => {
    const n = Number(raw);
    const clamped = Number.isFinite(n) && n >= 1 && n <= 12 ? n : hour12;
    setHourInput(String(clamped));
    onChange(toValue(from12Hour(clamped, minute, period)));
  };

  const commitMinute = (raw: string) => {
    const n = Number(raw);
    const clamped = Number.isFinite(n) && n >= 0 && n <= 59 ? n : minute;
    setMinuteInput(String(clamped).padStart(2, "0"));
    onChange(toValue(from12Hour(hour12, clamped, period)));
  };

  const setPeriod = (p: "AM" | "PM") => onChange(toValue(from12Hour(hour12, minute, p)));

  const panel = isOpen && panelPos && (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      style={{ position: "fixed", top: panelPos.top, left: panelPos.left, width: PANEL_WIDTH }}
      className="z-[110] rounded-2xl border border-border bg-white p-3 shadow-xl"
    >
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          value={hourInput}
          onChange={(e) => setHourInput(e.target.value.replace(/\D/g, "").slice(0, 2))}
          onBlur={(e) => commitHour(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commitHour(hourInput)}
          className="w-11 rounded-lg border border-border px-1 py-1.5 text-center text-sm font-bold text-ink outline-none focus:border-emerald"
        />
        <span className="font-bold text-muted">:</span>
        <input
          type="text"
          inputMode="numeric"
          value={minuteInput}
          onChange={(e) => setMinuteInput(e.target.value.replace(/\D/g, "").slice(0, 2))}
          onBlur={(e) => commitMinute(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commitMinute(minuteInput)}
          className="w-11 rounded-lg border border-border px-1 py-1.5 text-center text-sm font-bold text-ink outline-none focus:border-emerald"
        />
        <div className="ml-auto flex gap-1">
          {(["AM", "PM"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition-colors ${
                p === period ? "bg-emerald text-white" : "bg-ink/5 text-muted hover:text-ink"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="mt-2.5 w-full rounded-lg border border-border py-1.5 text-[11.5px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-emerald hover:text-emerald"
      >
        Done
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
        <Clock size={16} className="text-emerald" />
        {formatMinutes(selectedMinutes)}
      </button>

      {mounted && createPortal(<AnimatePresence>{panel}</AnimatePresence>, document.body)}
    </div>
  );
}
