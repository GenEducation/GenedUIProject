import { authFetch } from "@/utils/authFetch";
import { FEATURES } from "@/constants/features";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is required. Set it in your .env.local file.");
}

export interface LinkedStudent {
  student_id: string;
  parent_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requested_at: string;
  name?: string;
}

/** A guardian invitation the parent opened from their email (`GET /parent/verify-token`). */
export interface GuardianInvitationToken {
  parent_email: string;
  student_username: string;
  student_id: string;
}

/**
 * A student who named and verified this parent's email (`GET /parent/guardian/invitations`).
 * `other_guardian`: the student is already connected to another account, which this one cannot replace.
 */
export interface GuardianInvitation {
  student_id: string;
  student_name: string;
  state: "awaiting_confirmation" | "confirmed" | "declined" | "other_guardian";
}

export interface StudyTimePoint {
  period: string;
  total_minutes: number;
}

export interface ChapterStudyTime {
  subject: string;
  chapter_name: string;
  total_minutes: number;
  session_count: number;
}

interface SessionRow {
  created_at?: string;
  updated_at?: string;
}

/**
 * GET that resolves to the parsed body, or null on any failure. Used for the
 * Home page's supporting data: a missing or forbidden figure shows as
 * unavailable rather than breaking the page or logging the parent out.
 */
