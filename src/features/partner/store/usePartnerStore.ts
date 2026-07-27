import { create } from "zustand";
import { authFetch } from "@/utils/authFetch";
import { studentService } from "@/features/student/services/studentService";
import {
  requireLoadedExactSubject,
  type ExactSubject,
} from "@/features/subjects/subjectCatalog";

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

export interface SubjectFilters {
  grade?: number | null;
  subject?: string;
  status?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
}

export interface SubjectPagination {
  total_count: number;
  limit: number;
  offset: number;
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
  subjectFilters: SubjectFilters;
  subjectPagination: SubjectPagination;

  // --- UI State ---
  isLoading: boolean;
  isSubjectsLoading: boolean;
  showUploadModal: boolean;

  // --- PDF Viewer State ---
  viewerPdfUrl: string | null;
  viewerTitle: string | null;
  isViewerLoading: boolean;
  viewerError: string | null;

  // --- Actions ---
  // Analytics Actions
  setSelectedStudent: (student: Student | null) => void;
  fetchStudents: () => Promise<void>;
  approveRequest: (studentId: string) => Promise<void>;
  rejectRequest: (studentId: string) => Promise<void>;

  // Subject Actions
  fetchSubjects: () => Promise<void>;
  setSubjectFilters: (filters: SubjectFilters) => void;
  setSubjectOffset: (offset: number) => void;
  addSubject: (subject: Subject) => void;
  uploadCurriculum: (file: File, subjectName: ExactSubject, documentTitle: string, agentName: string, grade: string, board: string, documentType: string) => Promise<void>;
  cancelIngestion: (tempId: string) => Promise<void>;
  removeSubject: (agentId: string) => Promise<void>;
  removeStudent: (studentId: string) => Promise<void>;
  setShowUploadModal: (show: boolean) => void;

  // PDF Viewer Actions
  openIngestedPdf: (subject: Subject) => Promise<void>;
  closePdfViewer: () => void;

  // Auth/Logout Action
  logoutPartner: () => void;
}

const abortControllers = new Map<string, AbortController>();

// --- Pending ingestion persistence ---
// Keeps queued/processing batch IDs in localStorage so polling survives a page refresh.

const PENDING_KEY = "gened_pending_ingestions";

interface PendingIngestion {
  batchId: string;
  subject: Subject; // snapshot of the optimistic row
}

function getPendingIngestions(): PendingIngestion[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  } catch {
    return [];
  }
}

function addPendingIngestion(entry: PendingIngestion) {
  const list = getPendingIngestions().filter((p) => p.batchId !== entry.batchId);
  localStorage.setItem(PENDING_KEY, JSON.stringify([...list, entry]));
}

function removePendingIngestion(batchId: string) {
  const list = getPendingIngestions().filter((p) => p.batchId !== batchId);
  localStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

// Polls GET /rag/admin/ingestions/{batchId} every 5 s until a terminal state.
// rowId is the id used in the subjects array (tempId or batchId).
async function pollIngestion(
  batchId: string,
  rowId: string,
  controller: AbortController,
  setSubjects: (updater: (subjects: Subject[]) => Subject[]) => void,
  onComplete: () => void,
) {
  const ragUrl = getRagUrl();
  const MAX_POLLS = 180;

  try {
    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      if (controller.signal.aborted) return;

      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 5000);
        controller.signal.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
      });

      if (controller.signal.aborted) return;

      const pollRes = await authFetch(`${ragUrl}/rag/admin/ingestions/${batchId}`);
      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();
      const apiStatus: string = pollData.status;

      if (apiStatus === "completed") {
        removePendingIngestion(batchId);
        setSubjects((subjects) =>
          subjects.map((s) =>
            s.id === rowId
              ? { ...s, id: batchId, status: "active", chapters: pollData.chapters_detected ?? pollData.chapter_titles?.length ?? 0 }
              : s
          )
        );
        onComplete();
        return;
      }

      if (apiStatus === "failed") {
        removePendingIngestion(batchId);
        setSubjects((subjects) =>
          subjects.map((s) => (s.id === rowId ? { ...s, status: "failed" } : s))
        );
        return;
      }
      // queued / processing / finalizing → keep polling
    }

    // Timeout
    removePendingIngestion(batchId);
    setSubjects((subjects) =>
      subjects.map((s) => (s.id === rowId ? { ...s, status: "failed" } : s))
    );
  } finally {
    abortControllers.delete(rowId);
  }
}

