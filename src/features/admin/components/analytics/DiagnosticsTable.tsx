"use client";

import { FileSearch } from "lucide-react";

import { formatCount, formatDuration } from "@/features/admin/analytics/aggregate";
import type {
  DiagnosticRow,
  MetricMeta,
  ReviewRules,
} from "@/features/admin/analytics/types";

import { Panel, PanelEmpty, PanelIcon } from "./Panel";

/**
 * PLC-06 (item misfit) as a ranked table.
 *
 * A diagnostic is a ranked list of entities, not a scalar with a trend, so this
 * deliberately does not reuse the scalar card component — nor `DataTable`,
 * which is hardcoded for the dark shell.
 *
 * The review flags are explicitly *not* proof of a defect: a low p-value
 * usually means mis-keyed or broken, a high one means the item discriminates
 * nothing, and a slow median means it's confusing. All three mean "a human
 * should look", nothing stronger. The thresholds come from the registry via
 * `/meta`, so tuning them is a reseed rather than a frontend deploy.
 */
type Flag = { label: string; tone: "danger" | "warn" | "none"; reason: string };

export function reviewFlag(row: DiagnosticRow, rules: ReviewRules | null): Flag | null {
  // No rules means we have no basis to judge this item. Showing "Normal" would
  // assert something the registry never told us, and silently falling back to
  // the old hardcoded numbers would be worse — they may be exactly what changed.
  if (!rules) return null;

  const p = row.value;
  const expectedSec = Number(row.payload?.expected_time_sec ?? NaN);
  const medianMs = row.secondary_value;

  if (p !== null && rules.p_floor !== undefined && p < rules.p_floor) {
    return {
      label: "Very Low",
      tone: "danger",
      reason: "Almost nobody gets this right — possibly mis-keyed or broken.",
    };
  }
  if (p !== null && rules.p_ceiling !== undefined && p > rules.p_ceiling) {
    return {
      label: "Very High",
      tone: "danger",
      reason: "Almost everybody gets this right — it discriminates nothing.",
    };
  }
  if (
    medianMs !== null &&
    rules.time_multiple !== undefined &&
    Number.isFinite(expectedSec) &&
    medianMs > expectedSec * 1000 * rules.time_multiple
  ) {
    return {
      label: "High",
      tone: "warn",
      reason: "Median response time is far above the authored expectation.",
    };
  }
  return { label: "Normal", tone: "none", reason: "Within the expected range." };
}

const TONE_STYLE: Record<Flag["tone"], { background: string; color: string }> = {
  danger: { background: "var(--ls-danger-soft)", color: "#A33832" },
  warn: { background: "var(--ls-amber-soft)", color: "#96651B" },
  none: { background: "var(--ls-emerald-soft)", color: "#0A6547" },
};

export function DiagnosticsTable({
  rows,
  meta,
}: {
  rows: DiagnosticRow[];
  meta: MetricMeta[];
}) {
  const sorted = [...rows].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const rules = meta.find((m) => m.metric_id === "PLC-06")?.review_rules ?? null;

  return (
    <Panel
      title="Question & Item Diagnostics"
      subtitle="Which questions or topics need attention?"
      icon={
        <PanelIcon tone="blue">
          <FileSearch size={15} aria-hidden />
        </PanelIcon>
      }
    >
      {sorted.length === 0 ? (
        <PanelEmpty>No item diagnostics for this range yet.</PanelEmpty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] border-collapse text-left">
            <thead>
              <tr style={{ color: "var(--ls-muted)" }}>
                {["Question", "Subject", "Strand", "Difficulty", "Med. time", "Students", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-b pb-2 pr-3 text-[11px] font-semibold"
                      style={{ borderColor: "var(--ls-border)" }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const flag = reviewFlag(row, rules);
                const needsReview = flag !== null && flag.tone !== "none";
                return (
                  <tr key={`${row.entity_key}-${row.bucket_date}`} data-item={row.entity_key}>
                    <Cell mono>{String(row.payload?.item_code ?? row.entity_key)}</Cell>
                    <Cell>{String(row.dims?.subject ?? "—")}</Cell>
                    <Cell>{String(row.payload?.strand ?? "—")}</Cell>
                    <Cell>
                      {flag ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={TONE_STYLE[flag.tone]}
                          title={flag.reason}
                        >
                          {flag.label}
                        </span>
                      ) : (
                        <span
                          style={{ color: "var(--ls-faint)" }}
                          title="No review thresholds published for PLC-06 in /meta."
                        >
                          —
                        </span>
                      )}
                    </Cell>
                    <Cell>
                      {row.secondary_value !== null
                        ? formatDuration(row.secondary_value / 1000)
                        : "—"}
                    </Cell>
                    <Cell>{formatCount(row.sample_size)}</Cell>
                    <Cell>
                      {needsReview ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ background: "var(--ls-danger-soft)", color: "#A33832" }}
                        >
                          Review
                        </span>
                      ) : (
                        <span style={{ color: "var(--ls-faint)" }}>—</span>
                      )}
                    </Cell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Cell({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td
      className={`border-b py-2.5 pr-3 text-[12px] ${mono ? "font-mono" : ""}`}
      style={{ borderColor: "var(--ls-border)", color: "var(--ls-ink)" }}
    >
      {children}
    </td>
  );
}
