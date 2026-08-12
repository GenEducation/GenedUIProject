// School Lab Mode — types mirrored from SCHOOL_LAB_MODE_WEB_FRONTEND_SPEC.md §4/§6.

/** ENGLISH_ORAL and MATH_INTERACTIVE are not valid yet (deferred to v1.1) — never send them. */
export type ObjectiveMode =
  | "CHAPTER_PRACTICE"
  | "GAP_RECOVERY"
  | "REVISION"
  | "DOUBT_SOLVING"
  | "AI_EXPLORATION"
  | "SYSTEM_RECOMMENDED";

export const OBJECTIVE_MODES: { value: ObjectiveMode; label: string }[] = [
  { value: "CHAPTER_PRACTICE", label: "Chapter Practice" },
  { value: "GAP_RECOVERY", label: "Gap Recovery" },
  // Hidden until the backend implements distinct behavior. Today REVISION and
  // AI_EXPLORATION have no dedicated device-graph logic — they silently run as
  // plain Chapter Practice — so we don't offer them in the scheduler yet.
  // (Backend enum still accepts them; re-enable here once implemented.)
  // { value: "REVISION", label: "Revision" },
  { value: "DOUBT_SOLVING", label: "Doubt Solving" },
  // { value: "AI_EXPLORATION", label: "AI Exploration" },
  { value: "SYSTEM_RECOMMENDED", label: "System Recommended" },
];

export type LabSlotStatus = "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type LabSessionState =
  | "IDLE"
  | "ASSIGNED"
  | "CONFIRMED"
  | "ACTIVE"
  | "SUSPENDED"
  | "COMPLETED"
  | "REASSIGNED"
  | "INCOMPLETE"
  | "ABSENT";

export type LabDeviceHealth = "ONLINE" | "OFFLINE" | "NEEDS_ATTENTION";
export type LabDevicePairingStatus =
  | "PENDING"
  | "APPROVED"
  | "CONNECTED"
  | "EXPIRED"
  | "CANCELLED";

export type EndReason =
  | "completed"
  | "teacher_end"
  | "absent"
  | "time_up"
  | "early_exit"
  | "inactivity"
  | "never_served"
  | "never_confirmed"
  | "period_end"
  | "study_start_failed";

export type ReportStatus = "completed" | "incomplete" | "absent" | "not_served";

// -- Labs ---------------------------------------------------------------

export interface LabResponse {
  id: string;
  partner_id: string;
  name: string;
  location?: string | null;
  default_session_seconds: number;
  allow_companion_in_lab: boolean;
  timezone: string;
  device_count: number;
}

export interface CreateLabRequest {
  partner_id: string;
  name: string;
  location?: string;
  default_session_seconds?: number;
  allow_companion_in_lab?: boolean;
  timezone?: string;
}

export interface LabUpdateRequest {
  name?: string;
  location?: string;
  default_session_seconds?: number;
  allow_companion_in_lab?: boolean;
  timezone?: string;
}

// -- Devices --------------------------------------------------------------

/**
 * Normalized subsystem verdict. The wire format sends free-form strings, so
 * always funnel them through `normalizeStatus` in `../utils/deviceHealth`
 * rather than casting — field firmware ships new vocabulary without us.
 */
export type HealthComponentStatus = "ok" | "warn" | "fail" | "unknown";

/** Arbitrary per-subsystem metric. Scalars, or one level of nesting (e.g. `mixer`). */
export type HealthMetricValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

export interface DeviceHealthComponent {
  /** Deliberately not narrowed — normalize at read time. */
  status: string;
  detail?: string | null;
  metrics?: Record<string, HealthMetricValue> | null;
}

/**
 * The device's last self-test, verbatim from the gateway. Every field is
 * optional: this is produced by firmware in the field that versions
 * independently of the portal.
 */
export interface DeviceHealthReport {
  type?: string;
  status?: string;
  /** "periodic" | "boot" | "manual" | future values. */
  trigger?: string;
  /** "SCHOOL_LAB" | future values. */
  mode?: string;
  checked_at?: string;
  uptime_s?: number;
  device_id?: string;
  serial?: string;
  ip?: string;
  firmware_version?: string;
  schema_version?: number;
  failed?: string[];
  components?: Record<string, DeviceHealthComponent>;
  /** Forward-compat: the server may add fields ahead of the client. */
  [key: string]: unknown;
}

export interface DeviceResponse {
  id: string;
  partner_id: string;
  lab_id: string;
  device_label: string;
  hardware_id: string;
  health_status: LabDeviceHealth;
  last_heartbeat_at: string | null;
  device_model?: string | null;
  firmware_version?: string | null;
  provisioned_at?: string | null;
  first_connected_at?: string | null;
  last_connected_at?: string | null;
  provisioning_source?: "MANUAL" | "PAIRING";
  is_spare: boolean;
  revoked_at: string | null;
  /** Last self-test the device reported about itself. Null until it first reports. */
  last_health_report?: DeviceHealthReport | null;
  last_health_at?: string | null;
  last_ip?: string | null;
}

export interface DeviceProvisionResponse {
  device: DeviceResponse;
  /** Shown once. Never returned again. */
  device_token: string;
}

export interface RegisterDeviceRequest {
  lab_id: string;
  device_label: string;
  hardware_id: string;
  is_spare?: boolean;
  firmware_version?: string;
}

