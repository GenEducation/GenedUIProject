import { create } from "zustand";
import { asError } from "@/utils/errors";
import { sourcesService } from "../services/sourcesService";
import { partnerStudentsService } from "../services/partnerStudentsService";
import type { RegisterSourceInput, SourceState, SourceView } from "../types/sources";

export interface Student {
  id: string;
  name: string;       // mapped from API `username`
  grade: string;
  initials?: string;
  status: "APPROVED" | "PENDING";
}

/**
 * One row of the Subject Registry: a partner-registered chapter source
 * (ADR 0014). `id` is its `source_id`, the same key the visual library uses.
 */
export interface Subject {
  id: string;
  source_id: string;
  /** The chapter's printed title. */
  title: string;
  book_title: string;
  chapter_ordinal: number;
  /** The exact taxonomy subject name. */
  subject: string;
  grade: number;
  board: string;
  publisher: string;
  state: SourceState;
  /** Why a run failed or needs review, in plain words. */
  detail: string | null;
  /** The last run left a review report (`sourcesService.report`). */
  has_report: boolean;
  /** Reconciliation questions the last run is waiting on (`sourcesService.questions`). */
  questions: number;
  created_at: string;
}

export function toSubject(source: SourceView): Subject {
  return {
    id: source.source_id,
    source_id: source.source_id,
    title: source.chapter.title,
    book_title: source.book_title,
    chapter_ordinal: source.chapter.ordinal,
    subject: source.subject,
    grade: source.grade,
    board: source.board,
    publisher: source.publisher,
    state: source.state,
    detail: source.detail,
    has_report: source.has_report,
    questions: source.questions,
    created_at: source.created_at,
  };
}

export interface SubjectFilters {
  grade?: number | null;
  subject?: string;
  state?: SourceState;
  search?: string;
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
  /** End an approved student's membership but keep the record (status REVOKED); unlike `removeStudent`, which deletes it. */
  revokeStudent: (studentId: string) => Promise<void>;

  // Subject Actions
  fetchSubjects: () => Promise<void>;
  setSubjectFilters: (filters: SubjectFilters) => void;
  setSubjectOffset: (offset: number) => void;
  /** Register a chapter and queue its first run; throws `ApiRequestError` with a readable message. */
  uploadSource: (input: RegisterSourceInput) => Promise<void>;
  startIngestion: (sourceId: string) => Promise<void>;
  cancelIngestion: (sourceId: string) => Promise<void>;
  removeSubject: (sourceId: string) => Promise<void>;
  removeStudent: (studentId: string) => Promise<void>;
  setShowUploadModal: (show: boolean) => void;

  // PDF Viewer Actions
  openIngestedPdf: (subject: Subject) => Promise<void>;
  closePdfViewer: () => void;

  // Auth/Logout Action
  logoutPartner: () => void;
}

/** Swap one row for the server's latest copy of it. */
function replaceSubject(set: (fn: (state: PartnerState) => Partial<PartnerState>) => void, source: SourceView) {
  const next = toSubject(source);
  set((state) => ({ subjects: state.subjects.map((s) => (s.id === next.id ? next : s)) }));
}

/** The viewer shows the PDF from an object URL; free it when it's replaced or closed. */
function revokeViewerUrl(url: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is required. Set it in your .env.local file.");
}

