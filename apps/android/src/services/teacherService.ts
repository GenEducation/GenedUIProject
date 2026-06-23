/**
 * Teacher service — mobile equivalent of the web's teacherService.ts.
 * All calls go through authFetch which injects the Bearer token and
 * handles 401/403 session expiry.
 */
import { authFetch } from "./authFetch";
import type {
  TeacherOverview,
  TeacherStudent,
  TeacherChatSession,
  TeacherChatMessage,
  InvitePayload,
} from "../types/teacher";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

const json = { accept: "application/json" };

export const teacherService = {
  getOverview: async (teacherId: string): Promise<TeacherOverview> => {
    const res = await authFetch(
      `${BASE}/teacher/overview?teacher_id=${encodeURIComponent(teacherId)}`,
      { headers: json }
    );
    return res.json();
  },

  getStudents: async (teacherId: string): Promise<TeacherStudent[]> => {
    const res = await authFetch(
      `${BASE}/teacher/students?teacher_id=${encodeURIComponent(teacherId)}`,
      { headers: json }
    );
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return data?.students ?? [];
  },

  inviteStudent: async (teacherId: string, payload: InvitePayload): Promise<void> => {
    await authFetch(
      `${BASE}/teacher/students/invite?teacher_id=${encodeURIComponent(teacherId)}`,
      {
        method: "POST",
        headers: { ...json, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
  },

  assignStudent: async (
    teacherId: string,
    studentId: string,
    subject: string
  ): Promise<TeacherStudent> => {
    const res = await authFetch(
      `${BASE}/teacher/students/${encodeURIComponent(studentId)}/assign?teacher_id=${encodeURIComponent(teacherId)}`,
      {
        method: "PATCH",
        headers: { ...json, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED", subject }),
        // Approval can be legitimately blocked — opt out of default 403 redirect
        allow403: true,
      } as any
    );
    return res.json();
  },

  deleteStudent: async (teacherId: string, studentId: string): Promise<void> => {
    await authFetch(
      `${BASE}/teacher/students/${encodeURIComponent(studentId)}?teacher_id=${encodeURIComponent(teacherId)}`,
      { method: "DELETE", headers: json }
    );
  },

  getChats: async (teacherId: string, studentId: string): Promise<TeacherChatSession[]> => {
    try {
      const res = await authFetch(
        `${BASE}/teacher/students/${encodeURIComponent(studentId)}/chats?teacher_id=${encodeURIComponent(teacherId)}`,
        { headers: json }
      );
      const data = await res.json();
      return Array.isArray(data) ? data : data?.chats ?? data?.sessions ?? [];
    } catch {
      return [];
    }
  },

  getStudentReport: async (teacherId: string, studentId: string): Promise<unknown> => {
    const res = await authFetch(
      `${BASE}/teacher/students/${encodeURIComponent(studentId)}/report?teacher_id=${encodeURIComponent(teacherId)}`,
      { headers: json }
    );
    return res.json();
  },

  getChatMessages: async (
    teacherId: string,
    studentId: string,
    sessionId: string
  ): Promise<TeacherChatMessage[]> => {
    try {
      const res = await authFetch(
        `${BASE}/teacher/students/${encodeURIComponent(studentId)}/chats/${encodeURIComponent(sessionId)}?teacher_id=${encodeURIComponent(teacherId)}`,
        { headers: json }
      );
      const data = await res.json();
      console.log("[teacherService] getChatMessages raw:", JSON.stringify(data));
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.messages)) return data.messages;
      if (Array.isArray(data?.history)) return data.history;
      if (Array.isArray(data?.chat_history)) return data.chat_history;
      return [];
    } catch (e) {
      console.error("[teacherService] getChatMessages error:", e);
      return [];
    }
  },
};
