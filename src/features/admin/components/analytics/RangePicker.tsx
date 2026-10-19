"use client";

import { Calendar } from "lucide-react";

/**
 * Range presets rather than a calendar.
 *
 * The API takes `range=<N>d` only — there is no from/to on the funnel or panel
 * endpoints — so an arbitrary date-range picker would be offering a precision
 * the backend can't honour. The shared `DatePicker` is single-date anyway.
 */
export const RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "28d", label: "Last 28 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

export type RangeValue = (typeof RANGES)[number]["value"];

export function RangePicker({
  value,
  onChange,
}: {
  value: RangeValue;
  onChange: (next: RangeValue) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl border p-1"
      style={{ borderColor: "var(--ls-border-strong)", background: "var(--ls-card)" }}
      role="group"
      aria-label="Date range"
    >
      <Calendar size={14} className="ml-2 mr-0.5" style={{ color: "var(--ls-muted)" }} aria-hidden />
      {RANGES.map((range) => {
        const active = range.value === value;
        return (
          <button
            key={range.value}
            type="button"
            onClick={() => onChange(range.value)}
            aria-pressed={active}
            className="rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors"
            style={
              active
                ? { background: "var(--ls-emerald-soft)", color: "var(--ls-emerald)" }
                : { color: "var(--ls-muted)" }
            }
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