// Called once on app load to restore any pending ingestions from localStorage.
export async function restorePendingIngestions(
  setSubjects: (updater: (subjects: Subject[]) => Subject[]) => void,
  onComplete: () => void,
) {
  const pending = getPendingIngestions();
  if (pending.length === 0) return;

  // Inject the persisted rows into the subjects list
  setSubjects((subjects) => {
    const existingIds = new Set(subjects.map((s) => s.id));
    const toAdd = pending
      .filter((p) => !existingIds.has(p.batchId) && !existingIds.has(p.subject.id))
      .map((p) => ({ ...p.subject, id: p.batchId, status: "in-progress" as const }));
    return [...toAdd, ...subjects];
  });

  // Resume a poll loop for each
  for (const { batchId, subject } of pending) {
    if (abortControllers.has(batchId)) continue;
    const controller = new AbortController();
    abortControllers.set(batchId, controller);
    pollIngestion(batchId, batchId, controller, setSubjects, onComplete);
  }
}



const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is required. Set it in your .env.local file.");
}

const getBaseUrl = () => API_URL;
const getRagUrl = () => API_URL;

export const usePartnerStore = create<PartnerState>((set, get) => ({
  students: [],
  pendingRequests: [],
  numberOfPendingRequests: 0,
  totalEnrollments: 0,
  selectedStudent: null,
  subjects: [],
  subjectFilters: {},
  subjectPagination: { total_count: 0, limit: 20, offset: 0 },
  isLoading: false,
  isSubjectsLoading: false,
  showUploadModal: false,
  viewerPdfUrl: null,
  viewerTitle: null,
  isViewerLoading: false,
  viewerError: null,

  setSelectedStudent: (student) => set({ selectedStudent: student }),
  setShowUploadModal: (show) => set({ showUploadModal: show }),

  // -- PDF Viewer actions ---------------------------------------------------
  openIngestedPdf: async (subject) => {
    set({
      isViewerLoading: true,
      viewerError: null,
      viewerTitle: subject.agent,
      viewerPdfUrl: null,
    });

    try {
      const grade = typeof subject.grade === "string" ? parseInt(subject.grade, 10) : subject.grade;
      const exactSubject = await requireLoadedExactSubject(subject.subject, grade);
      const data = await studentService.fetchChapterPdfUrl(grade, exactSubject, subject.agent);

      if (!data?.pdf_url || !data.pdf_url.startsWith("https://")) {
        throw new Error("PDF not available for this document.");
      }

      set({ viewerPdfUrl: data.pdf_url, isViewerLoading: false });
    } catch (error: any) {
      console.error("openIngestedPdf error:", error);
      set({
        isViewerLoading: false,
        viewerError: error?.message || "PDF not available for this document.",
      });
    }
  },

  closePdfViewer: () => {
    set({ viewerPdfUrl: null, viewerTitle: null, isViewerLoading: false, viewerError: null });
  },

  // -- Fetch students from backend ----------------------------------------─
  fetchStudents: async () => {
    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    if (!partnerId) return;

    set({ isLoading: true });

    try {
      const res = await authFetch(
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

  // -- Approve request (backend-first) ------------------------------------
  approveRequest: async (studentId) => {
    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    if (!partnerId) throw new Error("No partner ID found");

    const res = await authFetch(
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

  // -- Reject request (backend-first) ------------------------------------─
  rejectRequest: async (studentId) => {
    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    if (!partnerId) throw new Error("No partner ID found");

    const res = await authFetch(
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

  // -- Subject actions ----------------------------------------------------
  setSubjectFilters: (filters) => {
    set({ subjectFilters: filters, subjectPagination: { ...get().subjectPagination, offset: 0 } });
  },

  setSubjectOffset: (offset) => {
    set((state) => ({ subjectPagination: { ...state.subjectPagination, offset } }));
  },

  fetchSubjects: async () => {
    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    if (!partnerId) return;

    set({ isSubjectsLoading: true });
    const { subjectFilters, subjectPagination } = get();

    const params = new URLSearchParams();
    if (subjectFilters.grade != null) params.set("grade", String(subjectFilters.grade));
    if (subjectFilters.subject) params.set("subject", subjectFilters.subject);
    if (subjectFilters.status) params.set("status", subjectFilters.status);
    if (subjectFilters.search) params.set("search", subjectFilters.search);
    if (subjectFilters.from_date) params.set("from_date", subjectFilters.from_date);
    if (subjectFilters.to_date) params.set("to_date", subjectFilters.to_date);
    params.set("limit", String(subjectPagination.limit));
    params.set("offset", String(subjectPagination.offset));

    try {
      const url = `${getRagUrl()}/partner-portal/${partnerId}/ingestions?${params.toString()}`;
      console.log("fetchSubjects URL:", url);
      const res = await authFetch(url);
      if (!res.ok) {
        const errText = await res.text();
        console.error(`fetchSubjects failed [${res.status}]:`, errText);
        throw new Error(`Failed to fetch subjects/agents: ${res.status}`);
      }

      const data = await res.json();
      const items: any[] = data.items ?? [];

      const mappedSubjects: Subject[] = items.map((item) => ({
        id: item.ingestion_batch_id,
        subject: item.subject,
        agent: item.document_title,
        grade: item.grade,
        status: item.status === "completed"
          ? "active"
          : (item.status === "queued" || item.status === "processing" || item.status === "finalizing")
            ? "in-progress"
            : item.status === "failed"
              ? "failed"
              : item.status,
        chapters: item.chunks_created ?? 0,
      }));

      // Preserve in-progress rows that only exist locally (polling not yet complete).
      // These have a tempId not present in the backend response.
      const backendIds = new Set(mappedSubjects.map((s) => s.id));
      const localInProgress = get().subjects.filter(
        (s) => s.status === "in-progress" && !backendIds.has(s.id)
      );

      set({
        isSubjectsLoading: false,
        subjects: [...localInProgress, ...mappedSubjects],
        subjectPagination: {
          total_count: data.total_count ?? 0,
          limit: data.limit ?? subjectPagination.limit,
          offset: data.offset ?? subjectPagination.offset,
        },
      });

      // Resume polling for any in-progress subjects returned by the backend.
      for (const subject of mappedSubjects) {
        if (subject.status === "in-progress" && !abortControllers.has(subject.id)) {
          const ctrl = new AbortController();
          abortControllers.set(subject.id, ctrl);
          pollIngestion(
            subject.id,
            subject.id,
            ctrl,
            (updater) => set((state) => ({ subjects: updater(state.subjects) })),
            () => get().fetchSubjects(),
          );
        }
      }
    } catch (error) {
      console.error("fetchSubjects error:", error);
      set({ isSubjectsLoading: false });
    }
  },

  addSubject: (subject) =>
    set((state) => ({ subjects: [subject, ...state.subjects] })),

  uploadCurriculum: async (file, subjectName, documentTitle, agentName, grade, board, documentType) => {
    const gradeNumber = Number(grade);
    const exactSubject = await requireLoadedExactSubject(subjectName, gradeNumber);
    const tempId = Math.random().toString(36).substring(2, 9);

    const optimisticSubject: Subject = {
      id: tempId,
      subject: exactSubject,
      agent: documentTitle, // Show the Document Title as the primary name
      grade,
      board,
      status: "in-progress",
      chapters: 0,
    };

    set((state) => ({ subjects: [optimisticSubject, ...state.subjects] }));

    // Setup AbortController for cancellation
    const controller = new AbortController();
    abortControllers.set(tempId, controller);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subject", exactSubject);
      formData.append("document_title", documentTitle); // Mapped to documentTitle (document_title on backend)
      formData.append("agent_name", agentName);
      formData.append("grade", String(gradeNumber));
      formData.append("board", board);

      formData.append("document_type", documentType || "chapter");

      const rawPartnerId = localStorage.getItem("gened_partner_id");
      const partnerId = rawPartnerId?.replace(/['"]+/g, "");
      if (partnerId) {
        formData.append("partner_id", partnerId);
      }

      const apiUrl = `${getRagUrl()}/rag/admin/ingest/ncert`;

      const response = await authFetch(apiUrl, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorDetail = await response.text();
        console.error("Ingestion failed detail:", errorDetail);
        // Throw an object containing the status so the catch block can decide how to handle it
        throw { status: response.status, message: errorDetail };
      }

      const data = await response.json();

      // HTTP 202: async path — poll until terminal state
      if (response.status === 202) {
        const { ingestion_batch_id } = data;

        // Persist so polling can be resumed after a page refresh
        addPendingIngestion({ batchId: ingestion_batch_id, subject: optimisticSubject });

        // Re-key the optimistic row from tempId → real batchId
        set((state) => ({
          subjects: state.subjects.map((s) =>
            s.id === tempId ? { ...s, id: ingestion_batch_id } : s
          ),
        }));
        abortControllers.delete(tempId);
        abortControllers.set(ingestion_batch_id, controller);

        await pollIngestion(
          ingestion_batch_id,
          ingestion_batch_id,
          controller,
          (updater) => set((state) => ({ subjects: updater(state.subjects) })),
          () => get().fetchSubjects(),
        );
        return;
      }

      // HTTP 200: synchronous fallback — existing behavior
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
    } catch (error: any) {
      // Don't treat abort as an error that marks as failed
      if (error.name === 'AbortError') return;

      const status = error?.status;
      
      // Per user request: 429 and 504 errors should be ignored completely.
      // Do not update the state or show as failed.
      if (status === 429 || status === 504) {
        return;
      }

      console.error("Ingestion error:", error);
      
      // Only 500 (Internal Server Error) from backend should be shown as failed.
      // Other non-ignored errors will be removed from the list.
      const shouldMarkAsFailed = status === 500;

      set((state) => ({
        subjects: shouldMarkAsFailed
          ? state.subjects.map((s) => (s.id === tempId ? { ...s, status: "failed" } : s))
          : state.subjects.filter((s) => s.id !== tempId),
      }));
    } finally {
      abortControllers.delete(tempId);
    }
  },

  cancelIngestion: async (tempId) => {
    const controller = abortControllers.get(tempId);
    if (controller) {
      controller.abort();
      abortControllers.delete(tempId);
    }
    removePendingIngestion(tempId);

    const subject = get().subjects.find(s => s.id === tempId);

    // Explicitly send cancel signal to backend
    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    
    if (partnerId && subject) {
      try {
        const encodedTitle = encodeURIComponent(subject.agent);
        await authFetch(`${getRagUrl()}/rag/admin/ingest/cancel?partner_id=${partnerId}&document_title=${encodedTitle}`, {
          method: "POST"
        });
      } catch (err) {
        console.error("Failed to send explicit cancel signal to backend", err);
      }
    }

    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== tempId),
    }));
  },

  removeSubject: async (agentId) => {
    const subject = get().subjects.find((s) => s.id === agentId);
    if (!subject) throw new Error("Subject not found");

    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    if (!partnerId) throw new Error("No partner ID found");

    const documentTitle = subject.agent; // agent property holds the document_title
    const encodedTitle = encodeURIComponent(documentTitle);

    const res = await authFetch(`${getRagUrl()}/rag/partner/${partnerId}/ingestions/${encodedTitle}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete subject ingestion");

    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== agentId),
    }));
  },

  removeStudent: async (studentId) => {
    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    if (!partnerId) throw new Error("No partner ID found");

    const res = await authFetch(`${getBaseUrl()}/partner/students/${studentId}?partner_id=${partnerId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete student");

    set((state) => ({
      students: state.students.filter((s) => s.id !== studentId),
      totalEnrollments: state.totalEnrollments - 1,
    }));
  },

  // -- Logout ------------------------------------------------------------─
  logoutPartner: () => {
    localStorage.removeItem("gened_user_role");
    localStorage.removeItem("gened_auth_token");
    localStorage.removeItem("gened_user_profile");
    localStorage.removeItem("gened_partner_id");
    set({
      students: [],
      pendingRequests: [],
      numberOfPendingRequests: 0,
      subjects: [],
      subjectFilters: {},
      subjectPagination: { total_count: 0, limit: 20, offset: 0 },
      selectedStudent: null,
      totalEnrollments: 0,
    });
    window.location.href = "/";
  },
}));
