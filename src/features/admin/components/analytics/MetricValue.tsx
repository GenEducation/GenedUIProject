"use client";

import { AlertTriangle, EyeOff, Clock, Unplug } from "lucide-react";

import { formatAsOf } from "@/features/admin/analytics/aggregate";
import {
  explainMissing,
  hasValue,
  missingDetail,
  type ValueState,
} from "@/features/admin/analytics/valueState";

/**
 * Renders one metric value in a way that never lies about what it is.
 *
 * A suppressed, parked or never-collected metric is rendered as prose, not as
 * `0` or `—`: a permanently-zero figure on a health panel reads as an outage,
 * and an undifferentiated dash gives an admin no way to tell "too few students
 * to say" from "we don't collect this yet". Numbers that are real but shaky
 * (low confidence) or real but old (stale) are shown, visibly qualified.
 */
export function MetricValue({
  state,
  format,
  size = "md",
  className = "",
}: {
  state: ValueState;
  /** Turns the raw number into its display string (percent, count, duration). */
  format: (value: number) => string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const numberClass =
    size === "lg"
      ? "text-[30px] leading-none font-bold tracking-tight"
      : size === "sm"
        ? "text-sm font-semibold"
        : "text-xl font-bold tracking-tight";

  if (!hasValue(state)) {
    const label = explainMissing(state);
    const detail = missingDetail(state);
    const Icon =
      state.kind === "suppressed" ? EyeOff : state.kind === "not_instrumented" ? Unplug : Clock;

    return (
      <div className={`flex flex-col gap-0.5 ${className}`} title={detail ?? undefined}>
        <span
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
          style={{ color: "var(--ls-faint)" }}
          data-metric-state={state.kind}
        >
          <Icon size={13} aria-hidden />
          {label}
        </span>
        {detail ? (
          <span className="text-[11px] leading-snug" style={{ color: "var(--ls-faint)" }}>
            {detail}
          </span>
        ) : null}
      </div>
    );
  }

  const muted = state.kind === "stale";

  return (
    <div className={`flex flex-col gap-1 ${className}`} data-metric-state={state.kind}>
      <span
        className={numberClass}
        style={{ color: muted ? "var(--ls-muted)" : "var(--ls-ink)" }}
      >
        {format(state.value)}
      </span>

      {state.kind === "low_confidence" ? (
        <span
          className="inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ background: "var(--ls-amber-soft)", color: "#96651B" }}
          title={
            state.sampleSize
              ? `Only ${state.sampleSize} students in this sample — directional, not decisive.`
              : "Sample is below the confidence threshold for this metric."
          }
        >
          <AlertTriangle size={10} aria-hidden />
          Low confidence
        </span>
      ) : null}

      {state.kind === "stale" ? (
        <span
          className="inline-flex w-fit items-center gap-1 text-[10px] font-medium"
          style={{ color: "var(--ls-faint)" }}
        >
          <Clock size={10} aria-hidden />
          as of {formatAsOf(state.asOf)}
        </span>
      ) : null}
    </div>
  );
}
