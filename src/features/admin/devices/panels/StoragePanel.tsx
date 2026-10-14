import React from "react";
import type { StoragePanel as StoragePanelType } from "../reportTypes";
import { Reported } from "../Reported";

interface StoragePanelProps {
  panel: StoragePanelType;
}

export function StoragePanel({ panel }: StoragePanelProps) {
  if (panel.error) {
    return <p className="text-sm text-rose-300">{panel.error}</p>;
  }

  const filesystems = Array.isArray(panel.filesystems?.value)
    ? (panel.filesystems.value as Record<string, unknown>[])
    : [];

  const lowSpace = Array.isArray(panel.low_space?.value)
    ? (panel.low_space.value as string[])
    : [];

  const readOnly = Array.isArray(panel.read_only_mounts?.value)
    ? (panel.read_only_mounts.value as string[])
    : [];

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-white/35">
            Overlay persistence
          </dt>
          <dd className="mt-1 text-sm text-white/80">
            <Reported
              reading={panel.overlay_active}
              format={(v) => (v ? "Active Overlay" : "Standard Rootfs")}
            />
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-white/35">
            Writes persist
          </dt>
          <dd className="mt-1 text-sm text-white/80">
            <Reported
              reading={panel.writes_persist}
              format={(v) => (v ? "Persistent" : "Volatile / Ephemeral")}
            />
          </dd>
        </div>
      </dl>

      {/* Warnings */}
      {lowSpace.length > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
          <strong>Low disk space warning:</strong> {lowSpace.join(", ")}
        </div>
      ) : null}

      {readOnly.length > 0 ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
          <strong>Read-only mount detected:</strong> {readOnly.join(", ")}
        </div>
      ) : null}

      {/* Filesystems table */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Filesystems
        </h3>
        {filesystems.length === 0 ? (
          <p className="text-xs text-white/40">No filesystems reported</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[11px] text-white/40 uppercase">
                  <th className="py-2 pr-3">Mount</th>
                  <th className="py-2 px-3">Size</th>
                  <th className="py-2 px-3">Used</th>
                  <th className="py-2 px-3">Free</th>
                  <th className="py-2 pl-3">Use %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filesystems.map((fs, idx) => (
                  <tr key={String(fs.mount ?? idx)}>
                    <td className="py-2 pr-3 text-white font-medium">{String(fs.mount ?? "—")}</td>
                    <td className="py-2 px-3 text-white/70">{String(fs.size_human ?? fs.size ?? "—")}</td>
                    <td className="py-2 px-3 text-white/70">{String(fs.used_human ?? fs.used ?? "—")}</td>
                    <td className="py-2 px-3 text-white/70">{String(fs.free_human ?? fs.free ?? "—")}</td>
                    <td className="py-2 pl-3 text-white/80">{String(fs.use_pct ?? fs.use_percent ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
