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
  review_needed: "Needs review",
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
  /** Whether `GET /v1/sources/{id}/report` has the last run's review report (ready or didn't-pass-checks runs). */
  has_report: boolean;
  /** How many reconciliation questions the last run is waiting on (state `review_needed`). */
  questions: number;
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

// ---------- reconciliation questions (GET/PUT /v1/sources/{id}/reconciliation) ----------

/** `novel`: a new concept. `same_as`: another concept proposed in this chapter. `match`: a published one (ADMIN). */
export type ReconciliationAnswer = "novel" | "same_as" | "match";

export interface ProposedConcept {
  title: string;
  definition: string;
  lo_code: string;
  bloom: number;
  difficulty: number;
}

export interface ReconciliationCandidate {
  title: string;
  where: "this_chapter" | "catalogue";
  /** Set for a concept proposed in this chapter: what a `same_as` answer names. */
  proposal_key: string | null;
  /** Set for a published concept: what a `match` answer names (ADMIN only). */
  component_id: string | null;
  /** 0–1. */
  similarity: number;
  lo_overlap: number;
  item_overlap: number | null;
}

export interface RecordedAnswer {
  decision: ReconciliationAnswer;
  proposal_key?: string | null;
  component_id?: string | null;
}

export interface ReconciliationQuestion {
  key: string;
  proposal: ProposedConcept;
  candidates: ReconciliationCandidate[];
  /** The answer already recorded, if any. */
  answer: RecordedAnswer | null;
}

export interface QuestionsResponse {
  questions: ReconciliationQuestion[];
  /** What the caller may answer: a PARTNER gets `novel` and `same_as`; an ADMIN also `match`. */
  allowed_answers: ReconciliationAnswer[];
}

// ---------- a chapter's release (GET/POST /v1/sources/{id}/release…, ADR 0014 decision 10) ----------

/** Why a decision was made; a reject needs one of the non-`accepted_as_is` codes. */
export type ReleaseReason =
  | "accepted_as_is"
  | "incorrect_source"
  | "wrong_grain"
  | "duplicate"
  | "missing_binding"
  | "wrong_lo"
  | "bad_key"
  | "unsafe_scorer"
  | "unsupported_measurement"
  | "bad_order"
  | "identity_change";

export const REJECT_REASONS: { code: Exclude<ReleaseReason, "accepted_as_is">; label: string }[] = [
  { code: "incorrect_source", label: "Doesn't match the textbook" },
  { code: "wrong_lo", label: "Wrong learning outcome" },
  { code: "bad_key", label: "Wrong answer" },
  { code: "wrong_grain", label: "Too broad or too narrow" },
  { code: "duplicate", label: "Duplicate" },
  { code: "bad_order", label: "Wrong order" },
  { code: "missing_binding", label: "Missing a link" },
  { code: "unsafe_scorer", label: "Marks answers wrongly" },
  { code: "unsupported_measurement", label: "Can't be measured this way" },
  { code: "identity_change", label: "Changes an existing concept" },
];

/** A staged (`ready` / `blocked`) or `published` release: one batch of a chapter's run. */
export interface ReleaseSummary {
  batch_id: string;
  state: "ready" | "blocked" | "published" | string;
  book_title: string;
  edition_label: string;
  chapters: string[];
  /** The sealed artifact publication needs; null when the release isn't sealed. */
  artifact_hash: string | null;
  created_at: string;
  /** Proposal counts by state (`pending`, `accepted`, `rejected`). */
  proposals: Record<string, number>;
}

/** One reviewable unit of the release, with the exact content a decision is bound to. */
export interface ReleaseProposal {
  id: string;
  /** `source_manifest`, `source_section`, `component`, `item`, `misconception`, `lesson_node`, `figure_group`,
   * `asset`, `tool`, `chapter_plan:<n>`, `graph_and_recovery`. */
  kind: string;
  target_id: string | null;
  state: "pending" | "accepted" | "rejected";
  content_hash: string;
  content: Record<string, unknown>;
}

export interface SourceRelease {
  release: ReleaseSummary;
  proposals: ReleaseProposal[];
}

export interface ReleaseDecision {
  proposal_id: string;
  content_hash: string;
  decision: "accept" | "reject";
  reasons: ReleaseReason[];
}

export interface ReleaseDecisionResult {
  proposal_id: string;
  recorded: boolean;
  error: string | null;
}

/** The portal's own cap, under the backend's 50 MB and common proxy limits. */
export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
