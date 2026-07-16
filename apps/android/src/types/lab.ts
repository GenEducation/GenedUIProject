// School Lab Mode — types mirrored from the web app's src/features/lab/types/lab.ts.

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
  { value: "REVISION", label: "Revision" },
  { value: "DOUBT_SOLVING", label: "Doubt Solving" },
  { value: "AI_EXPLORATION", label: "AI Exploration" },
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

export interface DeviceResponse {
  id: string;
  partner_id: string;
  lab_id: string;
  device_label: string;
  hardware_id: string;
  health_status: LabDeviceHealth;
  last_heartbeat_at: string | null;
  firmware_version?: string | null;
  is_spare: boolean;
  revoked_at: string | null;
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
  sessions: SessionResponse[];
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

// -- Realtime board deltas -----------------------------------------------------

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
