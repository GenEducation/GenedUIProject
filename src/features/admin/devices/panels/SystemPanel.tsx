import React from "react";
import type { SystemPanel as SystemPanelType } from "../reportTypes";
import { Reported } from "../Reported";
import { Field } from "../Field";
import { NestedFields } from "../MetricTree";

interface SystemPanelProps {
  panel: SystemPanelType;
}

export function SystemPanel({ panel }: SystemPanelProps) {
  if (panel.error) {
    return <p className="text-sm text-rose-300">{panel.error}</p>;
  }

  const load1 = panel.load_1m?.value !== null && panel.load_1m?.value !== undefined ? Number(panel.load_1m.value).toFixed(2) : "—";
  const load5 = panel.load_5m?.value !== null && panel.load_5m?.value !== undefined ? Number(panel.load_5m.value).toFixed(2) : "—";
  const load15 = panel.load_15m?.value !== null && panel.load_15m?.value !== undefined ? Number(panel.load_15m.value).toFixed(2) : "—";
  const loadSummary = `${load1}, ${load5}, ${load15}`;

  const throttlingObj =
    panel.throttling?.value && typeof panel.throttling.value === "object"
      ? (panel.throttling.value as Record<string, unknown>)
      : null;

  const memoryObj =
    panel.memory?.value && typeof panel.memory.value === "object"
      ? (panel.memory.value as Record<string, unknown>)
      : null;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-white/35">
            Uptime
          </dt>
          <dd className="mt-1 text-sm text-white/80">
            <Reported reading={panel.uptime_human} />
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-white/35">
            SoC Temperature
          </dt>
          <dd className="mt-1 text-sm font-mono text-white/80">
            <Reported reading={panel.soc_temperature_c} mono />
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-white/35">
            Load average (1, 5, 15m)
          </dt>
          <dd className="mt-1 text-sm font-mono text-white/80">
            {loadSummary}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-white/35">
            Clock sync
          </dt>
          <dd className="mt-1 text-sm text-white/80">
            <Reported
              reading={panel.clock_synchronized}
              format={(v) => (v ? "NTP Synchronized" : "Unsynchronized")}
            />
          </dd>
        </div>
      </dl>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Field label="Model" value={panel.model?.value ? String(panel.model.value) : "—"} />
        <Field label="OS" value={panel.os?.value ? String(panel.os.value) : "—"} />
        <Field label="Kernel" value={panel.kernel?.value ? String(panel.kernel.value) : "—"} mono />
        <Field label="Timezone" value={panel.timezone?.value ? String(panel.timezone.value) : "—"} />
      </dl>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Field label="Boot ID" value={panel.boot_id?.value ? String(panel.boot_id.value) : "—"} mono />
        <Field
          label="WiFi Regdomain (cmdline)"
          value={panel.wifi_regdomain_declared?.value ? String(panel.wifi_regdomain_declared.value) : "—"}
          mono
        />
        <Field
          label="Kernel Tainted"
          value={panel.kernel_tainted?.value ? String(panel.kernel_tainted.value) : "None"}
          mono
        />
      </dl>

      {/* Memory Pressure / PSI */}
      {memoryObj ? (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/40">
            Memory & Pressure
          </h3>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs">
            <NestedFields obj={memoryObj} />
          </div>
        </div>
      ) : null}

      {/* Throttling Latched */}
      {throttlingObj ? (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/40">
            Power & Thermal Throttling
          </h3>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs">
            <NestedFields obj={throttlingObj} />
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
