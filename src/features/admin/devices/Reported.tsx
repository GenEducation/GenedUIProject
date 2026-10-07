import React from "react";
import type { Reading } from "./reportTypes";
import { READING_STYLES } from "./canonicalBadges";

interface ReportedProps<T = unknown> {
  reading?: Reading<T> | null;
  format?: (value: T) => React.ReactNode;
  mono?: boolean;
  className?: string;
}

/**
 * The single, authoritative place where a Reading renders.
 *
 * Enforces the 6-state contract:
 * - OK: the formatted value + unit
 * - NOT_REPORTED: grey/italic "not reported by this firmware" (NEVER amber)
 * - NOT_IN_METRICS: muted "—"
 * - UNKNOWN: amber note or "unknown" (NEVER green)
 * - SKIPPED: muted "not applicable on this hardware"
 * - PARTIAL: value + "needs root" badge
 */
export function Reported<T = unknown>({
  reading,
  format,
  mono = false,
  className = "",
}: ReportedProps<T>) {
  if (!reading) {
    return <span className={`text-white/40 ${className}`}>—</span>;
  }

  const { state, value, unit, note } = reading;

  switch (state) {
    case "OK": {
      const rendered = format
        ? format(value as T)
        : value !== null && value !== undefined
          ? String(value)
          : "—";
      return (
        <span className={`${READING_STYLES.OK.text} ${mono ? "font-mono" : ""} ${className}`}>
          {rendered}
          {unit ? ` ${unit}` : ""}
        </span>
      );
    }

    case "NOT_REPORTED":
      return (
        <span
          className={`${READING_STYLES.NOT_REPORTED.text} ${className}`}
          title={note || "This check was not present in this firmware"}
        >
          not reported by this firmware
        </span>
      );

    case "NOT_IN_METRICS":
      return <span className={`${READING_STYLES.NOT_IN_METRICS.text} ${className}`}>—</span>;

    case "UNKNOWN":
      return (
        <span
          className={`${READING_STYLES.UNKNOWN.text} font-medium ${className}`}
          title={note || undefined}
        >
          {note || "unknown"}
        </span>
      );

    case "SKIPPED":
      return (
        <span
          className={`${READING_STYLES.SKIPPED.text} ${className}`}
          title={note || "Not applicable on this hardware"}
        >
          not applicable on this hardware
        </span>
      );

    case "PARTIAL": {
      const rendered = format
        ? format(value as T)
        : value !== null && value !== undefined
          ? String(value)
          : "—";
      return (
        <span className={`${READING_STYLES.PARTIAL.text} ${mono ? "font-mono" : ""} ${className}`}>
          {rendered}
          {unit ? ` ${unit}` : ""}
          <span
            className="ml-1.5 inline-block rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-normal text-white/50"
            title={note || "needs root"}
          >
            needs root
          </span>
        </span>
      );
    }

    default:
      return <span className={`text-white/40 ${className}`}>—</span>;
  }
}
