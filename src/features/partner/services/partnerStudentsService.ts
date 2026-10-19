import { authFetch } from "@/utils/authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export type MembershipStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
/** What a partner may set a membership to (`PATCH .../status`). */
export type PartnerDecision = "APPROVED" | "REJECTED" | "REVOKED";

/** A row of `GET /partner/students`: every student linked to the school, in any state. */
export interface PartnerStudentRow {
  id: string;
  username: string;
  grade: number | string;
  status: MembershipStatus;
}

/** The trailing counts row `GET /partner/students` appends (the MVP's shape, kept by the backend). */
export interface PartnerStudentsCounts {
  total_count: number;
  pending_count: number;
  approved_count: number;
}

/** A row of `GET /partner/requests`: the approval queue (PENDING only). */
export interface PartnerRequestRow {
  student_id: string;
  name: string;
  grade: number | string;
  status: "PENDING";
  link_origin: string | null;
  requested_teacher_id: string | null;
  requested_at: string;
}

/** `GET /partner/students/{id}`; the backend answers `null` when the student isn't this school's. */
export interface PartnerStudentProfile {
  id: string;
  username: string;
  email: string;
  age: number | string | null;
  grade: number | string;
  school_board: string | null;
  status: MembershipStatus;
  requested_at: string;
  updated_at?: string | null;
}

const isCounts = (row: PartnerStudentRow | PartnerStudentsCounts): row is PartnerStudentsCounts =>
  "pending_count" in row;

/**
 * A school's students (gened_schools routes). Every route needs the PARTNER
 * role and `partner_id` must be the caller's own id; the backend refuses any
 * other with a 403. `authFetch` throws `ApiRequestError` (carrying the
 * backend's `message`) on any non-OK response.
 */
export const partnerStudentsService = {
  /** The school's students and the counts row, split apart. */
  students: async (partnerId: string): Promise<{ rows: PartnerStudentRow[]; counts: PartnerStudentsCounts | null }> => {
    const response = await authFetch(`${API_BASE_URL}/partner/students?partner_id=${encodeURIComponent(partnerId)}`);
    const raw: Array<PartnerStudentRow | PartnerStudentsCounts> = await response.json();
    return {
      rows: raw.filter((row): row is PartnerStudentRow => !isCounts(row)),
      counts: raw.find(isCounts) ?? null,
    };
  },

  /** The approval queue: students waiting for this school to accept them. */
  requests: async (partnerId: string): Promise<PartnerRequestRow[]> => {
    const response = await authFetch(`${API_BASE_URL}/partner/requests?partner_id=${encodeURIComponent(partnerId)}`);
    return response.json();
  },

  profile: async (partnerId: string, studentId: string): Promise<PartnerStudentProfile | null> => {
    const response = await authFetch(
      `${API_BASE_URL}/partner/students/${encodeURIComponent(studentId)}?partner_id=${encodeURIComponent(partnerId)}`,
    );
    return response.json();
  },

  setStatus: async (partnerId: string, studentId: string, status: PartnerDecision): Promise<{ message: string }> => {
    const query = `partner_id=${encodeURIComponent(partnerId)}&status=${status}`;
    const response = await authFetch(`${API_BASE_URL}/partner/students/${encodeURIComponent(studentId)}/status?${query}`, {
      method: "PATCH",
    });
    return response.json();
  },

  remove: async (partnerId: string, studentId: string): Promise<{ message: string }> => {
    const response = await authFetch(
      `${API_BASE_URL}/partner/students/${encodeURIComponent(studentId)}?partner_id=${encodeURIComponent(partnerId)}`,
      { method: "DELETE" },
    );
    return response.json();
  },
};
