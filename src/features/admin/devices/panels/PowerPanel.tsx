import React from "react";
import type { PowerPanel as PowerPanelType } from "../reportTypes";
import { Reported } from "../Reported";
import { NestedFields } from "../MetricTree";

interface PowerPanelProps {
  panel: PowerPanelType;
}

export function PowerPanel({ panel }: PowerPanelProps) {
  if (panel.error) {
    return <p className="text-sm text-danger-ink">{panel.error}</p>;
  }

  const batteryConfig =
    panel.battery_configuration?.value &&
    typeof panel.battery_configuration.value === "object"
      ? (panel.battery_configuration.value as Record<string, unknown>)
      : null;

  const chargerConfig =
    panel.charger_configuration?.value &&
    typeof panel.charger_configuration.value === "object"
      ? (panel.charger_configuration.value as Record<string, unknown>)
      : null;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
            Battery level
          </dt>
          <dd className="mt-1 text-sm font-mono text-ink">
            <Reported reading={panel.battery_percent} mono />
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
            Battery voltage
          </dt>
          <dd className="mt-1 text-sm font-mono text-ink">
            <Reported reading={panel.battery_voltage_v} mono />
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
            Charger present
          </dt>
          <dd className="mt-1 text-sm text-ink">
            <Reported
              reading={panel.charger_present}
              format={(v) => (v ? "Connected" : "Disconnected")}
            />
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
            Power source
          </dt>
          <dd className="mt-1 text-sm text-ink">
            <Reported reading={panel.power_source} />
          </dd>
        </div>
      </dl>

      {/* Hardware Configurations */}
      {batteryConfig ? (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            Battery Hardware Configuration
          </h3>
          <div className="rounded-lg border border-border bg-paper p-3 text-xs">
            <NestedFields obj={batteryConfig} />
          </div>
        </div>
      ) : null}

      {chargerConfig ? (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            Charger Hardware Configuration
          </h3>
          <div className="rounded-lg border border-border bg-paper p-3 text-xs">
            <NestedFields obj={chargerConfig} />
          </div>
        </div>
      ) : null}

      {/* Source notes */}
      {panel.sources ? (
        <div className="mt-2 border-t border-border pt-2 text-[10px] text-muted-light space-y-0.5">
          {Object.entries(panel.sources).map(([chk, src]) =>
            src.detail ? (
              <p key={chk}>
                <span className="font-mono text-muted-light">{chk}:</span> {src.detail}
              </p>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
