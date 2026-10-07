import type { DiagnosticFinding, DiagnosticStatus } from "./types";

export type ReadingState =
  | "OK"
  | "NOT_REPORTED"
  | "NOT_IN_METRICS"
  | "UNKNOWN"
  | "SKIPPED"
  | "PARTIAL";

export interface Reading<T = unknown> {
  value: T | null;
  unit: string | null;
  state: ReadingState;
  source_check: string | null;
  note: string | null;
}

export interface CheckSource {
  status: string | null;
  detail: string | null;
  next_step: string | null;
}

export interface NetworkPanel {
  primary_ip: Reading<string>;
  interfaces: Reading<unknown[]>;
  default_routes: Reading<unknown[]>;
  nameservers: Reading<unknown[]>;
  addresses_hidden_from_the_app: Reading<unknown[]>;
  wifi: Reading<unknown[]>;
  regulatory_domain: Reading<string>;
  own_hotspot_active: Reading<boolean>;
  active_connections: Reading<unknown[]>;
  hostname_running: Reading<string>;
  hostname_configured: Reading<string>;
  mdns_collision_generation: Reading<number>;
  server_observed_ip: Reading<string>;
  sources: Record<string, CheckSource>;
  error?: string;
}

export interface SystemPanel {
  uptime_seconds: Reading<number>;
  uptime_human: Reading<string>;
  boot_id: Reading<string>;
  load_1m: Reading<number>;
  load_5m: Reading<number>;
  load_15m: Reading<number>;
  soc_temperature_c: Reading<number>;
  thermal_note: Reading<string>;
  throttling: Reading<unknown>;
  memory: Reading<unknown>;
  clock_synchronized: Reading<boolean>;
  timezone: Reading<string>;
  os: Reading<string>;
  kernel: Reading<string>;
  model: Reading<string>;
  wifi_regdomain_declared: Reading<string>;
  kernel_tainted: Reading<string>;
  sources: Record<string, CheckSource>;
  error?: string;
}

export interface StoragePanel {
  filesystems: Reading<unknown[]>;
  low_space: Reading<unknown[]>;
  read_only_mounts: Reading<unknown[]>;
  overlay_active: Reading<boolean>;
  writes_persist: Reading<boolean>;
  sources: Record<string, CheckSource>;
  error?: string;
}

export interface PowerPanel {
  battery_percent: Reading<number>;
  battery_voltage_v: Reading<number>;
  charger_present: Reading<boolean>;
  power_source: Reading<string>;
  battery_configuration: Reading<unknown>;
  charger_configuration: Reading<unknown>;
  sources: Record<string, CheckSource>;
  error?: string;
}

export interface ServicesPanel {
  units: Reading<unknown[]>;
  units_with_restarts: Reading<unknown[]>;
  app_serving: Reading<unknown>;
  app_report_components: Reading<Record<string, unknown>>;
  app_report_failed: Reading<unknown[]>;
  app_report_checked_at: Reading<string>;
  app_report_not_covered: Reading<unknown[]>;
  journal_persistent: Reading<boolean>;
  slow_units: Reading<unknown[]>;
  sources: Record<string, CheckSource>;
  error?: string;
}

export interface ProvenancePanel {
  mode: Reading<string>;
  mode_source: Reading<string>;
  mode_file_present: Reading<boolean>;
  firmware_stamp: Reading<string>;
  firmware_stamp_present: Reading<boolean>;
  tool_version: Reading<string>;
  deployed_version: Reading<string>;
  git_trees: Reading<unknown>;
  distinct_heads: Reading<unknown[]>;
  code_drift: Reading<unknown>;
  ota_interlock: Reading<unknown>;
  ota_last_run: Reading<unknown>;
  crash_budget: Reading<unknown>;
  recovery_transaction: Reading<unknown>;
  stored: {
    mode: string | null;
    firmware_version: string | null;
    tool_version: string | null;
    deployed_version: string | null;
  };
  sources: Record<string, CheckSource>;
  error?: string;
}

export interface InventoryCheck {
  id: string;
  title: string;
  status: string;
  detail: string | null;
  next_step: string | null;
  error: string | null;
  classifiable: boolean | null;
  kind: string | null;
  permission_limited: boolean;
  reads: unknown;
  metrics: Record<string, unknown> | null;
}

export interface SubsystemGroup {
  subsystem: string;
  worst_status: string;
  tally: Record<string, number>;
  metrics_included: boolean;
  checks: InventoryCheck[];
}

export interface Inventory {
  subsystems: SubsystemGroup[];
  other: InventoryCheck[];
}

export interface ReportMeta {
  mode: string | null;
  privilege: string | null;
  invoked_as: string | null;
  collected_at: string | null;
  received_at: string | null;
  clock_synced: boolean | null;
  boot_id: string | null;
  uptime_s: number | null;
  tool_version: string | null;
  deployed_version: string | null;
  firmware_version: string | null;
  overall: DiagnosticStatus | null;
  tally: Record<string, number>;
  findings: DiagnosticFinding[];
  findings_total: number;
  check_count: number;
  elapsed_ms: number | null;
  schema_version: string | null;
  redaction: unknown;
  partial: boolean | null;
  blocked_read_attempts: number | null;
  evidence_included: boolean | null;
  diagnostic_freshness: "FRESH" | "STALE" | "NEVER_REPORTED";
  report_age_seconds: number | null;
  report_interval_seconds: number;
  fresh: boolean;
  document_present: boolean;
  model_reported: string | null;
}

export interface DeviceReportPanels {
  network: NetworkPanel;
  system: SystemPanel;
  storage: StoragePanel;
  power: PowerPanel;
  services: ServicesPanel;
  provenance: ProvenancePanel;
}

export interface DeviceReport {
  serial: string;
  device_key: string | null;
  reported_device_id: string | null;
  hostname: string | null;
  device_model: string | null;
  meta: ReportMeta;
  panels: DeviceReportPanels;
  inventory: Inventory;
  expectations?: unknown;
}

export interface RawDeviceReport {
  serial: string;
  received_at: string | null;
  evidence_included: boolean;
  evidence_stripped: boolean;
  document: Record<string, unknown> | null;
}