async function getJson(path: string): Promise<unknown> {
  try {
    const response = await authFetch(`${BASE_URL}${path}`, {
      headers: { "accept": "application/json" },
      allow403: true,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * A child's session list, or null when it can't be read.
 * @deprecated `/get-session` is not served by the new backend (404 → null, so
 * activity badges simply don't show). Needs a replacement source from the
 * lesson routes before the parent home redesign.
 */
async function fetchSessionRows(studentId: string): Promise<SessionRow[] | null> {
  try {
    const response = await authFetch(`${BASE_URL}/get-session`, {
      method: "POST",
      headers: { "accept": "application/json" },
      body: JSON.stringify({ user_id: studentId }),
      allow403: true,
    });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data?.sessions) ? data.sessions : [];
  } catch {
    return null;
  }
}

export const parentService = {
  fetchLinkedStudents: async (parentId: string): Promise<LinkedStudent[]> => {
    const response = await authFetch(`${BASE_URL}/parent/students?parent_id=${encodeURIComponent(parentId)}`, {
      headers: { "accept": "application/json" }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch linked students: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Grade shown under a child's name on the portal's student picker. Resolves
   * to null rather than throwing: the grade is decorative, so a missing or
   * forbidden profile must never block (or log out) the parent.
   */
  fetchStudentGrade: async (studentId: string): Promise<number | null> => {
    try {
      const response = await authFetch(`${BASE_URL}/students/${encodeURIComponent(studentId)}/profile`, {
        headers: { "accept": "application/json" },
        allow403: true,
      });
      if (!response.ok) return null;
      const profile = await response.json();
      const grade = Number(profile?.grade);
      return Number.isInteger(grade) && grade > 0 ? grade : null;
    } catch {
      return null;
    }
  },

  /**
   * When a child last did anything (their most recently updated session), for
   * the "new activity" dot on the parent's student switcher. Resolves to null
   * when unknown; like the grade, it's a hint that must never block the page.
   */
  fetchLatestActivity: async (studentId: string): Promise<string | null> => {
    const sessions = await fetchSessionRows(studentId);
    let latest = 0;
    for (const session of sessions ?? []) {
      const at = Date.parse(session?.updated_at || session?.created_at || "");
      if (at > latest) latest = at;
    }
    return latest ? new Date(latest).toISOString() : null;
  },

  /** When each of a child's sessions started (ISO strings); null when unknown. */
  fetchSessionDates: async (studentId: string): Promise<string[] | null> => {
    const sessions = await fetchSessionRows(studentId);
    if (!sessions) return null;
    return sessions
      .map((session) => session?.created_at)
      .filter((at): at is string => typeof at === "string" && !Number.isNaN(Date.parse(at)));
  },

  /**
   * Study minutes per day/week/month for a child, oldest first:
   * `[{ period: "2026-09-19", total_minutes: 72 }, …]`. Null when unknown.
   */
  fetchTimeByPeriod: async (
    studentId: string,
    granularity: "day" | "week" | "month" = "day",
  ): Promise<StudyTimePoint[] | null> => {
    const rows = await getJson(`/students/${encodeURIComponent(studentId)}/time/by-period?granularity=${granularity}`);
    if (!Array.isArray(rows)) return null;
    return rows
      .filter((r) => typeof r?.period === "string")
      .map((r) => ({ period: r.period as string, total_minutes: Number(r.total_minutes) || 0 }))
      .sort((a, b) => a.period.localeCompare(b.period));
  },

  /** Study minutes per chapter for a child, across subjects. Null when unknown. */
  fetchTimeByChapter: async (studentId: string): Promise<ChapterStudyTime[] | null> => {
    if (!FEATURES.chapterTime) return [];
    const rows = await getJson(`/students/${encodeURIComponent(studentId)}/time/by-chapter`);
    if (!Array.isArray(rows)) return null;
    return rows.map((r) => ({
      subject: typeof r?.subject === "string" ? r.subject : "",
      chapter_name: typeof r?.chapter_name === "string" ? r.chapter_name : "",
      total_minutes: Number(r?.total_minutes) || 0,
      session_count: Number(r?.session_count) || 0,
    }));
  },

  linkStudent: async (parentId: string, studentId: string): Promise<LinkedStudent> => {
    const response = await authFetch(`${BASE_URL}/parent/link`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "accept": "application/json" 
      },
      body: JSON.stringify({
        parent_id: parentId,
        student_id: studentId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to link student: ${response.status}`);
    }

    return response.json();
  },

  updateStudentStatus: async (parentId: string, studentId: string, status: "APPROVED" | "REJECTED"): Promise<LinkedStudent> => {
    const response = await authFetch(`${BASE_URL}/parent/link/${studentId}/status?parent_id=${encodeURIComponent(parentId)}`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "accept": "application/json" 
      },
      // Approving is the parent's explicit confirmation that they are this child's parent or guardian; the
      // backend refuses an approval without it.
      body: JSON.stringify(status === "APPROVED" ? { status, guardian_confirmed: true } : { status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update student status: ${response.status}`);
    }

    return response.json();
  },

  /** Checks the emailed invitation link. Public: the token is the whole authorization for reading it. */
  verifyInvitation: async (studentId: string, token: string): Promise<GuardianInvitationToken> => {
    const query = `student_id=${encodeURIComponent(studentId)}&token=${encodeURIComponent(token)}`;
    const response = await fetch(`${BASE_URL}/parent/verify-token?${query}`, { headers: { accept: "application/json" } });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "This invitation link is no longer valid.");
    }
    return response.json();
  },

  /**
   * The parent's explicit "I am this child's parent or guardian", from the invitation link. The backend also needs
   * the signed-in account's email to be the address the invitation was sent to.
   */
  confirmInvitation: async (parentId: string, studentId: string, token: string): Promise<LinkedStudent> => {
    const response = await authFetch(`${BASE_URL}/parent/confirm-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ student_id: studentId, parent_id: parentId, token, guardian_confirmed: true }),
      allow403: true, // a wrong account is the backend's 403, shown on the screen, not a sign-out
    });
    return response.json();
  },

  /** Students who named and verified this parent's email; also links them (PENDING) on the server. */
  fetchGuardianInvitations: async (parentId: string): Promise<GuardianInvitation[]> => {
    try {
      const response = await authFetch(
        `${BASE_URL}/parent/guardian/invitations?parent_id=${encodeURIComponent(parentId)}`,
        { headers: { accept: "application/json" }, allow403: true },
      );
      const found = await response.json();
      return Array.isArray(found) ? found : [];
    } catch {
      return []; // a hint for the parent, never worth breaking the portal over
    }
  },

  unlinkStudent: async (parentId: string, studentId: string): Promise<void> => {
    const response = await authFetch(`${BASE_URL}/parent/link/${studentId}?parent_id=${encodeURIComponent(parentId)}`, {
      method: "DELETE",
      headers: { "accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Failed to unlink student: ${response.status}`);
    }
  },
};
