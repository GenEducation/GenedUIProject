import { create } from "zustand";
import {
  teacherService,
  TeacherOverview,
  TeacherStudent,
  TeacherRequest,
  ChatSession,
  ChatMessage,
} from "../services/teacherService";
import { ApiRequestError } from "@/utils/authFetch";
import * as Sentry from "@sentry/nextjs";
import type { SlotResponse } from "@/features/lab/types/lab";

export interface TeacherProfile {
  user_id: string;
  username: string;
  email: string;
  role: string;
  full_name: string;
  title: string;
  subjects: string[];
  partner_id?: string;
}

export type StatusFilter = "all" | "PENDING" | "APPROVED";
export type SortOption = "status" | "name" | "low";

interface TeacherState {
  teacherProfile: TeacherProfile | null;
  overview: TeacherOverview | null;
  students: TeacherStudent[];
  requests: TeacherRequest[];

  // filters
  statusFilter: StatusFilter;
  subjectFilter: string;
  search: string;
  sort: SortOption;

  // loading flags
  isFetchingOverview: boolean;
  isFetchingStudents: boolean;
  isFetchingRequests: boolean;
  isInviting: boolean;
  isRemoving: string | null; // student_id currently being removed
  approvingId: string | null; // student_id currently being approved

  // ---- Phase 2: individual student chat history & report ----
  view: "roster" | "chats" | "analytics" | "lab";
  selectedStudent: TeacherStudent | null;
  chats: ChatSession[];
  activeSessionId: string | null;
  chatMessages: ChatMessage[];
  isFetchingChats: boolean;
  isFetchingMessages: boolean;

  // ---- Lab Mode navigation ----
  activeSlot: SlotResponse | null;
  setView: (view: "roster" | "chats" | "analytics" | "lab") => void;
  setActiveSlot: (slot: SlotResponse | null) => void;

  // actions
  setTeacherProfile: (profile: TeacherProfile) => void;
  fetchOverview: () => Promise<void>;
  fetchStudents: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  setStatusFilter: (status: StatusFilter) => void;
  setSubjectFilter: (subject: string) => void;
  setSearch: (search: string) => void;
  setSort: (sort: SortOption) => void;
  invite: (studentEmailOrUsername: string, subject: string) => Promise<void>;
  approve: (studentId: string, subject: string) => Promise<{ ok: true } | { ok: false; message: string; code?: string }>;
  remove: (studentId: string) => Promise<void>;
  logoutTeacher: () => void;

  openReport: (student: TeacherStudent) => Promise<void>;
  openAnalytics: (student: TeacherStudent) => void;
  closeReport: () => void;
  openSession: (sessionId: string) => Promise<void>;
  closeSession: () => void;
}

