import { CircuitBoard, Mic, Monitor, Volume2, type LucideIcon } from "lucide-react";
import { formatUptime, isFresh } from "@/utils/datetime";
import type {
  DeviceHealthComponent,
  DeviceHealthReport,
  DeviceResponse,
  HealthComponentStatus,
} from "../types/lab";

/**
 * Derivations for the device self-test report. Pure functions only — no JSX —
 * so the rules that keep field telemetry from breaking the portal are directly
 * unit-testable.
 */

/** A self-test older than this is presented as historical, not current. */
export const STALE_AFTER_MS = 10 * 60 * 1000;

/**
 * Fold the wire's free-form status string into our four-value vocabulary.
 * Anything unrecognised becomes `"unknown"` — we never throw, and we never let
 * a raw enum leak into the interface.
 */
export function normalizeStatus(raw: unknown): HealthComponentStatus {
  if (typeof raw !== "string") return "unknown";
  switch (raw.trim().toLowerCase()) {
    case "ok":
    case "pass":
    case "passed":
    case "healthy":
    case "good":
      return "ok";
    case "warn":
    case "warning":
    case "degraded":
      return "warn";
    case "fail":
    case "failed":
    case "error":
    case "critical":
      return "fail";
    default:
      return "unknown";
  }
}

export const STATUS_LABEL: Record<HealthComponentStatus, string> = {
  ok: "OK",
  warn: "Degraded",
  fail: "Failing",
  unknown: "Unknown",
};

interface SubsystemMeta {
  label: string;
  icon: LucideIcon;
}

/**
 * Known subsystems, in the order they should appear. Unknown keys still
 * render — see `resolveSubsystem`.
 */
export const SUBSYSTEMS: Record<string, SubsystemMeta> = {
  display: { label: "Display", icon: Monitor },
  speaker: { label: "Speaker", icon: Volume2 },
  audio_hat: { label: "Microphone", icon: Mic },
};

const SUBSYSTEM_ORDER = Object.keys(SUBSYSTEMS);

/** `audio_hat` -> `Audio Hat`, `Left Boost Mixer LINPUT1` -> unchanged. */
export function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Metadata for any subsystem key, including ones firmware adds later. */
export function resolveSubsystem(key: string): SubsystemMeta {
  return SUBSYSTEMS[key] ?? { label: humanizeKey(key), icon: CircuitBoard };
}

export interface HealthComponentView {
  key: string;
  label: string;
  icon: LucideIcon;
  status: HealthComponentStatus;
  statusLabel: string;
  detail: string | null;
  metrics: Record<string, unknown>;
}

/**
 * Known subsystems first (in registry order), then anything else
 * alphabetically. Never assumes a fixed set — the device decides what it
 * reports.
 */
export function orderedComponents(report: DeviceHealthReport | null | undefined): HealthComponentView[] {
  const components = report?.components;
  if (!components || typeof components !== "object") return [];

  const keys = Object.keys(components);
  const known = SUBSYSTEM_ORDER.filter((k) => keys.includes(k));
  const unknown = keys.filter((k) => !SUBSYSTEM_ORDER.includes(k)).sort();

  return [...known, ...unknown].map((key) => {
    const raw = components[key] as DeviceHealthComponent | undefined;
    const meta = resolveSubsystem(key);
    const status = normalizeStatus(raw?.status);
    return {
      key,
      label: meta.label,
      icon: meta.icon,
      status,
      statusLabel: STATUS_LABEL[status],
      detail: typeof raw?.detail === "string" && raw.detail.trim() !== "" ? raw.detail : null,
      metrics: raw?.metrics && typeof raw.metrics === "object" ? (raw.metrics as Record<string, unknown>) : {},
    };
  });
}

