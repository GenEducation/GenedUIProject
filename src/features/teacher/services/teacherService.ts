import { authFetch } from "@/utils/authFetch";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is required. Set it in your .env.local file.");
}

export type LinkStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TeacherOverview {
  total_students: number;
  pending: number;
  approved: number;
  [key: string]: any;
}

export interface TeacherStudent {
  student_id: string;
  teacher_id?: string;
  status: LinkStatus;
  subject?: string;
  name?: string;
  username?: string;
  email?: string;
  grade?: number;
  requested_at?: string;
  [key: string]: any;
}

export interface TeacherStudentsResponse {
  students: TeacherStudent[];
  total_count?: number;
  pending_count?: number;
  approved_count?: number;
  [key: string]: any;
}

export interface TeacherRequest {
  student_id: string;
  subject?: string;
  status?: LinkStatus;
  requested_at?: string;
  [key: string]: any;
}

export interface InvitePayload {
  student_email_or_username: string;
  subject: string;
}

export interface InviteResponse {
  teacher_id: string;
  student_id: string;
  status: LinkStatus;
  subject: string;
  requested_at: string;
  [key: string]: any;
}

export interface AssignPayload {
  status: "APPROVED";
  subject: string;
}

// ---------------------------------------------------------------------
// Phase 2 — individual student chat transcripts.
// Real schemas are unconfirmed; types are intentionally permissive
// (best-guess fields + index signature) so the UI can render whatever
// the backend sends without crashing, and degrade gracefully otherwise.
// ---------------------------------------------------------------------

export interface ChatSession {
  session_id: string;
  title?: string;
  subject?: string;
  last_active?: string;
  updated_at?: string;
  message_count?: number;
  [key: string]: any;
}

export interface ChatMessage {
  message_id?: string;
  role?: string;
  content?: string;
  meta_data?: Record<string, any>;
  [key: string]: any;
}

const jsonHeaders = { accept: "application/json" };

export const teacherService = {
  getOverview: async (teacherId: string): Promise<TeacherOverview> => {
    const response = await authFetch(
      `${BASE_URL}/teacher/overview?teacher_id=${encodeURIComponent(teacherId)}`,
      { headers: jsonHeaders },
    );
    return response.json();
  },

  getStudents: async (teacherId: string): Promise<TeacherStudentsResponse> => {
    const response = await authFetch(
      `${BASE_URL}/teacher/students?teacher_id=${encodeURIComponent(teacherId)}`,
      { headers: jsonHeaders },
    );
    const data = await response.json();
    // Defensive: API may return a bare array instead of the documented envelope.
    if (Array.isArray(data)) {
      return {
        students: data,
        total_count: data.length,
        pending_count: data.filter((s: TeacherStudent) => s.status === "PENDING").length,
        approved_count: data.filter((s: TeacherStudent) => s.status === "APPROVED").length,
      };
    }
    return {
      students: data.students || [],
      total_count: data.total_count,
      pending_count: data.pending_count,
      approved_count: data.approved_count,
    };
  },

  getRequests: async (teacherId: string): Promise<TeacherRequest[]> => {
    try {
      const response = await authFetch(
        `${BASE_URL}/teacher/requests?teacher_id=${encodeURIComponent(teacherId)}`,
        { headers: jsonHeaders },
      );
      const data = await response.json();
      return Array.isArray(data) ? data : data.requests || [];
    } catch (error) {
      console.error("Fetch Teacher Requests Error:", error);
      return [];
    }
  },

  inviteStudent: async (teacherId: string, payload: InvitePayload): Promise<InviteResponse> => {
    const response = await authFetch(
      `${BASE_URL}/teacher/students/invite?teacher_id=${encodeURIComponent(teacherId)}`,
      {
        method: "POST",
        headers: { ...jsonHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    return response.json();
  },

  assignStudent: async (
    teacherId: string,
    studentId: string,
    payload: AssignPayload,
  ): Promise<TeacherStudent> => {
    const response = await authFetch(
      `${BASE_URL}/teacher/students/${encodeURIComponent(studentId)}/assign?teacher_id=${encodeURIComponent(teacherId)}`,
      {
        method: "PATCH",
        headers: { ...jsonHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // Approval can be legitimately blocked (TCHR_1104) — an expected 403,
        // not a sign-out. Opt out of authFetch's default 403 → clear-session +
        // redirect so the store catches the ApiRequestError and shows a toast.
        allow403: true,
      },
    );
    return response.json();
  },

  deleteStudent: async (teacherId: string, studentId: string): Promise<void> => {
    await authFetch(
      `${BASE_URL}/teacher/students/${encodeURIComponent(studentId)}?teacher_id=${encodeURIComponent(teacherId)}`,
      {
        method: "DELETE",
        headers: jsonHeaders,
      },
    );
  },

  // ---------------------------------------------------------------------
  // Phase 2 — individual student chat transcripts.
  // Gracefully degrade (return []) on 404 / error so the chat list can
  // render an empty state instead of surfacing a console error overlay.
  // ---------------------------------------------------------------------

  getChats: async (teacherId: string, studentId: string): Promise<ChatSession[]> => {
    try {
      const response = await authFetch(
        `${BASE_URL}/teacher/students/${encodeURIComponent(studentId)}/chats?teacher_id=${encodeURIComponent(teacherId)}`,
        { headers: jsonHeaders },
      );
      const data = await response.json();
      return Array.isArray(data) ? data : data?.chats || data?.sessions || [];
    } catch (error) {
      console.warn("Fetch Student Chats:", error);
      return [];
    }
  },

  getChatMessages: async (teacherId: string, studentId: string, sessionId: string): Promise<ChatMessage[]> => {
    try {
      const response = await authFetch(
        `${BASE_URL}/teacher/students/${encodeURIComponent(studentId)}/chats/${encodeURIComponent(sessionId)}?teacher_id=${encodeURIComponent(teacherId)}`,
        { headers: jsonHeaders },
      );
      const data = await response.json();
      return Array.isArray(data) ? data : data?.messages || [];
    } catch (error) {
      console.warn("Fetch Chat Messages:", error);
      return [];
    }
  },
};
