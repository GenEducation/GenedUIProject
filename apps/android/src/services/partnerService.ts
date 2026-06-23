/**
 * Partner service — mobile equivalent of the web's usePartnerStore API calls.
 *
 * All calls go through authFetch which automatically injects the Bearer token
 * and handles 401/403 session expiry. BASE URL comes from the Expo env var.
 * The RAG endpoints share the same base URL (confirmed from .env).
 */
import { authFetch } from "./authFetch";
import type {
  PartnerStudent,
  PartnerStudentDetail,
  SubjectRegistryItem,
  IngestionUploadForm,
} from "../types/partner";
import { normaliseIngestionStatus } from "../types/partner";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/** Maps raw API student record to our typed PartnerStudent. */
function mapStudent(raw: Record<string, unknown>): PartnerStudent {
  return {
    id:       String(raw.id ?? ""),
    name:     String(raw.username ?? raw.name ?? ""),
    grade:    String(raw.grade ?? ""),
    initials: String(raw.username ?? raw.name ?? "?")
                .split(" ")
                .map((w) => w[0]?.toUpperCase() ?? "")
                .slice(0, 2)
                .join(""),
    status: (raw.status as PartnerStudent["status"]) ?? "PENDING",
  };
}

/** Maps raw ingestion API item to SubjectRegistryItem. */
function mapIngestionItem(raw: Record<string, unknown>): SubjectRegistryItem {
  return {
    id:               String(raw.ingestion_batch_id ?? raw.id ?? ""),
    document_title:   String(raw.document_title ?? raw.title ?? ""),
    subject:          String(raw.subject ?? ""),
    grade:            raw.grade ?? "",
    status:           normaliseIngestionStatus(String(raw.status ?? "")),
    chapters_detected: typeof raw.chapters_detected === "number" ? raw.chapters_detected : undefined,
    chapter_titles:   Array.isArray(raw.chapter_titles) ? (raw.chapter_titles as string[]) : undefined,
  };
}

export const partnerService = {
  // ── Student Registry ─────────────────────────────────────────────────────────

  fetchStudents: async (partnerId: string): Promise<PartnerStudent[]> => {
    const res = await authFetch(`${BASE}/partner/students?partner_id=${partnerId}`);
    const data = await res.json();
    const raw: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : (data?.students ?? data?.data ?? []);
    // Filter out the trailing metadata object (has pending_count but no id/username)
    return raw
      .filter((item) => "id" in item && "username" in item)
      .map(mapStudent);
  },

  fetchStudentDetail: async (
    partnerId: string,
    studentId: string
  ): Promise<PartnerStudentDetail> => {
    const res = await authFetch(
      `${BASE}/partner/students/${studentId}?partner_id=${partnerId}`
    );
    const raw = await res.json();
    return {
      id:               String(raw.id ?? raw.user_id ?? studentId),
      name:             String(raw.username ?? raw.name ?? ""),
      username:         raw.username ? String(raw.username) : undefined,
      email:            raw.email    ? String(raw.email)    : undefined,
      grade:            raw.grade    ?? "",
      school_board:     raw.school_board ? String(raw.school_board) : undefined,
      status:           (raw.status as PartnerStudentDetail["status"]) ?? "PENDING",
      enrolled_subjects: Array.isArray(raw.enrolled_subjects)
        ? (raw.enrolled_subjects as string[])
        : [],
    };
  },

  // ── Academic Registry ────────────────────────────────────────────────────────

  fetchSubjects: async (partnerId: string): Promise<SubjectRegistryItem[]> => {
    const res = await authFetch(
      `${BASE}/partner-portal/${partnerId}/ingestions`,
      { headers: { accept: "application/json" } }
    );
    const data = await res.json();
    // Response shape: { items: [...], total_count, limit, offset }
    const list: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : (data?.items ?? data?.data ?? []);
    return list.map(mapIngestionItem);
  },

  // ── Ingestion Upload ─────────────────────────────────────────────────────────

  /**
   * POST multipart/form-data to upload a curriculum PDF.
   *
   * Returns:
   *  { kind: "async", batchId } → HTTP 202, caller should poll
   *  { kind: "sync", status }   → HTTP 200, terminal immediately
   */
  uploadCurriculum: async (
    partnerId: string,
    form: IngestionUploadForm,
    fileUri: string,
    fileName: string
  ): Promise<{ kind: "async"; batchId: string } | { kind: "sync"; status: string }> => {
    const body = new FormData();
    // React Native FormData accepts a { uri, name, type } object for files
    body.append("file", { uri: fileUri, name: fileName, type: "application/pdf" } as unknown as Blob);
    body.append("subject",        form.subject);
    body.append("document_title", form.document_title);
    body.append("agent_name",     form.agent_name);
    body.append("grade",          form.grade);
    body.append("board",          form.board);
    body.append("document_type",  form.document_type || "chapter");
    body.append("partner_id",     partnerId);

    const res = await authFetch(`${BASE}/rag/admin/ingest/ncert`, {
      method: "POST",
      body,
      // Do NOT set Content-Type — fetch sets it automatically with the multipart boundary
    });

    if (res.status === 202) {
      const json = await res.json();
      return { kind: "async", batchId: String(json.ingestion_batch_id ?? json.batch_id ?? "") };
    }

    if (res.status === 200) {
      const json = await res.json();
      return { kind: "sync", status: String(json.status ?? "completed") };
    }

    throw new Error(`Upload failed with status ${res.status}`);
  },

  // ── Ingestion Polling ────────────────────────────────────────────────────────

  pollIngestionStatus: async (
    batchId: string
  ): Promise<{ rawStatus: string; chapters_detected?: number; chapter_titles?: string[] }> => {
    const res = await authFetch(`${BASE}/rag/admin/ingestions/${batchId}`);
    const json = await res.json();
    return {
      rawStatus:        String(json.status ?? ""),
      chapters_detected: typeof json.chapters_detected === "number" ? json.chapters_detected : undefined,
      chapter_titles:   Array.isArray(json.chapter_titles) ? (json.chapter_titles as string[]) : undefined,
    };
  },

  // ── Cancel / Delete ──────────────────────────────────────────────────────────

  cancelIngestion: async (partnerId: string, documentTitle: string): Promise<void> => {
    const encoded = encodeURIComponent(documentTitle);
    await authFetch(
      `${BASE}/rag/admin/ingest/cancel?partner_id=${partnerId}&document_title=${encoded}`,
      { method: "POST" }
    );
  },

  deleteSubject: async (partnerId: string, documentTitle: string): Promise<void> => {
    const encoded = encodeURIComponent(documentTitle);
    const res = await authFetch(
      `${BASE}/rag/partner/${partnerId}/ingestions/${encoded}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to delete subject ingestion");
  },
};
