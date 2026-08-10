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
