import React from "react";
import type { HealthComponentReport } from "./types";
import { MetricRow, NestedMetric } from "./MetricTree";

/**
 * Renders one health/self-test component.
 * Used for both Lab self-test components and ServicesPanel's app_report.components.
 */
export function ComponentRow({
  name,
  report,
}: {
  name: string;
  report: HealthComponentReport;
}) {
  const status = typeof report?.status === "string" ? report.status : "unknown";
  const failed = status !== "ok" && status !== "pass" && status !== "passed";
  const metrics =
    report?.metrics && typeof report.metrics === "object"
      ? (report.metrics as Record<string, unknown>)
      : null;
  const extras = Object.entries(report ?? {}).filter(
    ([k]) => !["status", "detail", "metrics"].includes(k),
  );
  const allEntries = [...(metrics ? Object.entries(metrics) : []), ...extras];
  const scalarEntries = allEntries.filter(([, v]) => typeof v !== "object" || v === null);
  const objectEntries = allEntries.filter(([, v]) => typeof v === "object" && v !== null);

  return (
    <div
      className={`rounded-lg border p-3 ${
        failed ? "border-rose-500/30 bg-rose-500/[0.07]" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">{name}</span>
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] ${
            failed ? "bg-rose-500/15 text-rose-300" : "bg-[#059F6D]/15 text-[#059F6D]"
          }`}
        >
          {status}
        </span>
      </div>
      {report?.detail ? <p className="mt-1.5 text-xs text-white/50">{report.detail}</p> : null}
      {scalarEntries.length > 0 ? (
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          {scalarEntries.map(([k, v]) => (
            <MetricRow key={k} k={k} v={v} />
          ))}
        </dl>
      ) : null}
      {objectEntries.length > 0 ? (
        <dl className="mt-2 space-y-2.5">
          {objectEntries.map(([k, v]) => (
            <NestedMetric key={k} k={k} v={v as Record<string, unknown>} />
          ))}
        </dl>
      ) : null}
    </div>
  );
}
