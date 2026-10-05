"use client";

/**
 * Presentation for the canonical device registry's four dimensions.
 *
 * Extracted from `DeviceDetailView` when the fleet view needed the same chips.
 * The alternative was a second copy, and a second copy of a colour table is how
 * `UNKNOWN` ends up amber on one screen and green on another — which is the one
 * thing this vocabulary is not allowed to do.
 *
 * The rule, in one line: NOTHING HERE DECIDES ANYTHING. Every threshold already
 * arrived from the server (`fresh_after_seconds`, `report_interval_seconds`,
 * `grace_seconds`), and these helpers only colour and name what it sent. The Lab
 * surface shipped a hardcoded 10-minute frontend constant against a 15-minute
 * backend one and they disagreed on screen; new code reads the server's number.
 */

import type {
  ConnectivityState,
  DeviceProvenance,
  DiagnosticFreshness,
  DiagnosticStatus,
  FleetRecord,
} from "./types";

/**
 * Status colours for the gened-health vocabulary.
 *
 * UNKNOWN is amber, never green. It means the tool could not look — for audio
 * and display specifically it means the app was unreachable, so the hardware
 * verdict is genuinely unknown rather than fine. EXPECTED is an operator having
 * declared a deviation on purpose, so it reads as neutral-good; SKIP and INFO
 * are not verdicts at all.
 */
export const DIAG_STYLES: Record<DiagnosticStatus, string> = {
  PASS: "bg-[#059F6D]/15 text-[#059F6D]",
  WARN: "bg-amber-500/15 text-amber-300",
  FAIL: "bg-rose-500/15 text-rose-300",
  UNKNOWN: "bg-amber-500/10 text-amber-200/80",
  STALE: "bg-amber-500/10 text-amber-200/80",
  EXPECTED: "bg-sky-500/15 text-sky-300",
  SKIP: "bg-white/10 text-white/40",
  INFO: "bg-white/10 text-white/50",
};

/** Worst-first, so the counts that matter are not buried under PASS. */
export const TALLY_ORDER: DiagnosticStatus[] = [
  "FAIL",
  "WARN",
  "UNKNOWN",
  "STALE",
  "PASS",
  "EXPECTED",
  "SKIP",
  "INFO",
];

export function DiagnosticBadge({
  status,
  label,
}: {
  status: DiagnosticStatus;
  /** Accessible name. A bare "WARN" is ambiguous on its own, and the same
   *  string also appears as a tally label, so the overall verdict names itself. */
  label?: string;
}) {
  return (
    <span
      aria-label={label}
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        DIAG_STYLES[status] ?? "bg-white/10 text-white/50"
      }`}
    >
      {status}
    </span>
  );
}

/**
 * Connectivity colours. `UNKNOWN` is amber and never green: we do not know, and
 * the normal cause is that this device has no presence transport at all rather
 * than anything being wrong.
 */
export const CONNECTIVITY_STYLES: Record<ConnectivityState, string> = {
  ONLINE: "bg-emerald-500/15 text-emerald-300",
  OFFLINE: "bg-rose-500/15 text-rose-300",
  UNKNOWN: "bg-amber-500/15 text-amber-300",
};

/**
 * The device's connectivity, as the server derived it from a transport.
 *
 * Distinct from `deviceHealth.ConnBadge`, which reads a `lab_devices` row and
 * recomputes staleness on the client. Both are correct about different things
 * and the difference matters: the Lab badge describes the Lab's record of a
 * desk, this one describes whether the physical unit is reachable now. A page
 * that shows the Lab badge as the device's status will contradict itself the
 * moment the enrollment stops being current.
 */
export function CanonicalConnBadge({
  connectivity,
}: {
  connectivity: { state: ConnectivityState };
}) {
  return (
    <span
      aria-label={`Connectivity: ${connectivity.state}`}
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
        CONNECTIVITY_STYLES[connectivity.state] ?? "bg-white/10 text-white/50"
      }`}
    >
      {connectivity.state}
    </span>
  );
}

