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
  /** Explicit tri-state. NEVER_REPORTED only appears at the device level. */
  diagnostic_freshness: DiagnosticFreshness;
  /**
   * The cadence freshness is derived from (`fresh_after_seconds` is 3x this).
   * Published so the UI can say "expected hourly" rather than inventing one.
   */
  report_interval_seconds: number;
  collected_at: string | null;
  clock_synced: boolean | null;
  last_ip: string | null;
  schema_version: number | null;
  redaction: string | null;
}

// ── Canonical device registry (Phase 2) ────────────────────────

/**
 * Reachability RIGHT NOW, from a transport that owns a live channel.
 *
 * `UNKNOWN` is not a soft `OFFLINE`. It means no transport could answer — the
 * normal state for a healthy PERSONAL device on an hourly diagnostic cadence,
 * since nothing holds a socket open to it. Rendering that as OFFLINE would
 * report working hardware as dead. Never colour it green either: we do not know.
 */
export type ConnectivityState = "ONLINE" | "OFFLINE" | "UNKNOWN";

export type ConnectivitySource = "LAB_WS" | "MQTT_STATUS" | "NONE";

/** How old our diagnostic DATA is. Says nothing about reachability. */
export type DiagnosticFreshness = "FRESH" | "STALE" | "NEVER_REPORTED";

/** How we know this device exists at all. */
export type DeviceProvenance =
  | "PRE_PROVISIONED"
  | "SELF_REGISTERED"
  | "ENROLLED";

/** Which transport produced `last_seen_at`. */
export type LastSeenSource =
  | "LAB_WS"
  | "MQTT_STATUS"
  | "MQTT_HEALTH"
  | "HEALTH_POST";

export interface DeviceConnectivity {
  state: ConnectivityState;
  source: ConnectivitySource;
  /**
   * Why the state is UNKNOWN. `ambiguous_multi_unit` is worth surfacing: the
   * MQTT status topic is student-keyed, so with two units per child the online
   * flag is not merely imprecise but wrong.
   */
  reason: string | null;
  last_heartbeat_at?: string | null;
  heartbeat_age_seconds?: number;
  /** The Lab grace window, server-supplied. Do not hardcode a client copy. */
  grace_seconds?: number;
  units_sharing_topic?: number;
}

/**
 * `GET /admin/devices/{device_key}` — one physical device as FOUR independent
 * dimensions: connectivity, diagnostic freshness, diagnostic verdict, and
 * registry provenance.
 *
 * Do not collapse them into one health light. Every pair occurs in production:
 * online+stale is a broken reporting pipeline on a working device, offline+fresh
 * is a unit unplugged a minute ago, and "never reported" is not "reported
 * healthy". A single boolean loses the distinction an operator needs to act on.
 *
 * `serial` is the canonical identity. `reported_device_id`, `lab_hardware_id`
 * and `derived_device_key` are mutable aliases — fine to display and search by,
 * never to treat as identity.
 */
export interface CanonicalDevice {
  id: string;
  serial: string;
  reported_device_id: string | null;
  lab_hardware_id: string | null;
  derived_device_key: string;
  label: string | null;
  device_model: string | null;
  /** Mode the device REPORTED. Observed, not assigned. */
  last_reported_mode: string | null;
  provenance: DeviceProvenance;
  connectivity: DeviceConnectivity;
  /**
   * Last time the device was observed making CONTACT, on the server's clock,
   * strictly monotonic. An MQTT Last Will does not advance it — that is the
   * broker speaking, not the device.
   */
  last_seen_at: string | null;
  last_seen_source: LastSeenSource | null;
  last_seen_age_seconds: number | null;
  first_seen_at: string | null;
  diagnostic_freshness: DiagnosticFreshness;
  diagnostic_verdict: DiagnosticStatus | null;
  /** null means never reported — not an empty report. */
  diagnostic: DeviceDiagnostic | null;
}

