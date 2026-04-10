import { create } from "zustand";

export interface Student {
  id: string;
  name: string;       // mapped from API `username`
  grade: string;
  initials?: string;
  status: "APPROVED" | "PENDING";
}

export interface Subject {
  id: string;        // Mapped from backend 'agent_id'
  subject: string;   // Mapped from backend 'subject'
  agent: string;     // Mapped from backend 'name'
  grade: string | number;
  board?: string;
  status: "active" | "in-progress" | "failed";
  chapters?: number;
}

interface PartnerState {
  // --- Analytics Data ---
  students: Student[];
  pendingRequests: Student[];
  numberOfPendingRequests: number;
  totalEnrollments: number;
  selectedStudent: Student | null;

  // --- Subject Data ---
  subjects: Subject[];

  // --- UI State ---
  isLoading: boolean;

  // --- Actions ---
  // Analytics Actions
  setSelectedStudent: (student: Student | null) => void;
  fetchStudents: () => Promise<void>;
  approveRequest: (studentId: string) => Promise<void>;
  rejectRequest: (studentId: string) => Promise<void>;

  // Subject Actions
  fetchSubjects: () => Promise<void>;
  addSubject: (subject: Subject) => void;
  uploadCurriculum: (file: File, subjectName: string, grade: string, board: string) => Promise<void>;
  removeSubject: (agentId: string) => Promise<void>;
  removeStudent: (studentId: string) => Promise<void>;

  // Auth/Logout Action
  logoutPartner: () => void;
}



const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const getBaseUrl = () =>
  (process.env.NEXT_PUBLIC_CORE_API_URL || "http://192.168.1.15:8000").replace(/\/$/, "");

const getRagUrl = () =>
  (process.env.NEXT_PUBLIC_RAG_API_URL || "http://192.168.1.15:8001").replace(/\/$/, "");

