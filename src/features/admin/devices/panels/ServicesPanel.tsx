import React from "react";
import type { ServicesPanel as ServicesPanelType } from "../reportTypes";
import type { HealthComponentReport } from "../types";
import { Reported } from "../Reported";
import { ComponentRow } from "../ComponentRow";

interface ServicesPanelProps {
  panel: ServicesPanelType;
}

export function ServicesPanel({ panel }: ServicesPanelProps) {
  if (panel.error) {
    return <p className="text-sm text-rose-300">{panel.error}</p>;
  }

  const units = Array.isArray(panel.units?.value)
    ? (panel.units.value as Record<string, unknown>[])
    : [];

  const restarts = Array.isArray(panel.units_with_restarts?.value)
    ? (panel.units_with_restarts.value as string[])
    : [];

  const appServing =
    panel.app_serving?.value && typeof panel.app_serving.value === "object"
      ? (panel.app_serving.value as Record<string, unknown>)
      : null;

  const appComponents =
    panel.app_report_components?.value &&
    typeof panel.app_report_components.value === "object"
      ? (panel.app_report_components.value as Record<string, HealthComponentReport>)
      : null;

  return (
    <div className="space-y-4">
      {/* App Serving Overview */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-white/35">
            App HTTP Status
          </dt>
          <dd className="mt-1 text-sm font-mono text-white/80">
            {appServing?.http_status !== undefined && appServing?.http_status !== null
              ? String(appServing.http_status)
              : "—"}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-white/35">
            App PID
          </dt>
          <dd className="mt-1 text-sm font-mono text-white/80">
            {appServing?.pid !== undefined && appServing?.pid !== null
              ? String(appServing.pid)
              : "—"}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-white/35">
            Journal Persistent
          </dt>
          <dd className="mt-1 text-sm text-white/80">
            <Reported
              reading={panel.journal_persistent}
              format={(v) => (v ? "Persistent (/var/log/journal)" : "Volatile / None")}
            />
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-white/35">
            Restarts Sweep
          </dt>
          <dd className="mt-1 text-sm text-white/80">
            {restarts.length === 0 ? "0 units restarted" : `${restarts.length} units restarted`}
          </dd>
        </div>
      </dl>

      {/* Restart warnings */}
      {restarts.length > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
          <strong>Restarts detected:</strong> {restarts.join(", ")}
        </div>
      ) : null}

      {/* App Health Report Components */}
      {appComponents && Object.keys(appComponents).length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            App Health Components (Live)
          </h3>
          <div className="space-y-2">
            {Object.entries(appComponents).map(([name, report]) => (
              <ComponentRow key={name} name={name} report={report} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Systemd Units */}
      {units.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            Systemd Service Units
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[11px] text-white/40 uppercase">
                  <th className="py-2 pr-3">Unit</th>
                  <th className="py-2 px-3">Active State</th>
                  <th className="py-2 px-3">Sub State</th>
                  <th className="py-2 pl-3">Restarts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {units.map((u, idx) => (
                  <tr key={String(u.name ?? idx)}>
                    <td className="py-2 pr-3 text-white font-medium">{String(u.name ?? "—")}</td>
                    <td className="py-2 px-3 text-white/70">{String(u.active_state ?? "—")}</td>
                    <td className="py-2 px-3 text-white/70">{String(u.sub_state ?? "—")}</td>
                    <td className="py-2 pl-3 text-white/80">
                      {u.restart_count !== undefined && u.restart_count !== null
                        ? String(u.restart_count)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Source notes */}
      {panel.sources ? (
        <div className="mt-2 border-t border-white/5 pt-2 text-[10px] text-white/35 space-y-0.5">
          {Object.entries(panel.sources).map(([chk, src]) =>
            src.detail ? (
              <p key={chk}>
                <span className="font-mono text-white/25">{chk}:</span> {src.detail}
              </p>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
