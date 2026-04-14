import { create } from "zustand";
import { parentService, LinkedStudent } from "../services/parentService";
import { studentService } from "../../student/services/studentService";

interface ParentProfile {
  user_id: string;
  username: string;
  email: string;
  role: string;
}

interface ParentState {
  parentProfile: ParentProfile | null;
  linkedStudents: LinkedStudent[];
  activeDashboardView: "analytics" | "chat";
  selectedStudentSessions: any[];
  activeSessionId: string | null;
  activeSessionHistory: any[];
  isFetchingSessions: boolean;
  isFetchingHistory: boolean;
  
  // Actions
  setParentProfile: (profile: ParentProfile) => void;
  fetchLinkedStudents: () => Promise<void>;
  setSelectedStudentId: (id: string | null) => void;
  setDashboardView: (view: "analytics" | "chat") => void;
  setActiveSessionId: (id: string | null) => void;
  fetchStudentSessions: (studentId: string) => Promise<void>;
  fetchSessionHistory: (studentId: string, sessionId: string) => Promise<void>;
  linkNewStudent: (studentId: string) => Promise<void>;
  updateStudentStatus: (studentId: string, status: "APPROVED" | "REJECTED") => Promise<void>;
}

export const useParentStore = create<ParentState>((set, get) => ({
  parentProfile: null,
  linkedStudents: [],
  selectedStudentId: null,
  isFetchingStudents: false,
  activeDashboardView: "analytics",
  selectedStudentSessions: [],
  activeSessionId: null,
  activeSessionHistory: [],
  isFetchingSessions: false,
  isFetchingHistory: false,

  setParentProfile: (profile) => set({ parentProfile: profile }),

  fetchLinkedStudents: async () => {
    const { parentProfile } = get();
    if (!parentProfile) return;

    set({ isFetchingStudents: true });
    try {
      const students = await parentService.fetchLinkedStudents(parentProfile.user_id);
      set({ linkedStudents: students });
      
      // Auto-select first approved student if none selected
      if (students.length > 0 && !get().selectedStudentId) {
        const firstApproved = students.find(s => s.status === "APPROVED");
        if (firstApproved) {
          set({ selectedStudentId: firstApproved.student_id });
        }
      }
    } catch (error) {
      console.error("Fetch Linked Students Error:", error);
    } finally {
      set({ isFetchingStudents: false });
    }
  },

  setSelectedStudentId: (id) => set({ 
    selectedStudentId: id,
    activeDashboardView: "analytics", // Reset to analytics when switching students
    selectedStudentSessions: [],
    activeSessionId: null,
    activeSessionHistory: []
  }),

  setDashboardView: (view) => set({ activeDashboardView: view }),

  setActiveSessionId: (id) => set({ activeSessionId: id }),

  fetchStudentSessions: async (studentId) => {
    set({ isFetchingSessions: true });
    try {
      const data = await studentService.fetchSessions(studentId);
      set({ selectedStudentSessions: data.sessions || [] });
    } catch (error) {
      console.error("Fetch Student Sessions Error:", error);
    } finally {
      set({ isFetchingSessions: false });
    }
  },

  fetchSessionHistory: async (studentId, sessionId) => {
    set({ isFetchingHistory: true });
    try {
      const data = await studentService.fetchChatHistory(studentId, sessionId);
      set({ activeSessionHistory: data.history || [] });
    } catch (error) {
      console.error("Fetch Session History Error:", error);
    } finally {
      set({ isFetchingHistory: false });
    }
  },

  linkNewStudent: async (studentId) => {
    const { parentProfile } = get();
    if (!parentProfile) return;

    try {
      await parentService.linkStudent(parentProfile.user_id, studentId);
      await get().fetchLinkedStudents();
    } catch (error) {
      console.error("Link Student Error:", error);
      throw error;
    }
  },

  updateStudentStatus: async (studentId: string, status: "APPROVED" | "REJECTED") => {
    const { parentProfile, linkedStudents } = get();
    if (!parentProfile) return;

    try {
      await parentService.updateStudentStatus(parentProfile.user_id, studentId, status);
      
      // Update local state
      const updatedStudents = linkedStudents.map(s => 
        s.student_id === studentId ? { ...s, status } : s
      );
      set({ linkedStudents: updatedStudents });
      
      // If approved and no student selected, select it
      if (status === "APPROVED" && !get().selectedStudentId) {
        set({ selectedStudentId: studentId });
      }
    } catch (error) {
      console.error("Update Student Status Error:", error);
      throw error;
    }
  },
}));