/** Why connectivity could not be determined, in words an operator can act on. */
export const CONNECTIVITY_REASONS: Record<string, string> = {
  no_presence_channel:
    "No live connection channel. This device reports diagnostics on a schedule " +
    "but holds no socket open, so reachability cannot be confirmed either way.",
  never_connected: "Enrolled, but has never connected.",
  no_status_seen: "Has reported health, but no connection status has been seen.",
  ambiguous_multi_unit:
    "Two or more units share this student's status topic, so the online flag " +
    "cannot name a single device. Reachability is genuinely ambiguous, not offline.",
};

export const FRESHNESS_STYLES: Record<DiagnosticFreshness, string> = {
  FRESH: "bg-emerald-500/15 text-emerald-300",
  STALE: "bg-amber-500/15 text-amber-300",
  NEVER_REPORTED: "bg-amber-500/15 text-amber-300",
};

export const PROVENANCE_LABELS: Record<DeviceProvenance, string> = {
  PRE_PROVISIONED: "Pre-registered — awaiting first contact",
  SELF_REGISTERED: "Self-registered on first contact",
  ENROLLED: "Enrolled in a lab",
};

/** Compact forms for a table cell, where the sentences above do not fit. */
export const PROVENANCE_SHORT: Record<DeviceProvenance, string> = {
  PRE_PROVISIONED: "Pre-registered",
  SELF_REGISTERED: "Self-registered",
  ENROLLED: "Enrolled",
};

export const FRESHNESS_SHORT: Record<DiagnosticFreshness, string> = {
  FRESH: "Fresh",
  STALE: "Stale",
  NEVER_REPORTED: "Never reported",
};

export const CONNECTIVITY_SHORT: Record<ConnectivityState, string> = {
  ONLINE: "Online",
  OFFLINE: "Offline",
  UNKNOWN: "Unknown",
};

/**
 * What kind of record a fleet row came from, in the operator's terms.
 *
 * `LEGACY_*` is phrased as an action rather than a fault, because that is what
 * it is: the unit has not yet run firmware that reports a gened-health document,
 * so no canonical row could be created for it. Nothing is broken.
 */
export const RECORD_LABELS: Record<FleetRecord, string> = {
  CANONICAL: "Registered",
  LEGACY_LAB: "Lab only — no serial yet",
  LEGACY_PERSONAL: "MQTT only — no serial yet",
};

export const RECORD_HINTS: Record<FleetRecord, string> = {
  CANONICAL: "We hold this unit's SoC serial, so it has a canonical fleet record.",
  LEGACY_LAB:
    "Known only as a Lab enrollment. A lab_devices row carries no SoC serial, " +
    "so a canonical record cannot exist until this device sends its first " +
    "gened-health report. Lab presence and sessions are unaffected.",
  LEGACY_PERSONAL:
    "Known only from its MQTT self-test. The serial it reports is the " +
    "firmware's DEVICE_SERIAL rather than the SoC value, so a canonical record " +
    "cannot exist until this device sends its first gened-health report.",
};

/**
 * Human text for an attention reason. Deliberately says what to do about it —
 * the whole point of carrying reasons instead of one boolean is that the next
 * action differs between them.
 */
export const ATTENTION_LABELS: Record<string, string> = {
  diagnostic_fail: "A check failed",
  diagnostic_unknown: "The diagnostic could not run every check",
  diagnostic_stale: "Diagnostic data has aged out",
};

/**
 * "Expected hourly" and friends, from the server's own cadence.
 *
 * Takes the number rather than defining one. If the backend retunes
 * REPORT_INTERVAL this follows automatically, which is the property the Lab
 * surface's hardcoded constant did not have.
 */
export function cadenceLabel(reportIntervalSeconds: number): string {
  const minutes = Math.round(reportIntervalSeconds / 60);
  if (minutes < 60) return `Expected every ${minutes} min`;
  const hours = minutes / 60;
  return hours === 1 ? "Expected hourly" : `Expected every ${hours} h`;
}
