/**
 * Partner chapter sources — mirror of the `Source*` schemas in the backend's
 * `contracts/openapi/api.json` (ADR 0014). A source is one uploaded chapter
 * PDF and the state of its ingestion run; its `source_id` is the same key the
 * visual library uses.
 */

export type SourceState =
  | "registered"
  | "queued"
  | "running"
  | "review_needed"
  | "invalid"
  | "ready"
  | "failed";

/** States a partner may start (or re-run) a source from. */
export const STARTABLE_STATES: ReadonlySet<SourceState> = new Set([
  "registered",
  "review_needed",
  "invalid",
  "ready",
  "failed",
]);

/** States a source may be deleted in: it produced nothing reviewable. */
export const DELETABLE_STATES: ReadonlySet<SourceState> = new Set(["registered", "invalid", "failed"]);

/** States the worker is still on; the registry keeps polling while any row is in one. */
export const ACTIVE_STATES: ReadonlySet<SourceState> = new Set(["queued", "running"]);

export const SOURCE_STATE_LABELS: Record<SourceState, string> = {
  registered: "Not started",
  queued: "Queued",
  running: "Processing",
  review_needed: "Needs admin review",
  invalid: "Didn't pass checks",
  ready: "Ready",
  failed: "Failed",
};

export interface SourceChapter {
  ordinal: number;
  title: string;
  first_pdf_page: number;
  last_pdf_page: number;
}

export interface SourceView {
  source_id: string;
  board: string;
  publisher: string;
  /** The exact taxonomy subject name. */
  subject: string;
  grade: number;
  book_title: string;
  edition_label: string;
  chapter: SourceChapter;
  pdf_file_name: string;
  page_count: number;
  strand: string;
  lo_codes: string[];
  state: SourceState;
  /** Why a run failed or needs review, in plain words. */
  detail: string | null;
  /** How many teaching visuals the last run submitted for review. */
  visuals: Record<string, number> | null;
  queued_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceListResponse {
  items: SourceView[];
  total_count: number;
  limit: number;
  offset: number;
}

export interface SourceListParams {
  state?: SourceState;
  subject?: string;
  grade?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LearningOutcome {
  code: string;
  name: string;
  competency_code: string;
  competency_name: string;
}

/** The fields of `POST /v1/sources`, besides the file. */
export interface RegisterSourceInput {
  file: File;
  board: string;
  publisher: string;
  subject: string;
  grade: number;
  book_title: string;
  edition_label: string;
  chapter_ordinal: number;
  chapter_title: string;
  first_pdf_page: number;
  last_pdf_page: number;
  strand: string;
  lo_codes: string[];
  full_coverage_codes?: string[];
}

/** The portal's own cap, under the backend's 50 MB and common proxy limits. */
export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