export const usePartnerStore = create<PartnerState>((set, get) => ({
  students: [],
  pendingRequests: [],
  numberOfPendingRequests: 0,
  totalEnrollments: 0,
  selectedStudent: null,
  subjects: [],
  isLoading: false,

  setSelectedStudent: (student) => set({ selectedStudent: student }),

  // ── Fetch students from backend ─────────────────────────────────────────
  fetchStudents: async () => {
    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    if (!partnerId) return;

    set({ isLoading: true });

    try {
      const res = await fetch(
        `${getBaseUrl()}/partner/students?partner_id=${partnerId}`
      );
      if (!res.ok) throw new Error("Failed to fetch students");

      const raw: any[] = await res.json();

      // Extract the trailing metadata object (which contains *_count)
      const metaObj = raw.find((item) => "pending_count" in item);
      const totalEnrollments = metaObj?.approved_count ?? 0;
      const pendingCount = metaObj?.pending_count ?? 0;

      // Filter out the metadata trailer to parse strictly students
      const studentItems = raw.filter((item) => "id" in item && "username" in item);

      const approved: Student[] = [];
      const pending: Student[] = [];

      for (const item of studentItems) {
        const student: Student = {
          id: item.id,
          name: item.username,
          grade: String(item.grade),
          initials: getInitials(item.username),
          status: item.status,
        };
        if (item.status === "APPROVED") {
          approved.push(student);
        } else {
          pending.push(student);
        }
      }

      set({
        students: approved,
        pendingRequests: pending,
        numberOfPendingRequests: pendingCount,
        totalEnrollments,
        isLoading: false,
      });
    } catch (error) {
      console.error("fetchStudents error:", error);
      set({ isLoading: false });
    }
  },

  // ── Approve request (backend-first) ────────────────────────────────────
  approveRequest: async (studentId) => {
    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    if (!partnerId) throw new Error("No partner ID found");

    const res = await fetch(
      `${getBaseUrl()}/partner/students/${studentId}/status?partner_id=${partnerId}&status=APPROVED`,
      { method: "PATCH" }
    );

    if (!res.ok) throw new Error("Failed to approve student");

    // Backend confirmed — update local state
    set((state) => {
      const request = state.pendingRequests.find((r) => r.id === studentId);
      if (!request) return state;

      const approvedStudent: Student = {
        ...request,
        status: "APPROVED",
        initials: getInitials(request.name),
      };

      const newPending = state.pendingRequests.filter((r) => r.id !== studentId);

      return {
        pendingRequests: newPending,
        numberOfPendingRequests: newPending.length,
        students: [approvedStudent, ...state.students],
        totalEnrollments: state.totalEnrollments + 1,
        selectedStudent: null,
      };
    });
  },

  // ── Reject request (backend-first) ─────────────────────────────────────
  rejectRequest: async (studentId) => {
    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    if (!partnerId) throw new Error("No partner ID found");

    const res = await fetch(
      `${getBaseUrl()}/partner/students/${studentId}/status?partner_id=${partnerId}&status=REJECTED`,
      { method: "PATCH" }
    );

    if (!res.ok) throw new Error("Failed to reject student");

    // Backend confirmed — remove from pending
    set((state) => {
      const newPending = state.pendingRequests.filter((r) => r.id !== studentId);
      return {
        pendingRequests: newPending,
        numberOfPendingRequests: newPending.length,
        selectedStudent: null,
      };
    });
  },

  // ── Subject actions ────────────────────────────────────────────────────
  fetchSubjects: async () => {
    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    if (!partnerId) return;

    try {
      const res = await fetch(`${getBaseUrl()}/api/partners/${partnerId}/agents`);
      if (!res.ok) throw new Error("Failed to fetch subjects/agents");

      const raw: any[] = await res.json();
      console.log("FETCHED FROM BACKEND:", raw); // Added for debugging
      
      const mappedSubjects: Subject[] = raw.map((item) => ({
        id: item.agent_id,
        subject: item.subject,
        agent: item.name,
        grade: item.grade,
        status: "active",
        chapters: item.chapters_count || 0,
      }));

      set({ subjects: mappedSubjects });
    } catch (error) {
      console.error("fetchSubjects error:", error);
    }
  },
  addSubject: (subject) =>
    set((state) => ({ subjects: [subject, ...state.subjects] })),

  uploadCurriculum: async (file, subjectName, grade, board) => {
    const tempId = Math.random().toString(36).substring(2, 9);

    const optimisticSubject: Subject = {
      id: tempId,
      subject: subjectName,
      agent: subjectName, // Use user-provided name immediately
      grade,
      board,
      status: "in-progress",
      chapters: 0,
    };

    set((state) => ({ subjects: [optimisticSubject, ...state.subjects] }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subject", subjectName);
      formData.append("grade", grade);
      formData.append("board", board);

      const apiUrl = `${getRagUrl()}/admin/ingest/ncert`;

      const response = await fetch(apiUrl, { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();

      set((state) => ({
        subjects: state.subjects.map((s) =>
          s.id === tempId
            ? {
                ...s,
                status: data.status === "completed" ? "active" : "failed",
                chapters: data.chapters_detected,
              }
            : s
        ),
      }));
    } catch (error) {
      console.error("Ingestion error:", error);
      set((state) => ({
        subjects: state.subjects.map((s) =>
          s.id === tempId ? { ...s, status: "failed" } : s
        ),
      }));
    }
  },

  removeSubject: async (agentId) => {
    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    if (!partnerId) throw new Error("No partner ID found");

    const res = await fetch(`${getBaseUrl()}/api/partners/${partnerId}/agents/${agentId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete subject");

    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== agentId),
    }));
  },

  removeStudent: async (studentId) => {
    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    if (!partnerId) throw new Error("No partner ID found");

    const res = await fetch(`${getBaseUrl()}/partner/students/${studentId}?partner_id=${partnerId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete student");

    set((state) => ({
      students: state.students.filter((s) => s.id !== studentId),
      totalEnrollments: state.totalEnrollments - 1,
    }));
  },

  // ── Logout ─────────────────────────────────────────────────────────────
  logoutPartner: () => {
    localStorage.removeItem("gened_user_role");
    localStorage.removeItem("gened_partner_id");
    set({
      students: [],
      pendingRequests: [],
      numberOfPendingRequests: 0,
      subjects: [],
      selectedStudent: null,
      totalEnrollments: 0,
    });
    window.location.href = "/";
  },
}));