export interface DeviceUpdateRequest {
  device_label?: string;
  is_spare?: boolean;
  firmware_version?: string;
  health_status?: LabDeviceHealth;
}

export interface ConfirmLabDevicePairingRequest {
  lab_id: string;
  user_code: string;
  device_label: string;
  is_spare?: boolean;
  existing_device_id?: string | null;
}

export interface LabDevicePairingRecord {
  id: string;
  status: LabDevicePairingStatus;
  hardware_id: string;
  device_model?: string | null;
  firmware_version?: string | null;
  expires_at: string;
  approved_at?: string | null;
  connected_at?: string | null;
  cancelled_at?: string | null;
  partner_id?: string | null;
  lab_id?: string | null;
  lab_device_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConfirmLabDevicePairingResponse {
  status: LabDevicePairingStatus;
  pairing_id: string;
  device: DeviceResponse;
}

export interface MoveDeviceRequest {
  target_lab_id: string;
}

// -- Teaching catalog (deterministic dropdown source) -----------------------

export interface CatalogChapter {
  subject: string;
  grade: number;
  /** The RAG / GAP_RECOVERY anchor. Picked, never free-typed. */
  document_title: string;
}

/** A class (grade + section) that has an imported roster — picked as one unit. */
export interface CatalogClass {
  grade: number;
  section: string;
}

export interface CatalogResponse {
  subjects: string[];
  chapters: CatalogChapter[];
  classes: CatalogClass[];
}

// -- Slots ------------------------------------------------------------------

export interface SlotResponse {
  id: string;
  partner_id: string;
  lab_id: string;
  teacher_id: string;
  grade: number;
  section: string;
  subject: string;
  objective_mode: ObjectiveMode;
  topic?: string | null;
  document_title?: string | null;
  chapter?: string | null;
  skill_focus?: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  session_seconds: number;
  status: LabSlotStatus;
  auto_allocated: boolean;
  board_version: number;
}

export interface CreateSlotRequest {
  lab_id: string;
  teacher_id?: string;
  grade: number;
  section: string;
  subject: string;
  objective_mode: ObjectiveMode;
  topic?: string;
  document_title?: string;
  chapter?: string;
  skill_focus?: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  session_seconds?: number;
}

export interface SlotUpdateRequest {
  teacher_id?: string;
  subject?: string;
  objective_mode?: ObjectiveMode;
  topic?: string;
  document_title?: string;
  chapter?: string;
  skill_focus?: string;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  session_seconds?: number;
}

export interface ActivateResponse {
  slot_id: string;
  assigned: number;
  idle: number;
  capacity_reserved: number;
  capacity_limit: number;
  sessions: SessionResponse[];
}

export interface RosterStudent {
  student_id: string;
  name: string;
}

export interface SeatAssignment {
  student_id: string;
  device_id: string;
}

export interface LabCapacityResponse {
  slot_id: string;
  limit: number;
  required: number;
  active: number;
  lab_active: number;
  reserved: number;
  available: number;
  can_start: boolean;
  // Device-pool preflight: desks online vs the class roster, plus spares held in reserve.
  roster: number;
  healthy_devices: number;
  spare: number;
}

// -- Sessions / board -------------------------------------------------------

export interface SessionResponse {
  id: string;
  slot_id: string;
  student_id: string;
  device_id?: string | null;
  state: LabSessionState;
  end_reason?: EndReason | null;
  reassigned_from_session_id?: string | null;
  chat_session_id?: string | null;
  [key: string]: unknown;
}

export interface BoardDevice {
  device_id: string;
  device_label: string;
  health_status: LabDeviceHealth;
  is_spare: boolean;
  session_id: string | null;
  student_id: string | null;
  student_name: string | null;
  roll_no: number | null;
  state: LabSessionState | null;
}

export interface BoardStudent {
  student_id: string;
  student_name: string;
  roll_no: number;
  state: LabSessionState;
  session_id: string;
  device_id: string | null;
  device_label: string | null;
  end_reason: EndReason | null;
}

export interface BoardResponse {
  slot: SlotResponse;
  devices: BoardDevice[];
  students: BoardStudent[];
}

// -- Report -------------------------------------------------------------------

export interface ClassReportCounts {
  total: number;
  attended: number;
  completed: number;
  incomplete: number;
  absent: number;
  not_served: number;
}

export interface ClassReportStudent {
  student_id: string;
  student_name: string;
  roll_no: number;
  status: ReportStatus;
  attended: boolean;
  completed: boolean;
  subject: string;
  topic?: string | null;
  document_title?: string | null;
  device_label?: string | null;
  end_reason: EndReason | null;
}

export interface CommonGap {
  document_title: string;
  avg_mastery: number;
  students: number;
}

export interface ClassReportResponse {
  slot: SlotResponse;
  counts: ClassReportCounts;
  students: ClassReportStudent[];
  common_gaps: CommonGap[];
  interventions: ClassReportStudent[];
  allow_transcript_access: boolean;
}

// -- Realtime board deltas (§7) ------------------------------------------------

export type LabBoardEventType =
  | "period_started"
  | "assigned"
  | "confirmed"
  | "active"
  | "suspended"
  | "resumed"
  | "reassigned"
  | "bound"
  | "rejected"
  | "absent"
  | "session_ended"
  | "completed"
  | "swapped"
  | "period_ended";

export interface LabBoardDelta {
  slot_id: string;
  event: LabBoardEventType;
  session_id?: string;
}