// ── The mode-independent fleet view (Phase 4) ──────────────────
//
// `GET /admin/devices` — one row per PHYSICAL unit, across PERSONAL, SCHOOL_LAB,
// pre-provisioned and legacy devices alike. Distinct from `AdminDeviceListItem`
// above, which is a Lab ENROLLMENT and only ever covers SCHOOL_LAB.
//
// Everything is server-derived: filtering, sorting, paging, the attention flag
// and every threshold. The client renders these decisions and computes none of
// them — see `fresh_after_seconds`.

/**
 * Which record a row was assembled from.
 *
 * `LEGACY_*` is not an error state and is most of the existing fleet. A canonical
 * row needs a real SoC serial, which only a gened-health report supplies:
 * `lab_devices` has no serial column at all, and `device_health.serial` carries
 * the firmware's `SN<8hex>` rather than the `/proc/cpuinfo` value. So a device
 * reads as legacy until it runs Phase 3 firmware, and that is a prompt to update
 * it rather than a fault.
 */
export type FleetRecord = "CANONICAL" | "LEGACY_LAB" | "LEGACY_PERSONAL";

/**
 * Why a device needs a human. Diagnostic-derived only.
 *
 * Connectivity is deliberately NOT a reason: a classroom's devices are OFFLINE
 * every evening, so including it would light up the whole fleet at 4pm and mean
 * nothing by 4:05. Filter on `connectivity` directly for that. `WARN` is absent
 * for the same reason in miniature — a flag that fires on every non-blocking
 * observation stops being a shortlist.
 */
export type AttentionReason =
  | "diagnostic_fail"
  | "diagnostic_unknown"
  | "diagnostic_stale";

/** Read-only Lab tenancy context. Belongs to the ENROLLMENT, not the hardware. */
export interface FleetLabContext {
  /** The key the existing Lab detail page takes. */
  lab_device_id: string;
  device_label: string;
  hardware_id: string;
  lab_id: string;
  partner_id: string;
  health_status: LabDeviceHealth;
  last_heartbeat_at: string | null;
  is_spare: boolean;
  revoked_at: string | null;
}

/**
 * One physical device. Every dimension is exposed independently and none may be
 * collapsed into a single health light — every pair occurs in production and the
 * operator's next action differs between them:
 *
 *   ONLINE  + STALE + PASS     the reporting pipeline is broken, the device is fine
 *   ONLINE  + FRESH + FAIL     broken and live — triage now
 *   OFFLINE + FRESH + PASS     unplugged a minute ago, was healthy
 *   UNKNOWN + NEVER + null     still in its box, or legacy firmware
 *
 * `serial` is the canonical identity and is `null` on a legacy row, which has
 * none — the row says so rather than inventing one from a mutable alias.
 */
export interface FleetDeviceRow {
  record: FleetRecord;
  /** Stable row identity: the React key, and what makes every sort total. */
  fleet_key: string;
  /** The canonical `devices.id`. `null` on a legacy row. */
  id: string | null;
  /** Canonical SoC serial. `null` on a legacy row. */
  serial: string | null;
  reported_device_id: string | null;
  lab_hardware_id: string | null;
  derived_device_key: string | null;
  label: string | null;
  device_model: string | null;
  /** The mode the device REPORTED. Observed, never assigned or inferred. */
  last_reported_mode: string | null;
  /** `null` on a legacy row: provenance describes how a CANONICAL row arose. */
  provenance: DeviceProvenance | null;
  connectivity: DeviceConnectivity;
  last_seen_at: string | null;
  last_seen_source: LastSeenSource | null;
  last_seen_age_seconds: number | null;
  first_seen_at: string | null;
  diagnostic_freshness: DiagnosticFreshness;
  /** `null` means never reported — which is not "reported healthy". */
  diagnostic_verdict: DiagnosticStatus | null;
  report_age_seconds: number | null;
  received_at: string | null;
  findings_total: number;
  tally: Partial<Record<DiagnosticStatus, number>>;
  needs_attention: boolean;
  attention_reasons: AttentionReason[];
  /** Server-owned. Render it; never hardcode a client copy. */
  fresh_after_seconds: number;
  /** The cadence `fresh_after_seconds` is 3x. */
  report_interval_seconds: number;
  firmware_version: string | null;
  tool_version: string | null;
  deployed_version: string | null;
  hostname: string | null;
  lab: FleetLabContext | null;
  /**
   * This row's Lab enrollment was withdrawn. Tenancy, never reachability — the
   * unit may be powered on and perfectly reachable, which is why it never feeds
   * connectivity. A CANONICAL row is never hidden by `include_revoked`: the
   * hardware record outlives the tenancy, and that asymmetry is the whole reason
   * the registry is a separate table.
   */
  revoked: boolean;
  revoked_at: string | null;
  /**
   * Present only on `LEGACY_PERSONAL`. The `device_health` DISPATCH verdict
   * (`ok`/`service_required`), deliberately not folded into
   * `diagnostic_verdict` — the two vocabularies are not schema-compatible.
   */
  self_test_status?: string | null;
  self_test_failed?: string[];
}

