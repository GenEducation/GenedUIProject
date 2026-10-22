import React from "react";
import type { NetworkPanel as NetworkPanelType } from "../reportTypes";
import { Reported } from "../Reported";
import { Field } from "../Field";

interface NetworkPanelProps {
  panel: NetworkPanelType;
}

export function NetworkPanel({ panel }: NetworkPanelProps) {
  if (panel.error) {
    return <p className="text-sm text-danger-ink">{panel.error}</p>;
  }

  const wifiInterfaces: Record<string, unknown>[] = Array.isArray(panel.wifi?.value)
    ? (panel.wifi.value as Record<string, unknown>[])
    : typeof panel.wifi?.value === "object" && panel.wifi?.value !== null
    ? Object.entries(panel.wifi.value as Record<string, unknown>).map(
        ([iface, data]) => ({
          interface: iface,
          ...(data && typeof data === "object" ? (data as Record<string, unknown>) : {}),
        })
      )
    : [];

  const networkInterfaces: Record<string, unknown>[] = Array.isArray(panel.interfaces?.value)
    ? (panel.interfaces.value as Record<string, unknown>[])
    : typeof panel.interfaces?.value === "object" && panel.interfaces?.value !== null
    ? Object.entries(panel.interfaces.value as Record<string, unknown>).map(
        ([iface, data]) => ({
          name: iface,
          ...(data && typeof data === "object" ? (data as Record<string, unknown>) : {}),
        })
      )
    : [];

  const routes = Array.isArray(panel.default_routes?.value)
    ? (panel.default_routes.value as string[])
    : [];

  const nameservers = Array.isArray(panel.nameservers?.value)
    ? (panel.nameservers.value as string[])
    : [];

  const hiddenIps = Array.isArray(panel.addresses_hidden_from_the_app?.value)
    ? (panel.addresses_hidden_from_the_app.value as string[])
    : [];

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
            Primary IP
          </dt>
          <dd className="mt-1 text-sm font-mono text-ink">
            <Reported reading={panel.primary_ip} mono />
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
            Server observed IP
          </dt>
          <dd className="mt-1 text-sm font-mono text-ink">
            <Reported reading={panel.server_observed_ip} mono />
            <span
              className="block text-[10px] text-muted-light truncate"
              title="NAT-observed peer address, not device-reported"
            >
              (peer / NAT router)
            </span>
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
            Own hotspot active
          </dt>
          <dd className="mt-1 text-sm text-ink">
            <Reported
              reading={panel.own_hotspot_active}
              format={(v) => (v ? "Active" : "Inactive")}
            />
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
            Regulatory domain
          </dt>
          <dd className="mt-1 text-sm font-mono text-ink">
            <Reported reading={panel.regulatory_domain} mono />
          </dd>
        </div>
      </dl>

      {/* WiFi Associations */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          WiFi Association
        </h3>
        {panel.wifi?.state === "NOT_REPORTED" ? (
          <p className="text-xs text-muted italic">
            WiFi association not reported by this firmware
          </p>
        ) : wifiInterfaces.length === 0 ? (
          <p className="text-xs text-muted">No wireless interfaces found or associated</p>
        ) : (
          <div className="space-y-2">
            {wifiInterfaces.map((w, idx) => {
              const ifaceName = String(w.interface ?? `wlan${idx}`);
              const ssid = w.ssid ? String(w.ssid) : "Unassociated";
              const signalDbm = w.signal_dbm !== undefined && w.signal_dbm !== null ? `${w.signal_dbm} dBm` : null;
              const signalPct = w.signal_percent !== undefined && w.signal_percent !== null ? `${w.signal_percent}%` : null;
              const signal = [signalDbm, signalPct ? `(${signalPct})` : null].filter(Boolean).join(" ");
              const band = w.band ? String(w.band) : null;
              const channel = w.channel ? `ch ${w.channel}` : null;
              const txBitrate = w.tx_bitrate_mbps ? `${w.tx_bitrate_mbps} Mbps tx` : null;

              return (
                <div
                  key={ifaceName}
                  className="rounded-lg border border-border bg-paper p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-ink">{ifaceName}</span>
                      <span className="text-muted font-semibold">{ssid}</span>
                    </div>
                    {signal ? <span className="text-emerald font-mono">{signal}</span> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
                    {band ? <span>Band: {band}</span> : null}
                    {channel ? <span>{channel}</span> : null}
                    {txBitrate ? <span>{txBitrate}</span> : null}
                    {w.interface_type ? <span>Type: {String(w.interface_type)}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Network Interfaces */}
      {networkInterfaces.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Network Interfaces
          </h3>
          <div className="space-y-2">
            {networkInterfaces.map((iface, idx) => {
              const name = String(iface.name ?? `iface${idx}`);
              const addrs = Array.isArray(iface.addresses)
                ? (iface.addresses as string[])
                : [];
              const operstate = String(iface.operstate ?? "—");
              const carrier = iface.carrier ? "carrier up" : "no carrier";

              return (
                <div
                  key={name}
                  className="rounded-lg border border-border bg-paper p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-medium text-ink">{name}</span>
                    <span className="font-mono text-[11px] text-muted">
                      {operstate} · {carrier}
                    </span>
                  </div>
                  {addrs.length > 0 ? (
                    <div className="mt-1 font-mono text-[11px] text-ink/80">
                      {addrs.join(", ")}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Routing & DNS */}
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3 text-xs">
        {routes.length > 0 ? (
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
              Default Routes
            </dt>
            <dd className="mt-1 font-mono text-ink/80">{routes.join(", ")}</dd>
          </div>
        ) : null}
        {nameservers.length > 0 ? (
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
              Nameservers
            </dt>
            <dd className="mt-1 font-mono text-ink/80">{nameservers.join(", ")}</dd>
          </div>
        ) : null}
        {hiddenIps.length > 0 ? (
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
              Hidden rescue addresses
            </dt>
            <dd className="mt-1 font-mono text-ink/80">{hiddenIps.join(", ")}</dd>
          </div>
        ) : null}
      </dl>

      {/* Hostname & mDNS */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Field
          label="Running Hostname"
          value={panel.hostname_running?.value ? String(panel.hostname_running.value) : "—"}
          mono
        />
        <Field
          label="Configured Hostname"
          value={panel.hostname_configured?.value ? String(panel.hostname_configured.value) : "—"}
          mono
        />
        <Field
          label="mDNS Collision Gen"
          value={panel.mdns_collision_generation?.value !== null && panel.mdns_collision_generation?.value !== undefined ? String(panel.mdns_collision_generation.value) : "—"}
          mono
        />
      </dl>

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