/** The signed-in partner's id (their user id), as login stored it. */
function storedPartnerId(): string | undefined {
  return localStorage.getItem("gened_partner_id")?.replace(/['"]+/g, "") || undefined;
}

function requirePartnerId(): string {
  const partnerId = storedPartnerId();
  if (!partnerId) throw new Error("No partner ID found");
  return partnerId;
}

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
    revokeViewerUrl(get().viewerPdfUrl);
    set({
      isViewerLoading: true,
      viewerError: null,
      viewerTitle: subject.title,
      viewerPdfUrl: null,
    });

    try {
      const blob = await sourcesService.pdfBlob(subject.source_id);
      set({ viewerPdfUrl: URL.createObjectURL(blob), isViewerLoading: false });
    } catch (error) {
      console.error("openIngestedPdf error:", error);
      set({
        isViewerLoading: false,
        viewerError: asError(error).message || "PDF not available for this document.",
      });
    }
  },

  closePdfViewer: () => {
    revokeViewerUrl(get().viewerPdfUrl);
    set({ viewerPdfUrl: null, viewerTitle: null, isViewerLoading: false, viewerError: null });
  },

  // -- Students and the approval queue ------------------------------------
  // Approved students come from `/partner/students` (which lists every state,
  // plus a counts row); the queue from `/partner/requests` (PENDING only), so a
  // rejected or revoked student never shows up as a request.
  fetchStudents: async () => {
    const partnerId = storedPartnerId();
    if (!partnerId) return;

    set({ isLoading: true });
    try {
      const [{ rows, counts }, requests] = await Promise.all([
        partnerStudentsService.students(partnerId),
        partnerStudentsService.requests(partnerId),
      ]);
      const students: Student[] = rows
        .filter((row) => row.status === "APPROVED")
        .map((row) => ({
          id: row.id,
          name: row.username,
          grade: String(row.grade),
          initials: getInitials(row.username),
          status: "APPROVED",
        }));
      const pendingRequests: Student[] = requests.map((request) => ({
        id: request.student_id,
        name: request.name,
        grade: String(request.grade),
        initials: getInitials(request.name),
        status: "PENDING",
      }));
      set({
        students,
        pendingRequests,
        numberOfPendingRequests: pendingRequests.length,
        totalEnrollments: counts?.approved_count ?? students.length,
        isLoading: false,
      });
    } catch (error) {
      console.error("fetchStudents error:", error);
      set({ isLoading: false });
    }
  },

  // -- Approve request (backend-first) ------------------------------------
  approveRequest: async (studentId) => {
    await partnerStudentsService.setStatus(requirePartnerId(), studentId, "APPROVED");

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
    await partnerStudentsService.setStatus(requirePartnerId(), studentId, "REJECTED");

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

  // -- Revoke an approved student (backend-first) -------------------------
  revokeStudent: async (studentId) => {
    await partnerStudentsService.setStatus(requirePartnerId(), studentId, "REVOKED");

    set((state) => ({
      students: state.students.filter((s) => s.id !== studentId),
      totalEnrollments: Math.max(0, state.totalEnrollments - 1),
      selectedStudent: state.selectedStudent?.id === studentId ? null : state.selectedStudent,
    }));
  },

  // -- Subject actions ----------------------------------------------------
  setSubjectFilters: (filters) => {
    set({ subjectFilters: filters, subjectPagination: { ...get().subjectPagination, offset: 0 } });
  },

  setSubjectOffset: (offset) => {
    set((state) => ({ subjectPagination: { ...state.subjectPagination, offset } }));
  },

  fetchSubjects: async () => {
    set({ isSubjectsLoading: true });
    const { subjectFilters, subjectPagination } = get();

    try {
      const page = await sourcesService.list({
        grade: subjectFilters.grade ?? undefined,
        subject: subjectFilters.subject,
        state: subjectFilters.state,
        search: subjectFilters.search,
        limit: subjectPagination.limit,
        offset: subjectPagination.offset,
      });
      set({
        isSubjectsLoading: false,
        subjects: page.items.map(toSubject),
        subjectPagination: { total_count: page.total_count, limit: page.limit, offset: page.offset },
      });
    } catch (error) {
      console.error("fetchSubjects error:", error);
      set({ isSubjectsLoading: false });
    }
  },

  uploadSource: async (input) => {
    const source = await sourcesService.register(input);
    await sourcesService.start(source.source_id);
    // Back to the first page, where the new chapter is (newest first).
    set({ subjectPagination: { ...get().subjectPagination, offset: 0 } });
    await get().fetchSubjects();
  },

  startIngestion: async (sourceId) => {
    const source = await sourcesService.start(sourceId);
    replaceSubject(set, source);
  },

  cancelIngestion: async (sourceId) => {
    const source = await sourcesService.cancel(sourceId);
    replaceSubject(set, source);
  },

  removeSubject: async (sourceId) => {
    await sourcesService.remove(sourceId);
    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== sourceId),
      subjectPagination: {
        ...state.subjectPagination,
        total_count: Math.max(0, state.subjectPagination.total_count - 1),
      },
    }));
  },

  removeStudent: async (studentId) => {
    await partnerStudentsService.remove(requirePartnerId(), studentId);

    set((state) => ({
      students: state.students.filter((s) => s.id !== studentId),
      totalEnrollments: Math.max(0, state.totalEnrollments - 1),
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
