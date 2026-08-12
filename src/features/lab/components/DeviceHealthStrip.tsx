"use client";

import { ChevronRight } from "lucide-react";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { summarizeHealth } from "../utils/deviceHealth";
import type { HealthComponentStatus } from "../types/lab";
import type { DeviceResponse } from "../types/lab";

/**
 * Dot colours come from the theme token layer (`--emerald`, `--warning`,
 * `--danger`) rather than more hardcoded hex, so the rail tracks the palette.
 */
const DOT_TONE: Record<HealthComponentStatus, string> = {
  ok: "bg-emerald",
  warn: "bg-warning",
  fail: "bg-danger",
  unknown: "bg-[#1A3D2C]/25",
};

interface DeviceHealthStripProps {
  device: DeviceResponse;
  onOpenDiagnostics: (device: DeviceResponse) => void;
}

/**
 * The instrument tray at the foot of a device card: one glyph per subsystem
 * with a status dot, plus uptime and when the self-test ran.
 *
 * When the device is unreachable or the report has aged out, the glyph row
 * desaturates and the label reads "Last self-test". Colour is reserved for
 * what is true right now — a green tray above an offline device would be a
 * lie the operator acts on.
 */
export function DeviceHealthStrip({ device, onOpenDiagnostics }: DeviceHealthStripProps) {
  const summary = summarizeHealth(device);

  // Revoked devices and devices that have never reported get nothing rather
  // than an empty tray.
  if (!summary.hasReport || summary.components.length === 0) return null;

  const checkedAt = device.last_health_at ?? summary.report?.checked_at ?? null;
  const showPulse = !summary.isStale && summary.level === "ok";

  const spoken = summary.components.map((c) => `${c.label} ${c.statusLabel}`).join(", ");

  return (
    <button
      type="button"
      onClick={() => onOpenDiagnostics(device)}
      aria-label={`Diagnostics for ${device.device_label}. ${summary.isStale ? "Last known" : "Current"} self-test: ${spoken}.`}
      className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-[#1A3D2C]/[0.06] bg-[#F4F3EE] px-2.5 py-2 text-left transition-colors hover:border-[#1A3D2C]/15 hover:bg-[#EFEDE4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3D2C]/25"
    >
      <div
        className={`flex shrink-0 items-center gap-1.5 transition-opacity ${
          summary.isStale ? "opacity-55 grayscale" : ""
        }`}
      >
        {summary.components.map((component) => {
          const Icon = component.icon;
          return (
            <span
              key={component.key}
              title={`${component.label} — ${component.statusLabel}`}
              className="relative flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-[0_1px_2px_rgba(26,61,44,0.06)]"
            >
              <Icon size={12} className="text-[#1A3D2C]/70" />
              <span className="absolute -right-0.5 -top-0.5 flex h-1.5 w-1.5">
                {showPulse && component.status === "ok" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-60" />
                )}
                <span
                  className={`relative inline-flex h-1.5 w-1.5 rounded-full ring-2 ring-[#F4F3EE] ${DOT_TONE[component.status]}`}
                />
              </span>
            </span>
          );
        })}
      </div>

      {/* The glyphs are the signal and never shrink; in a narrow card the
          timing text truncates away rather than bursting the tray. */}
      <div className="flex min-w-0 items-center gap-1 overflow-hidden text-[10px] font-semibold text-[#1A3D2C]/45">
        {summary.uptimeLabel && (
          <>
            <span className="shrink-0 tabular-nums">{summary.uptimeLabel}</span>
            <span className="shrink-0" aria-hidden>
              ·
            </span>
          </>
        )}
        <span className="min-w-0 truncate">
          {summary.isStale && "Last self-test "}
          <RelativeTime value={checkedAt} />
        </span>
        <ChevronRight size={11} className="shrink-0" />
      </div>
    </button>
  );
}