export interface HealthSummary {
  /** False when the device has never reported, or has been revoked. */
  hasReport: boolean;
  report: DeviceHealthReport | null;
  /** Worst subsystem verdict, falling back to the report's own status. */
  level: HealthComponentStatus;
  /** The device is not reachable right now. */
  isLinkDown: boolean;
  /** The report describes the past, not the present — link down or report aged out. */
  isStale: boolean;
  components: HealthComponentView[];
  /** Humanized names of subsystems the device itself flagged, plus any we read as failing. */
  failedNames: string[];
  uptimeLabel: string | null;
  /** The report's firmware disagrees with the device record — an interrupted update. */
  firmwareDrift: boolean;
}

const SEVERITY: Record<HealthComponentStatus, number> = { ok: 0, unknown: 1, warn: 2, fail: 3 };

function worst(levels: HealthComponentStatus[]): HealthComponentStatus {
  return levels.reduce<HealthComponentStatus>(
    (acc, cur) => (SEVERITY[cur] > SEVERITY[acc] ? cur : acc),
    "ok",
  );
}

/**
 * Everything the UI needs about one device's health, in one pass.
 *
 * The central rule: `health_status` answers "can we reach it now", the report
 * answers "what did it say about itself last time". A passing self-test on an
 * unreachable device is stale by definition.
 */
export function summarizeHealth(device: DeviceResponse, now: number = Date.now()): HealthSummary {
  const report =
    device.last_health_report && typeof device.last_health_report === "object"
      ? device.last_health_report
      : null;
  const isLinkDown = device.health_status !== "ONLINE";
  const components = orderedComponents(report);

  const hasReport = report !== null && !device.revoked_at;
  if (!hasReport) {
    return {
      hasReport: false,
      report: null,
      level: "unknown",
      isLinkDown,
      isStale: true,
      components: [],
      failedNames: [],
      uptimeLabel: null,
      firmwareDrift: false,
    };
  }

  const componentLevel = components.length > 0 ? worst(components.map((c) => c.status)) : "unknown";
  const reportLevel = normalizeStatus(report?.status);
  const level = worst([componentLevel, reportLevel]);

  // The device's own `failed` array is authoritative; union it with anything we
  // read as failing, in case the two ever disagree.
  const declaredFailures = Array.isArray(report?.failed)
    ? report.failed.filter((f): f is string => typeof f === "string")
    : [];
  const readFailures = components.filter((c) => c.status === "fail").map((c) => c.key);
  const failedNames = Array.from(new Set([...declaredFailures, ...readFailures])).map((key) =>
    resolveSubsystem(key).label,
  );

  const checkedAt = device.last_health_at ?? (typeof report?.checked_at === "string" ? report.checked_at : null);
  const isStale = isLinkDown || !isFresh(checkedAt, STALE_AFTER_MS, now);

  const reportFirmware = typeof report?.firmware_version === "string" ? report.firmware_version : null;
  const firmwareDrift = Boolean(
    reportFirmware && device.firmware_version && reportFirmware !== device.firmware_version,
  );

  return {
    hasReport: true,
    report,
    level,
    isLinkDown,
    isStale,
    components,
    failedNames,
    uptimeLabel: formatUptime(typeof report?.uptime_s === "number" ? report.uptime_s : null),
    firmwareDrift,
  };
}

/**
 * Revoking a device rewrites its hardware id to `revoked:<uuid>:<original>` to
 * free the identifier for re-pairing. Show the operator the id printed on the
 * hardware, not the bookkeeping.
 */
export function displayHardwareId(hardwareId: string | null | undefined): string {
  if (!hardwareId) return "";
  const match = /^revoked:[^:]+:(.+)$/.exec(hardwareId);
  return match ? match[1] : hardwareId;
}

/** Best-known address for the device, preferring the live value over the report's. */
export function resolveAddresses(device: DeviceResponse): {
  current: string | null;
  atSelfTest: string | null;
  changed: boolean;
} {
  const current = typeof device.last_ip === "string" && device.last_ip ? device.last_ip : null;
  const reportIp = device.last_health_report?.ip;
  const atSelfTest = typeof reportIp === "string" && reportIp ? reportIp : null;
  return { current, atSelfTest, changed: Boolean(current && atSelfTest && current !== atSelfTest) };
}
