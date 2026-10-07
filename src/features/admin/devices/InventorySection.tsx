import React from "react";
import type { Inventory, InventoryCheck, SubsystemGroup } from "./reportTypes";
import type { DiagnosticStatus } from "./types";
import { DIAG_STYLES, DiagnosticBadge } from "./canonicalBadges";
import { NestedFields } from "./MetricTree";

interface InventorySectionProps {
  inventory: Inventory;
}

function CheckCard({ check, metricsIncluded }: { check: InventoryCheck; metricsIncluded: boolean }) {
  const status = (check.status ?? "UNKNOWN") as DiagnosticStatus;
  const isFail = status === "FAIL";
  const isWarn = status === "WARN";

  return (
    <div
      className={`rounded-lg border p-3 ${
        isFail
          ? "border-rose-500/30 bg-rose-500/[0.07]"
          : isWarn
            ? "border-amber-500/30 bg-amber-500/[0.05]"
            : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-medium text-white">{check.title || check.id}</span>
          <span className="ml-2 font-mono text-[11px] text-white/35">{check.id}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {check.permission_limited ? (
            <span
              className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50"
              title="Ran without root privileges"
            >
              needs root
            </span>
          ) : null}
          <DiagnosticBadge status={status} />
        </div>
      </div>

      {check.detail ? <p className="mt-1.5 text-xs text-white/70">{check.detail}</p> : null}

      {check.error ? <p className="mt-1 text-xs text-rose-300 font-mono">{check.error}</p> : null}

      {check.next_step ? (
        <p className="mt-2 text-xs text-white/40">
          <span className="text-white/30">Next step: </span>
          {check.next_step}
        </p>
      ) : null}

      {!metricsIncluded && (
        <p className="mt-2 text-[11px] italic text-white/30">
          Subsystem metrics withheld from report for security.
        </p>
      )}

      {metricsIncluded && check.metrics && Object.keys(check.metrics).length > 0 ? (
        <details className="mt-2.5 group">
          <summary className="cursor-pointer list-none text-[11px] font-medium text-white/35 hover:text-white/60">
            Metrics ({Object.keys(check.metrics).length} keys) ▶
          </summary>
          <div className="mt-2 rounded border border-white/5 bg-black/20 p-2.5">
            <NestedFields obj={check.metrics} />
          </div>
        </details>
      ) : null}
    </div>
  );
}

function SubsystemGroupView({ group }: { group: SubsystemGroup }) {
  const worst = (group.worst_status ?? "PASS") as DiagnosticStatus;

  return (
    <details className="group rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-white">
            {group.subsystem}
          </span>
          <span className="text-xs text-white/40">({group.checks.length} checks)</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Tally chips */}
          <div className="flex gap-1">
            {Object.entries(group.tally).map(([st, count]) => {
              const diagStyle = DIAG_STYLES[st as DiagnosticStatus] ?? "bg-white/10 text-white/50";
              return (
                <span
                  key={st}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${diagStyle}`}
                >
                  {count} {st}
                </span>
              );
            })}
          </div>
          <DiagnosticBadge status={worst} />
        </div>
      </summary>

      <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
        {group.checks.map((chk) => (
          <CheckCard key={chk.id} check={chk} metricsIncluded={group.metrics_included} />
        ))}
      </div>
    </details>
  );
}

export function InventorySection({ inventory }: InventorySectionProps) {
  if (!inventory) {
    return <p className="text-sm text-white/40">No check inventory available.</p>;
  }

  const subsystems = inventory.subsystems || [];
  const otherChecks = inventory.other || [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">
        Every check declared and executed by gened-health on the device, grouped by subsystem.
      </p>

      {subsystems.map((group) => (
        <SubsystemGroupView key={group.subsystem} group={group} />
      ))}

      {otherChecks.length > 0 ? (
        <details className="group rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
            <span className="text-xs font-semibold uppercase tracking-wider text-white">
              Other Subsystems ({otherChecks.length} checks)
            </span>
          </summary>
          <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
            {otherChecks.map((chk) => (
              <CheckCard key={chk.id} check={chk} metricsIncluded={true} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