export type FleetSort =
  | "attention"
  | "last_seen"
  | "identity"
  | "verdict"
  | "freshness"
  | "connectivity";

/** Filter value for "has never reported a diagnostic", which has no verdict. */
export const VERDICT_NONE = "NONE";

export interface FleetDeviceQuery {
  /** Matches serial, reported id, Lab hardware id or label. Not hostname. */
  q?: string;
  record?: FleetRecord;
  /** The REPORTED mode. A legacy row has none and is never matched. */
  mode?: string;
  provenance?: DeviceProvenance;
  connectivity?: ConnectivityState;
  freshness?: DiagnosticFreshness;
  /** A `DiagnosticStatus`, or `VERDICT_NONE` for never-reported. */
  verdict?: DiagnosticStatus | typeof VERDICT_NONE;
  /** Meaningful as an explicit `false`; omit for "either". */
  needs_attention?: boolean;
  /** Default false server-side. Only governs rows with nothing else to show. */
  include_revoked?: boolean;
  sort?: FleetSort;
  page?: number;
  /** Default 25, max 200. */
  page_size?: number;
}

export interface PaginatedFleet {
  items: FleetDeviceRow[];
  /** Match count AFTER filtering, BEFORE paging. Sizes the pager. */
  total: number;
  page: number;
  page_size: number;
  sort: FleetSort;
  /**
   * The candidate scan hit the server's cap, so `total` is a floor rather than a
   * count. Surfaced rather than swallowed.
   */
  truncated: boolean;
  fresh_after_seconds: number;
  report_interval_seconds: number;
}

/**
 * `GET /admin/devices/stats`. Fleet-wide and NOT scoped to the list's filters.
 *
 * That is deliberate: the tiles exist so an operator can check the filtered rows
 * add up, and a tile that recounted itself whenever a filter changed could not
 * do that. Revoked devices ARE counted, so the revoked tile reconciles against
 * what `include_revoked=true` returns.
 *
 * Every map is open-keyed. Render what is present rather than a fixed list —
 * `by_provenance` carries an extra `UNREGISTERED` bucket for legacy rows, and
 * `by_mode` an `UNREPORTED` one.
 */
export interface FleetStats {
  total: number;
  by_record: Partial<Record<FleetRecord, number>>;
  by_provenance: Record<string, number>;
  by_connectivity: Partial<Record<ConnectivityState, number>>;
  by_freshness: Partial<Record<DiagnosticFreshness, number>>;
  by_verdict: Record<string, number>;
  by_mode: Record<string, number>;
  needs_attention: number;
  by_attention_reason: Partial<Record<AttentionReason, number>>;
  revoked: number;
  truncated: boolean;
  fresh_after_seconds: number;
  report_interval_seconds: number;
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
