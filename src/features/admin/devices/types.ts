// Admin fleet views — mirrored from SCHOOL_LAB_MODE_WEB_FRONTEND_SPEC.md §6.7.
// These are the ADMIN-ONLY cross-school endpoints. Everything under /lab/* is
// scoped to a single partner/lab/slot; these span every school, which is why
// they sit behind their own role gate (a PARTNER gets 403, not a narrowed result).

import type { LabDeviceHealth } from "@/features/lab/types/lab";

/**
 * Latest self-test verdict. `null` means the device has NEVER reported one —
 * that is *unknown*, not healthy. Read it together with `self_test_failed`.
 */
export type SelfTestStatus = "ok" | "service_required" | null;

/** A row of `GET /admin/lab/devices`. Partner/lab names are joined server-side. */
export interface AdminDeviceListItem {
  id: string;
  partner_id: string;
  partner_organization: string | null;
  lab_id: string;
  lab_name: string | null;
  device_label: string;
  hardware_id: string;
  health_status: LabDeviceHealth;
  last_heartbeat_at: string | null;
  firmware_version: string | null;
  device_model: string | null;
  is_spare: boolean;
  revoked_at: string | null;
  last_ip: string | null;
  last_health_at: string | null;
  self_test_status: SelfTestStatus;
  /** Empty when clean AND when unknown — only means "clean" if status is "ok". */
  self_test_failed: string[];
}

/**
 * One component's line in a self-test report. The spec documents only that the
 * payload is "per-component status/detail/metrics" — the concrete schema is not
 * pinned down, so this stays permissive and the UI renders it generically.
 */
export interface HealthComponentReport {
  status?: string;
  detail?: string;
  metrics?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * The full self-test payload, observed from a live device. `components` holds
 * the actual per-component results (`display`, `audio_hat`, …) — everything
 * else here is report-level metadata, NOT a component. Do not `Object.entries`
 * this object expecting component rows; use `.components`.
 */
export interface HealthReport {
  ip?: string;
  mode?: string;
  type?: string;
  checked_at?: string;
  /** Self-test's own reported firmware — may lag the provisioning record. */
  firmware_version?: string;
  schema_version?: string | number;
  components?: Record<string, HealthComponentReport>;
  [key: string]: unknown;
}

/** `GET /admin/lab/devices/{id}` — the list item plus provisioning history. */
export interface AdminDeviceDetail extends AdminDeviceListItem {
  last_health_report: HealthReport | null;
  device_token_rotated_at: string | null;
  provisioned_at: string | null;
  first_connected_at: string | null;
  last_connected_at: string | null;
  provisioning_source: "MANUAL" | "PAIRING" | null;
}

/** `GET /admin/lab/stats`. All counts exclude revoked except `revoked_devices`. */
export interface AdminLabStats {
  total_devices: number;
  by_health_status: Partial<Record<LabDeviceHealth, number>>;
  /** Latest self-test says a component failed. */
  service_required: number;
  /** Never reported a self-test — UNKNOWN, not healthy. */
  self_test_unknown: number;
  /** No heartbeat within LAB_STALE_HEARTBEAT_MINUTES (or ever). */
  stale_heartbeat: number;
  revoked_devices: number;
  total_labs: number;
  partners_with_labs: number;
}

/** `GET /admin/lab/labs`. */
export interface AdminLabListItem {
  id: string;
  partner_id: string;
  partner_organization: string | null;
  name: string;
  location: string | null;
  timezone: string;
  default_session_seconds: number;
  allow_companion_in_lab: boolean;
  /** Excludes revoked devices. */
  device_count: number;
}

export interface Paginated<T> {
  items: T[];
  /** Unpaged match count — drives the page loop, not `items.length`. */
  total: number;
  page: number;
  page_size: number;
}

// ── gened-health system diagnostic ─────────────────────────────
//
// A different system from the self-test above, not a newer version of it. The
// self-test reports a DISPATCH verdict (`ok`/`service_required`) for the Lab
// pipeline. gened-health reports a DIAGNOSTIC classification and exists for
// every device regardless of mode. Both render on this page, side by side.

/**
 * `UNKNOWN` means the tool could not look — notably for audio and display it
 * means the app was unreachable, so the hardware verdict is genuinely unknown
 * rather than fine. It must never render as green.
 */
export type DiagnosticStatus =
  | "PASS"
  | "WARN"
  | "FAIL"
  | "UNKNOWN"
  | "EXPECTED"
  | "SKIP"
  | "INFO"
  | "STALE";

/** One actionable result the device already triaged. */
export interface DiagnosticFinding {
  id: string | null;
  status: DiagnosticStatus | null;
  subsystem: string | null;
  title: string | null;
  detail: string | null;
  next_step: string | null;
}

/**
 * `GET /admin/devices/{device_key}/diagnostic` — the server's projection, not
 * the raw canonical document. The full report stays in the database.
 *
 * Two clocks, deliberately distinct. `received_at` is the server's and is the
 * only thing freshness is computed from. `collected_at` is the device's and is
 * display-only: a Pi that booted offline can report a timestamp years off,
 * which is what `clock_synced: false` is warning about.
 *
 * `fresh` is the SERVER's decision. Render it; do not recompute one here. The
 * Lab surface already has a 15-minute backend threshold and a separate
 * 10-minute frontend constant that disagree, and this is the mistake not to
 * repeat.
 */
export interface DeviceDiagnostic {
  serial: string;
  device_key: string;
  reported_device_id: string | null;
  hostname: string | null;
  device_model: string | null;
  mode: string | null;
  firmware_version: string | null;
  tool_version: string | null;
  deployed_version: string | null;
  overall: DiagnosticStatus;
  /** Open-keyed per-status counts. Render what is present, not a fixed list. */
  tally: Partial<Record<DiagnosticStatus, number>>;
  /** Only FAIL/WARN/UNKNOWN; PASS and INFO live in the tally. */
  findings: DiagnosticFinding[];
  /** Total before the actionable filter, so the UI can say "showing N of M". */
  findings_total: number;
  received_at: string | null;
  report_age_seconds: number | null;
  fresh: boolean;
  fresh_after_seconds: number;
  collected_at: string | null;
  clock_synced: boolean | null;
  last_ip: string | null;
  schema_version: number | null;
  redaction: string | null;
}

export interface DeviceQuery {
  partner_id?: string;
  lab_id?: string;
  health_status?: LabDeviceHealth;
  /** Matches device label OR hardware id. */
  q?: string;
  /**
   * `true` → latest self-test says service_required; `false` → says ok.
   * Omit for everything *including* devices that never reported one: those are
   * unknown, and `false` deliberately does not claim them.
   */
  has_fault?: boolean;
  stale_minutes?: number;
  /** Default false server-side. */
  include_revoked?: boolean;
  page?: number;
  /** Default 25, max 200. */
  page_size?: number;
}
