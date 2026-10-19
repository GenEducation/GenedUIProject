import { authFetch } from "@/utils/authFetch";
import type {
  LearningOutcome,
  QuestionsResponse,
  RecordedAnswer,
  ReleaseDecision,
  ReleaseDecisionResult,
  SourceRelease,
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

  /** The last run's reconciliation questions. 404 when the chapter has none waiting. */
  questions: async (id: string): Promise<QuestionsResponse> => {
    const response = await authFetch(`${sourcePath(id)}/reconciliation`);
    return response.json();
  },

  /** Record answers (merged with any already recorded). 422 carries a plain-language reason. */
  answerQuestions: async (id: string, decisions: Record<string, RecordedAnswer>): Promise<QuestionsResponse> => {
    const response = await authFetch(`${sourcePath(id)}/reconciliation`, {
      method: "PUT",
      body: JSON.stringify({ decisions }),
    });
    return response.json();
  },

  /** The last run's review report, as Markdown. 404 ("This chapter has no report yet.") before one exists. */
  report: async (id: string): Promise<string> => {
    const response = await authFetch(`${sourcePath(id)}/report`);
    return response.text();
  },

  /** The chapter's newest release and its proposals. 404 until a ready run has been staged for review. */
  release: async (id: string): Promise<SourceRelease> => {
    const response = await authFetch(`${sourcePath(id)}/release`);
    return response.json();
  },

  /** Record decisions on the newest release; each is recorded or refused on its own (a stale hash is refused). */
  decideRelease: async (id: string, decisions: ReleaseDecision[]): Promise<ReleaseDecisionResult[]> => {
    const response = await authFetch(`${sourcePath(id)}/release/decisions`, {
      method: "POST",
      body: JSON.stringify({ decisions }),
    });
    return response.json();
  },

  /** Publish the newest release; a 409 says what still blocks it. */
  publishRelease: async (id: string, artifactHash: string): Promise<Record<string, unknown>> => {
    const response = await authFetch(`${sourcePath(id)}/release/publish`, {
      method: "POST",
      body: JSON.stringify({ artifact_hash: artifactHash }),
    });
    return response.json();
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
