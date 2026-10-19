"use client";

import { useState } from "react";
import { ShieldCheck, ChevronRight } from "lucide-react";

import { formatAsOf } from "@/features/admin/analytics/aggregate";
import type { MetricMeta, MetricRow } from "@/features/admin/analytics/types";

/**
 * "Can I trust what's above this line?"
 *
 * Counts the metrics feeding this page by trust state. This is the panel that
 * makes the rest of the dashboard honest: a not-instrumented metric shows up
 * here as unavailable rather than silently rendering as a zero somewhere above.
 */
export function InstrumentationHealth({
  meta,
  rows,
  lastUpdatedAt,
}: {
  meta: MetricMeta[];
  rows: MetricRow[];
  lastUpdatedAt: Date | null;
}) {
  const [open, setOpen] = useState(false);

  // RETIRED metrics are not a health signal — they intentionally have no data
  // and no panel, so counting them as "unavailable" would be permanent noise.
  const live = meta.filter((m) => m.status !== "RETIRED" && m.grain !== "diagnostic");
  const parked = live.filter((m) => m.status === "NOT_INSTRUMENTED");

  const byMetric = new Map<string, MetricRow[]>();
  for (const row of rows) {
    const list = byMetric.get(row.metric_id);
    if (list) list.push(row);
    else byMetric.set(row.metric_id, [row]);
  }

  const active = live.filter((m) => m.status === "ACTIVE");
  const stale = active.filter((m) => byMetric.get(m.metric_id)?.some((r) => r.stale));
  const lowConfidence = active.filter((m) =>
    byMetric.get(m.metric_id)?.some((r) => r.low_confidence),
  );
  const healthy = active.filter(
    (m) => !stale.includes(m) && !lowConfidence.includes(m) && byMetric.has(m.metric_id),
  );

  return (
    <section className="ls-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "var(--ls-teal-soft)", color: "var(--ls-teal)" }}
          >
            <ShieldCheck size={15} aria-hidden />
          </span>
          <div>
            <h2 className="text-[15px] font-bold tracking-tight" style={{ color: "var(--ls-ink)" }}>
              Data &amp; Instrumentation Health
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: "var(--ls-muted)" }}>
              Are our metrics reliable?
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
          <Stat
            dot="var(--ls-emerald)"
            label={
              healthy.length === active.length && active.length > 0
                ? "All core metrics healthy"
                : `${healthy.length} metrics healthy`
            }
            sub={lastUpdatedAt ? `Last updated: ${formatAsOf(lastUpdatedAt.toISOString())}` : undefined}
          />
          <Stat
            dot="var(--ls-amber)"
            label={`${stale.length} ${stale.length === 1 ? "metric" : "metrics"} stale`}
            sub="values are real but not fresh"
          />
          <Stat
            dot="var(--ls-blue)"
            label={`${parked.length} ${parked.length === 1 ? "metric" : "metrics"} unavailable`}
            sub="defined, not yet collected"
          />
          <Stat
            dot="var(--ls-faint)"
            label={`${lowConfidence.length} low confidence`}
            sub="shown, but thin samples"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors"
          style={{ borderColor: "var(--ls-border-strong)", color: "var(--ls-ink)" }}
        >
          {open ? "Hide details" : "View details"}
          <ChevronRight
            size={14}
            style={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform .15s" }}
            aria-hidden
          />
        </button>
      </div>

      {open ? (
        <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--ls-border)" }}>
          {parked.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--ls-muted)" }}>
              Every metric on this dashboard is instrumented.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {parked.map((m) => (
                <li key={m.metric_id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono text-[12px] font-semibold" style={{ color: "var(--ls-ink)" }}>
                    {m.metric_id}
                  </span>
                  <span className="text-[12px]" style={{ color: "var(--ls-ink)" }}>
                    {m.name}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--ls-faint)" }}>
                    — {m.blocked_by ?? "no blocker recorded"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

function Stat({ dot, label, sub }: { dot: string; label: string; sub?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: "var(--ls-ink)" }}>
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        {label}
      </div>
      {sub ? (
        <div className="ml-4 text-[10px]" style={{ color: "var(--ls-faint)" }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}