export const useTeacherStore = create<TeacherState>((set, get) => ({
  teacherProfile: null,
  overview: null,
  students: [],
  requests: [],

  statusFilter: "all",
  subjectFilter: "all",
  search: "",
  sort: "status",

  isFetchingOverview: false,
  isFetchingStudents: false,
  isFetchingRequests: false,
  isInviting: false,
  isRemoving: null,
  approvingId: null,

  view: "roster",
  selectedStudent: null,
  chats: [],
  activeSessionId: null,
  chatMessages: [],
  isFetchingChats: false,
  isFetchingMessages: false,

  activeSlot: null,
  setView: (view) => set({ view }),
  setActiveSlot: (activeSlot) => set({ activeSlot }),

  setTeacherProfile: (profile) => set({ teacherProfile: profile }),

  fetchOverview: async () => {
    const { teacherProfile } = get();
    if (!teacherProfile) return;

    set({ isFetchingOverview: true });
    try {
      const overview = await teacherService.getOverview(teacherProfile.user_id);
      set({ overview });
    } catch (error) {
      console.error("Fetch Teacher Overview Error:", error);
    } finally {
      set({ isFetchingOverview: false });
    }
  },

  fetchStudents: async () => {
    const { teacherProfile } = get();
    if (!teacherProfile) return;

    set({ isFetchingStudents: true });
    try {
      const data = await teacherService.getStudents(teacherProfile.user_id);
      set({ students: data.students || [] });
    } catch (error) {
      console.error("Fetch Teacher Students Error:", error);
    } finally {
      set({ isFetchingStudents: false });
    }
  },

  fetchRequests: async () => {
    const { teacherProfile } = get();
    if (!teacherProfile) return;

    set({ isFetchingRequests: true });
    try {
      const requests = await teacherService.getRequests(teacherProfile.user_id);
      set({ requests });
    } catch (error) {
      console.error("Fetch Teacher Requests Error:", error);
    } finally {
      set({ isFetchingRequests: false });
    }
  },

  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSubjectFilter: (subjectFilter) => set({ subjectFilter }),
  setSearch: (search) => set({ search }),
  setSort: (sort) => set({ sort }),

  invite: async (studentEmailOrUsername, subject) => {
    const { teacherProfile } = get();
    if (!teacherProfile) return;

    set({ isInviting: true });
    try {
      await teacherService.inviteStudent(teacherProfile.user_id, {
        student_email_or_username: studentEmailOrUsername,
        subject,
      });
      await get().fetchStudents();
      await get().fetchOverview();
    } catch (error) {
      console.error("Invite Student Error:", error);
      throw error;
    } finally {
      set({ isInviting: false });
    }
  },

  approve: async (studentId, subject) => {
    const { teacherProfile, students } = get();
    if (!teacherProfile) return { ok: false, message: "Not signed in." };

    set({ approvingId: studentId });
    try {
      const updated = await teacherService.assignStudent(teacherProfile.user_id, studentId, {
        status: "APPROVED",
        subject,
      });

      const next = students.map((s) =>
        s.student_id === studentId ? { ...s, ...updated, status: "APPROVED" as const } : s,
      );
      set({ students: next });
      await get().fetchOverview();
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return { ok: false, message: error.message, code: error.error_code };
      }
      console.error("Approve Student Error:", error);
      return { ok: false, message: "Something went wrong. Please try again." };
    } finally {
      set({ approvingId: null });
    }
  },

  remove: async (studentId) => {
    const { teacherProfile, students } = get();
    if (!teacherProfile) return;

    set({ isRemoving: studentId });
    try {
      await teacherService.deleteStudent(teacherProfile.user_id, studentId);
      set({ students: students.filter((s) => s.student_id !== studentId) });
      await get().fetchOverview();
    } catch (error) {
      console.error("Remove Student Error:", error);
      throw error;
    } finally {
      set({ isRemoving: null });
    }
  },

  logoutTeacher: () => {
    Sentry.setUser(null);
    localStorage.removeItem("gened_user_role");
    localStorage.removeItem("gened_auth_token");
    localStorage.removeItem("gened_user_profile");
    set({
      teacherProfile: null,
      overview: null,
      students: [],
      requests: [],
      view: "roster",
      activeSlot: null,
    });
    window.location.href = "/";
  },

  openReport: async (student) => {
    const { teacherProfile } = get();
    if (!teacherProfile) return;

    set({
      view: "chats",
      selectedStudent: student,
      chats: [],
      activeSessionId: null,
      chatMessages: [],
      isFetchingChats: true,
    });

    try {
      const chats = await teacherService.getChats(teacherProfile.user_id, student.student_id);
      set({ chats });
    } catch (error) {
      console.error("Fetch Student Chats Error:", error);
    } finally {
      set({ isFetchingChats: false });
    }
  },

  openAnalytics: (student) => {
    set({ view: "analytics", selectedStudent: student });
  },

  closeReport: () => {
    set({
      view: "roster",
      selectedStudent: null,
      chats: [],
      activeSessionId: null,
      chatMessages: [],
    });
  },

  openSession: async (sessionId) => {
    const { teacherProfile, selectedStudent } = get();
    if (!teacherProfile || !selectedStudent) return;

    set({ activeSessionId: sessionId, chatMessages: [], isFetchingMessages: true });
    try {
      const messages = await teacherService.getChatMessages(
        teacherProfile.user_id,
        selectedStudent.student_id,
        sessionId,
      );
      set({ chatMessages: messages });
    } catch (error) {
      console.error("Fetch Chat Messages Error:", error);
    } finally {
      set({ isFetchingMessages: false });
    }
  },

  closeSession: () => set({ activeSessionId: null, chatMessages: [] }),
}));
