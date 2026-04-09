import { create } from "zustand";

export interface Student {
  id: string;
  name: string;       // mapped from API `username`
  grade: string;
  initials?: string;
  status: "APPROVED" | "PENDING";
}

export interface Subject {
  id: string;
  name: string;
  grade: string;
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
  addSubject: (subject: Subject) => void;
  uploadCurriculum: (file: File, subjectName: string, grade: string, board: string) => Promise<void>;

  // Auth/Logout Action
  logoutPartner: () => void;
}

const INITIAL_SUBJECTS: Subject[] = [
  { id: "s1", name: "Advanced Mathematics", grade: "12", status: "active", chapters: 14, board: "CBSE" },
  { id: "s2", name: "Molecular Biology", grade: "12", status: "active", chapters: 18, board: "ICSE" },
  { id: "s3", name: "Classical History", grade: "11", status: "active", chapters: 22, board: "IGCSE" },
  { id: "s4", name: "Computer Science Fundamentals", grade: "12", status: "active", chapters: 15, board: "State" },
  { id: "s5", name: "Art Theory & Criticism", grade: "11", status: "active", chapters: 10, board: "Oxford" },
];

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const getBaseUrl = () =>
  (process.env.NEXT_PUBLIC_PARTNER_API_URL || "http://192.168.1.4:8000").replace(/\/$/, "");

export const usePartnerStore = create<PartnerState>((set, get) => ({
  students: [],
  pendingRequests: [],
  numberOfPendingRequests: 0,
  totalEnrollments: 0,
  selectedStudent: null,
  subjects: INITIAL_SUBJECTS,
  isLoading: false,

  setSelectedStudent: (student) => set({ selectedStudent: student }),

  // ── Fetch students from backend ─────────────────────────────────────────
  fetchStudents: async () => {
    const partnerId = localStorage.getItem("gened_partner_id");
    if (!partnerId) return;

    set({ isLoading: true });

    try {
      const res = await fetch(
        `${getBaseUrl()}/partner/students?partner_id=${partnerId}`
      );
      if (!res.ok) throw new Error("Failed to fetch students");

      const raw: any[] = await res.json();

      // Extract the trailing { count: N } object
      const countObj = raw.find((item) => "count" in item && !("id" in item));
      const totalEnrollments = countObj?.count ?? 0;

      // Filter out the count trailer and any non-student objects
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
        numberOfPendingRequests: pending.length,
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
    const partnerId = localStorage.getItem("gened_partner_id");
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
    const partnerId = localStorage.getItem("gened_partner_id");
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
  addSubject: (subject) =>
    set((state) => ({ subjects: [subject, ...state.subjects] })),

  uploadCurriculum: async (file, subjectName, grade, board) => {
    const tempId = Math.random().toString(36).substring(2, 9);

    const optimisticSubject: Subject = {
      id: tempId,
      name: subjectName,
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

      const apiUrl = `${getBaseUrl()}/admin/ingest/ncert`;

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
