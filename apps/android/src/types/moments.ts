/** Moments (wake-up alarms) types — mirrors src/features/parent/types/moments.ts. */

export interface Moment {
  id: string;
  student_id: string;
  kind: string;
  purpose: string;
  scheduled_time: string; // "HH:MM" IST
  scheduled_date: string | null; // null = recurs daily; "YYYY-MM-DD" = one-shot
  enabled: boolean;
}

export interface CreateMomentRequest {
  user_id: string;
  purpose: string;
  scheduled_time: string; // "HH:MM" IST
  kind?: string; // default "wakeup"
  scheduled_date?: string | null;
  enabled?: boolean;
}

export interface UpdateMomentRequest {
  scheduled_time?: string;
  purpose?: string;
  kind?: string;
  scheduled_date?: string | null;
  enabled?: boolean;
}
