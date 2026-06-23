/** Types for the Partner (institution) portal. */

export interface PartnerStudent {
  id: string;
  name: string;
  grade: string;
  initials?: string;
  status: "APPROVED" | "PENDING";
}

export interface PartnerStudentDetail {
  id: string;
  name: string;
  username?: string;
  email?: string;
  grade: string | number;
  school_board?: string;
  status: "APPROVED" | "PENDING";
  enrolled_subjects?: string[];
}

export interface EnrollmentStats {
  total: number;
  approved: number;
  pending: number;
}

/** Normalised status shown in the UI (mapped from raw API values). */
export type IngestionStatus = "active" | "in-progress" | "failed";

/** Normalise raw backend status string to UI status. */
export function normaliseIngestionStatus(raw: string): IngestionStatus {
  switch (raw?.toLowerCase()) {
    case "completed": return "active";
    case "queued":
    case "processing":
    case "finalizing": return "in-progress";
    case "failed":     return "failed";
    default:           return "in-progress";
  }
}

export interface SubjectRegistryItem {
  id: string;               // ingestion_batch_id
  document_title: string;
  subject: string;
  grade: string | number;
  status: IngestionStatus;
  chapters_detected?: number;
  chapter_titles?: string[];
}

export interface IngestionUploadForm {
  subject: string;
  document_title: string;
  agent_name: string;
  grade: string;
  board: string;
  document_type: string;   // always "chapter"
}

export interface IngestionItem {
  batch_id?: string;
  document_title: string;
  subject?: string;
  grade?: string | number;
  status: string;
  created_at?: string;
}
