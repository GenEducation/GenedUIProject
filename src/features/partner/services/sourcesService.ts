import { authFetch } from "@/utils/authFetch";
import type {
  LearningOutcome,
  RegisterSourceInput,
  SourceListParams,
  SourceListResponse,
  SourceView,
} from "../types/sources";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

const SOURCES_BASE = `${API_BASE_URL}/v1/sources`;

function toQuery(params: object = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

const sourcePath = (id: string) => `${SOURCES_BASE}/${encodeURIComponent(id)}`;

/**
 * Partner chapter sources (ADR 0014): upload a chapter, start its ingestion,
 * watch its state. Every route needs the PARTNER role and only ever returns
 * the caller's own sources; the owner comes from the token, never a field.
 *
 * No `response.ok` checks: `authFetch` throws `ApiRequestError` on any non-OK
 * response, carrying the backend's readable `message` (a 422 says what's
 * wrong with an upload; a 409 says why a start/cancel/delete doesn't fit).
 */
export const sourcesService = {
  list: async (params?: SourceListParams): Promise<SourceListResponse> => {
    const response = await authFetch(`${SOURCES_BASE}${toQuery(params)}`);
    return response.json();
  },

  register: async (input: RegisterSourceInput): Promise<SourceView> => {
    const form = new FormData();
    form.append("file", input.file);
    for (const key of [
      "board",
      "publisher",
      "subject",
      "grade",
      "book_title",
      "edition_label",
      "chapter_ordinal",
      "chapter_title",
      "first_pdf_page",
      "last_pdf_page",
      "strand",
    ] as const) {
      form.append(key, String(input[key]));
    }
    input.lo_codes.forEach((code) => form.append("lo_codes", code));
    (input.full_coverage_codes ?? []).forEach((code) => form.append("full_coverage_codes", code));
    const response = await authFetch(SOURCES_BASE, { method: "POST", body: form });
    return response.json();
  },

  /** Queue a run; the worker picks it up. */
  start: async (id: string): Promise<SourceView> => {
    const response = await authFetch(`${sourcePath(id)}/ingestions`, { method: "POST" });
    return response.json();
  },

  /** Take a queued run off the queue (a running one can't be stopped). */
  cancel: async (id: string): Promise<SourceView> => {
    const response = await authFetch(`${sourcePath(id)}/ingestions`, { method: "DELETE" });
    return response.json();
  },

  remove: async (id: string): Promise<void> => {
    await authFetch(sourcePath(id), { method: "DELETE" });
  },

  /** The uploaded PDF, as a Blob for an object URL (the route needs auth, so no plain link). */
  pdfBlob: async (id: string): Promise<Blob> => {
    const response = await authFetch(`${sourcePath(id)}/pdf`);
    return response.blob();
  },

  learningOutcomes: async (board: string, subject: string, grade: number): Promise<LearningOutcome[]> => {
    const response = await authFetch(`${SOURCES_BASE}/learning-outcomes${toQuery({ board, subject, grade })}`);
    return response.json();
  },

  /** Strand codes the subject's published components already use. */
  strands: async (subject: string): Promise<string[]> => {
    const response = await authFetch(`${SOURCES_BASE}/strands${toQuery({ subject })}`);
    return response.json();
  },
};
