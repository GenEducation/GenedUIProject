"use client";

import {
  Ban,
  CircleHelp,
  TriangleAlert,
  Wifi,
  WifiOff,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { AdminDeviceListItem, SelfTestStatus } from "../devices/types";

/**
 * Device health has two independent axes and the UI must not collapse them:
 *
 *   Connectivity  — can we reach it?      health_status + last_heartbeat_at
 *   Serviceability — is the hardware ok?  self_test_status + self_test_failed
 *
 * A device can be perfectly ONLINE with a dead speaker. One badge for both would
 * hide the exact fault ops needs to dispatch on.
 */

// ── Connectivity ───────────────────────────────────────────────

export type ConnState = "ONLINE" | "STALE" | "NEEDS_ATTENTION" | "OFFLINE" | "REVOKED";

/**
 * The server decides staleness with LAB_STALE_HEARTBEAT_MINUTES, which it does
 * not expose. `stats.stale_heartbeat` is therefore the authoritative count; this
 * constant only drives per-row highlighting. If the KPI tile and the highlighted
 * rows disagree on screen, this number is wrong — not the tile.
 */
export const STALE_HEARTBEAT_MINUTES = 10;

export function deriveConn(
  d: Pick<AdminDeviceListItem, "health_status" | "last_heartbeat_at" | "revoked_at">,
  staleMinutes = STALE_HEARTBEAT_MINUTES,
): ConnState {
  if (d.revoked_at) return "REVOKED";
  if (d.health_status === "NEEDS_ATTENTION") return "NEEDS_ATTENTION";
  if (d.health_status === "OFFLINE") return "OFFLINE";
  // Claims ONLINE — but a unit that lost power without a clean disconnect keeps
  // claiming it. Trust the heartbeat over the flag.
  return isHeartbeatStale(d, staleMinutes) ? "STALE" : "ONLINE";
}

export function isHeartbeatStale(
  d: Pick<AdminDeviceListItem, "health_status" | "last_heartbeat_at" | "revoked_at">,
  staleMinutes = STALE_HEARTBEAT_MINUTES,
): boolean {
  if (d.revoked_at || d.health_status !== "ONLINE") return false;
  if (!d.last_heartbeat_at) return true; // never heartbeat, yet reads ONLINE
  const ts = Date.parse(d.last_heartbeat_at);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts > staleMinutes * 60_000;
}

export const CONN_STYLES: Record<
  ConnState,
  { icon: LucideIcon; className: string; label: string }
> = {
  ONLINE: { icon: Wifi, className: "bg-[#059F6D]/15 text-[#059F6D]", label: "Online" },
  STALE: { icon: TriangleAlert, className: "bg-amber-500/15 text-amber-300", label: "Stale" },
  NEEDS_ATTENTION: {
    icon: TriangleAlert,
    className: "bg-rose-500/15 text-rose-300",
    label: "Needs attention",
  },
  OFFLINE: { icon: WifiOff, className: "bg-white/10 text-white/40", label: "Offline" },
  REVOKED: { icon: Ban, className: "bg-white/10 text-white/30", label: "Revoked" },
};

// ── Serviceability ─────────────────────────────────────────────

export type ServiceState = "OK" | "SERVICE_REQUIRED" | "UNKNOWN";

/**
 * `self_test_failed: []` means "clean" ONLY when the status is "ok". A null
 * status with an empty array is a device that has never reported — unknown.
 * Never render unknown as healthy.
 */
export function deriveService(d: { self_test_status: SelfTestStatus }): ServiceState {
  if (d.self_test_status === "ok") return "OK";
  if (d.self_test_status === "service_required") return "SERVICE_REQUIRED";
  return "UNKNOWN";
}

export const SERVICE_STYLES: Record<
  ServiceState,
  { icon: LucideIcon; className: string; label: string }
> = {
  OK: { icon: Wrench, className: "bg-[#059F6D]/15 text-[#059F6D]", label: "Passing" },
  SERVICE_REQUIRED: {
    icon: Wrench,
    className: "bg-rose-500/15 text-rose-300",
    label: "Service required",
  },
  UNKNOWN: { icon: CircleHelp, className: "bg-amber-500/15 text-amber-300", label: "Unknown" },
};

// ── Formatting ─────────────────────────────────────────────────

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "—";

  const secs = Math.round((Date.now() - ts) / 1000);
  if (secs < 0) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function absoluteTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  return Number.isNaN(ts) ? "—" : new Date(ts).toLocaleString();
}

// ── Badges ─────────────────────────────────────────────────────

const PILL = "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs whitespace-nowrap";

export function ConnBadge({
  device,
  staleMinutes,
}: {
  device: Pick<AdminDeviceListItem, "health_status" | "last_heartbeat_at" | "revoked_at">;
  staleMinutes?: number;
}) {
  const state = deriveConn(device, staleMinutes);
  const { icon: Icon, className, label } = CONN_STYLES[state];
  return (
    <span className={`${PILL} ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

export function ServiceChip({
  device,
  showComponents = true,
}: {
  device: Pick<AdminDeviceListItem, "self_test_status" | "self_test_failed">;
  showComponents?: boolean;
}) {
  const state = deriveService(device);
  const { icon: Icon, className, label } = SERVICE_STYLES[state];
  const failed = device.self_test_failed ?? [];
  const suffix =
    showComponents && state === "SERVICE_REQUIRED" && failed.length > 0
      ? `: ${failed.join(", ")}`
      : "";
  return (
    <span className={`${PILL} ${className}`} title={failed.join(", ") || undefined}>
      <Icon size={12} />
      {label}
      {suffix}
    </span>
  );
}

/** Plain-text mirror of the badges, so DataTable search/filter match the screen. */
export function connLabel(d: Parameters<typeof deriveConn>[0]): string {
  return CONN_STYLES[deriveConn(d)].label;
}

export function serviceLabel(d: { self_test_status: SelfTestStatus }): string {
  return SERVICE_STYLES[deriveService(d)].label;
}
