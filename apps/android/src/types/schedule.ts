/** Scheduler types — mirrors src/features/student/types/schedule.ts. */

export type SessionType = "TEST" | "LEARNING";

/** content-prep lifecycle (nightly job) */
export type PreparationStatus = "PENDING" | "COMPLETED" | "FAILED";

/** session-open lifecycle (driven by the student opening it) */
export type SessionStatus = "PENDING" | "STARTED" | "STARTED-EARLY" | "COMPLETED";

export interface ScheduleSessionRequest {
  user_id: string;
  session_type: SessionType;
  subject: string;
  topic?: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time?: string; // "HH:MM" IST, optional
}

export interface ScheduleSessionResponse {
  id: string;
  student_id: string;
  user_id?: string; // legacy alias
  session_type: SessionType;
  subject: string;
  topic: string | null;
  scheduled_date: string;
  scheduled_time: string | null; // "HH:MM" IST
  preparation_status: PreparationStatus;
  status: SessionStatus;
  session_id: string | null;
  created_at?: string;
}
