import { create } from "zustand";
import { teacherService } from "../services/teacherService";
import { studentService } from "../services/studentService";
import type {
  TeacherOverview,
  TeacherStudent,
  TeacherChatSession,
  TeacherChatMessage,
} from "../types/teacher";

interface TeacherState {
  overview: TeacherOverview | null;
  students: TeacherStudent[];

  isFetchingOverview: boolean;
  isFetchingStudents: boolean;
  isInviting: boolean;
  approvingId: string | null;
  removingId: string | null;

  selectedStudent: TeacherStudent | null;
  chats: TeacherChatSession[];
  isFetchingChats: boolean;
  activeSessionId: string | null;
  chatMessages: TeacherChatMessage[];
  isFetchingMessages: boolean;

  fetchOverview: (teacherId: string) => Promise<void>;
  fetchStudents: (teacherId: string) => Promise<void>;
  invite: (teacherId: string, emailOrUsername: string, subject: string) => Promise<void>;
  approve: (teacherId: string, student: TeacherStudent) => Promise<{ ok: boolean; message?: string }>;
  remove: (teacherId: string, studentId: string) => Promise<void>;
  openChats: (teacherId: string, student: TeacherStudent) => Promise<void>;
  openSession: (teacherId: string, studentId: string, sessionId: string) => Promise<void>;
  clearChats: () => void;
}

export const useTeacherStore = create<TeacherState>((set, get) => ({
  overview: null,
  students: [],

  isFetchingOverview: false,
  isFetchingStudents: false,
  isInviting: false,
  approvingId: null,
  removingId: null,

  selectedStudent: null,
  chats: [],
  isFetchingChats: false,
  activeSessionId: null,
  chatMessages: [],
  isFetchingMessages: false,

  fetchOverview: async (teacherId) => {
    set({ isFetchingOverview: true });
    try {
      const overview = await teacherService.getOverview(teacherId);
      set({ overview });
    } catch (e) {
      console.error("fetchOverview:", e);
    } finally {
      set({ isFetchingOverview: false });
    }
  },

  fetchStudents: async (teacherId) => {
    set({ isFetchingStudents: true });
    try {
      const students = await teacherService.getStudents(teacherId);
      set({ students });
    } catch (e) {
      console.error("fetchStudents:", e);
    } finally {
      set({ isFetchingStudents: false });
    }
  },

  invite: async (teacherId, emailOrUsername, subject) => {
    set({ isInviting: true });
    try {
      await teacherService.inviteStudent(teacherId, {
        student_email_or_username: emailOrUsername,
        subject,
      });
      await get().fetchStudents(teacherId);
      await get().fetchOverview(teacherId);
    } finally {
      set({ isInviting: false });
    }
  },

  approve: async (teacherId, student) => {
    set({ approvingId: student.student_id });
    try {
      const updated = await teacherService.assignStudent(
        teacherId,
        student.student_id,
        student.subject ?? ""
      );
      set((s) => ({
        students: s.students.map((st) =>
          st.student_id === student.student_id
            ? { ...st, ...updated, status: "APPROVED" as const }
            : st
        ),
      }));
      await get().fetchOverview(teacherId);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "Approval failed." };
    } finally {
      set({ approvingId: null });
    }
  },

  remove: async (teacherId, studentId) => {
    set({ removingId: studentId });
    try {
      await teacherService.deleteStudent(teacherId, studentId);
      set((s) => ({ students: s.students.filter((st) => st.student_id !== studentId) }));
      await get().fetchOverview(teacherId);
    } finally {
      set({ removingId: null });
    }
  },

  openChats: async (teacherId, student) => {
    set({ selectedStudent: student, chats: [], isFetchingChats: true });
    try {
      const chats = await teacherService.getChats(teacherId, student.student_id);
      set({ chats });
    } finally {
      set({ isFetchingChats: false });
    }
  },

  openSession: async (_teacherId, studentId, sessionId) => {
    set({ activeSessionId: sessionId, chatMessages: [], isFetchingMessages: true });
    try {
      const res = await studentService.fetchChatHistory(studentId, sessionId);
      console.log("[teacherStore] openSession raw response:", JSON.stringify(res));

      // /get-history may return messages under different keys
      const rawMsgs: any[] =
        res?.messages ??
        (res as any)?.history ??
        (res as any)?.chat_history ??
        (Array.isArray(res) ? res : []);

      console.log("[teacherStore] rawMsgs count:", rawMsgs.length);

      const chatMessages = rawMsgs.map((m: any) => {
        // content can be a string, or an array of content blocks (Anthropic format)
        let content = m.content ?? m.text ?? m.message ?? m.body ?? "";
        if (Array.isArray(content)) {
          content = content
            .map((block: any) => block?.text ?? block?.content ?? "")
            .join("\n");
        }
        return {
          role: m.role ?? m.sender ?? m.type ?? "assistant",
          content: String(content),
          message_id: m.id ?? m.message_id,
        };
      });

      set({ chatMessages });
    } catch (e) {
      console.error("[teacherStore] openSession error:", e);
    } finally {
      set({ isFetchingMessages: false });
    }
  },

  clearChats: () =>
    set({ selectedStudent: null, chats: [], activeSessionId: null, chatMessages: [] }),
}));
