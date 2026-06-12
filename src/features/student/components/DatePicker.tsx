"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  min?: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DatePicker({ value, min, onChange }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = value ? parseDate(value) : null;
  const minDate = min ? parseDate(min) : null;
  const [viewDate, setViewDate] = useState(() => selected ?? minDate ?? new Date());

  useEffect(() => {
    if (selected) setViewDate(selected);
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; inCurrentMonth: boolean }[] = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inCurrentMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inCurrentMonth: false });
  }

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isDisabled = (d: Date) => !!minDate && d < minDate && !isSameDay(d, minDate);

  const goToMonth = (offset: number) => {
    setViewDate(new Date(year, month + offset, 1));
  };

  const handleSelect = (d: Date) => {
    if (isDisabled(d)) return;
    onChange(toDateString(d));
    setIsOpen(false);
  };

  const formattedValue = selected
    ? selected.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "Select a date";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 bg-[#F4F3EE]/50 border border-[#042E5C]/5 rounded-2xl py-3.5 px-4 text-sm font-medium text-left focus:outline-none focus:ring-2 focus:ring-[#042E5C]/10 hover:bg-white transition-all"
      >
        <span className={selected ? "text-[#042E5C]" : "text-[#042E5C]/40"}>{formattedValue}</span>
        <Calendar size={16} className="text-[#042E5C]/40 shrink-0" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 mt-2 right-0 w-[min(90vw,300px)] bg-white rounded-[28px] border border-[#042E5C]/5 shadow-2xl shadow-[#042E5C]/10 p-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-black text-[#042E5C] tracking-tight">
                {MONTHS[month]} {year}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToMonth(-1)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#042E5C]/50 hover:bg-[#042E5C]/5 hover:text-[#042E5C] transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => goToMonth(1)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#042E5C]/50 hover:bg-[#042E5C]/5 hover:text-[#042E5C] transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="h-8 flex items-center justify-center text-[10px] font-black text-[#042E5C]/30 uppercase tracking-widest">
                  {w}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map(({ date, inCurrentMonth }, idx) => {
                const disabled = isDisabled(date);
                const isSelected = selected && isSameDay(date, selected);
                const isToday = isSameDay(date, new Date());

                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => handleSelect(date)}
                    disabled={disabled}
                    className={`h-9 w-9 mx-auto flex items-center justify-center rounded-full text-xs font-bold transition-all
                      ${isSelected ? "bg-[#042E5C] text-white shadow-lg shadow-[#042E5C]/20" : ""}
                      ${!isSelected && !disabled && inCurrentMonth ? "text-[#042E5C] hover:bg-[#042E5C]/8" : ""}
                      ${!isSelected && !inCurrentMonth ? "text-[#042E5C]/15" : ""}
                      ${disabled ? "text-[#042E5C]/15 cursor-not-allowed" : "cursor-pointer"}
                      ${isToday && !isSelected ? "ring-1 ring-inset ring-[#042E5C]/20" : ""}
                    `}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
