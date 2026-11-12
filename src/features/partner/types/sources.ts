/**
 * Partner chapter sources — mirror of the `Source*` schemas in the backend's
 * `contracts/openapi/api.json` (ADR 0014). A source is one uploaded chapter
 * PDF and the state of its ingestion run; its `source_id` is the same key the
 * visual library uses.
 */

import type { VisualReviewSummary } from "./visuals";

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

/**
 * States a source may be deleted in: every state but `queued` (cancel it first) and `running` (it cannot be stopped).
 * A source whose chapter was published is never deleted, whatever its state (see `deleteBlockedReason`).
 */
export const DELETABLE_STATES: ReadonlySet<SourceState> = new Set([
  "registered",
  "review_needed",
  "invalid",
  "ready",
  "failed",
]);

/**
 * Why the server would refuse to delete this source (`DELETE /v1/sources/{id}`), or null when it would not. The server
 * also refuses a source an older, published run came from, which the list cannot see; its 409 says so.
 */
export function deleteBlockedReason(source: {
  state: SourceState;
  release?: SourceReleaseRef | null;
}): string | null {
  if (source.release?.state === "published")
    return "Published chapters can't be deleted: students are learning from them.";
  if (source.state === "queued")
    return "Stop the queued run first, then delete the chapter.";
  if (source.state === "running")
    return "A run in progress can't be stopped. Delete the chapter once it finishes.";
  return null;
}

/** States the worker is still on; the registry keeps polling while any row is in one. */
export const ACTIVE_STATES: ReadonlySet<SourceState> = new Set([
  "queued",
  "running",
]);

/**
 * The registry's status filter, in the order a run moves through them. Worded as the rows say it (`NEXT_STEP_COPY`):
 * the filter can only ask the server for a state, so each hint names the row titles that state can show.
 */
export const SOURCE_STATE_LABELS: Record<SourceState, string> = {
  registered: "Not started",
  queued: "Waiting to start",
  running: "Processing",
  review_needed: "Confirm concepts",
  invalid: "Needs a fix",
  ready: "Ready for review or live",
  failed: "Something went wrong",
};

export const SOURCE_STATE_HINTS: Record<SourceState, string> = {
  registered: "Uploaded, not run yet",
  queued: "In line for a run",
  running: "Reading, understanding or building",
  review_needed: "Tell us which concepts are the same",
  invalid: "Upload again, add questions or accept redraws",
  ready: "Ready for your review, or live for students",
  failed: "The run stopped; run it again",
};

/** The stages of an ingestion run, in order (backend `gened_ingestion.progress.STAGES`). A run without teaching
 * visuals skips `visuals`. */
export type IngestionStage =
  | "render"
  | "read_pages"
  | "components"
  | "reconcile"
  | "questions"
  | "figures"
  | "lesson"
  | "visuals"
  | "submit";

/** Each stage as a partner reads it, and what its counted units are called (if it has any). */
export const INGESTION_STAGES: Record<
  IngestionStage,
  { label: string; unit?: string }
> = {
  render: { label: "Preparing the pages" },
  read_pages: { label: "Reading pages", unit: "pages" },
  components: { label: "Finding the key concepts" },
  reconcile: { label: "Checking against existing concepts" },
  questions: { label: "Writing practice questions" },
  figures: { label: "Collecting figures" },
  lesson: { label: "Planning the lesson" },
  visuals: { label: "Drawing teaching visuals", unit: "visuals" },
  submit: { label: "Saving everything" },
};

/**
 * How far a run is (`SourceView.progress`): which stage of how many, the units done in it when it has countable
 * ones, and the percent of the whole run, which never goes backwards. While `running` it is the current run;
 * afterwards where the last run stopped (100 when it finished). Null before a run first reports.
 */
export interface SourceProgress {
  stage: IngestionStage;
  /** 1-based position of `stage` among `steps`. */
  step: number;
  steps: number;
  done: number;
  /** 0 for a stage without countable units: show the stage name without a count. */
  total: number;
  /** 0–100. */
  percent: number;
  updated_at: string;
  /** What the run has produced so far, kept for the rest of the run (absent from older runs). A count appears
   * once the stage that makes it has finished. */
  counts?: Partial<Record<IngestionCount, number>>;
  /** When each stage the run has reached started. */
  stage_started_at?: Partial<Record<IngestionStage, string>>;
  /** The checks the chapter failed, by check code, and how often; empty until validation and for a chapter that
   * passed. `SourceView.outcome.findings` adds who can fix each. */
  findings?: Record<string, number>;
  /** Core's reason for refusing the run's release (a `chapter_mismatch` names the title core already has). */
  refusal?: SourceRefusal | null;
  /** The chosen learning outcomes no lesson step of the run reaches: the chapter does not teach them. */
  uncovered_outcomes?: string[];
  /** The partner's last change of outcomes, after this run: what they removed and what they added. */
  outcome_correction?: {
    corrected_at: string;
    removed: string[];
    added?: string[];
  } | null;
}

export interface SourceRefusal {
  code: string;
  path: string;
  detail: string;
}

/** `PUT /v1/sources/{id}/chapter`: where the chapter sits. 409 while it runs, once core has filed it, or when another
 * chapter already has that place. */
export interface ChapterCorrection {
  book_title: string;
  edition_label: string;
  chapter_ordinal: number;
  chapter_title: string;
}

/** What the partner can do next about a chapter (backend `SourceOutcome.next_step`; see
 * backend `docs/specs/PARTNER_INGESTION_OUTCOME_v1.md`). */
export type NextStep =
  | "wait"
  | "start"
  | "answer_questions"
  | "review_release"
  | "review_visuals"
  /** Questions need their picture, but no redraw waits for you: the drawing failed its own checks. Run again. */
  | "redraw_pictures"
  | "add_questions"
  | "upload_pages_with_questions"
  | "upload_clearer_pdf"
  | "upload_again"
  | "contact_gened"
  | "run_again"
  /** Core files this book's chapter under another title (or the book under another edition): correct the chapter's
   * details (`PUT /v1/sources/{id}/chapter`), then run it again. */
  | "fix_chapter_details"
  | "fix_edition_label"
  /** The chapter does not teach some chosen learning outcomes (`SourceProgress.uncovered_outcomes`): remove them or choose others
   * (`PUT /v1/sources/{id}/outcomes`), then run it again. */
  | "fix_outcomes"
  | "none";

/** One failed check: `partner` means a different upload fixes it, `gened` a problem on GenEd's side. */
export interface SourceFinding {
  check: string;
  count: number;
  owner: "partner" | "gened";
}

/** The server's decision about what a chapter's newest run means for the partner: render `next_step` as the row's
 * one action, and the run button only when `can_run_again` (a re-run of an upload whose failed checks are the
 * partner's is refused with 409: it would end the same way). */
export interface SourceOutcome {
  next_step: NextStep;
  findings: SourceFinding[];
  can_run_again: boolean;
  run_again_blocked: "already_running" | "same_result" | null;
}

/** The closed names of what a run reports it produced (backend `gened_ingestion.progress.COUNTS`). */
export type IngestionCount =
  | "pages"
  | "unreadable_pages"
  | "model_calls"
  | "sections"
  | "components"
  | "components_new"
  | "components_matched"
  | "questions"
  | "questions_computed"
  | "question_variants"
  | "questions_skipped"
  | "questions_removed"
  | "questions_held"
  | "misconceptions"
  | "figure_groups"
  | "lesson_nodes"
  | "plan_steps"
  | "violations"
  | "warnings";

/**
 * Where a source's newest run landed: the review batch it was staged as. `ready` waits for the partner's review,
 * `blocked` failed the server's checks, `published` reached students, `abandoned` was replaced by a later run.
 */
export interface SourceReleaseRef {
  batch_id: string;
  state: "staging" | "blocked" | "ready" | "published" | "abandoned";
  staged_at: string;
  published_at: string | null;
}

export interface SourceChapter {
  ordinal: number;
  title: string;
  first_pdf_page: number;
  last_pdf_page: number;
}

/**
 * Pages of the upload the server left out because they are the chapter's solutions appendix (the answers to its
 * questions), not lessons. `pending` until the partner confirms the cut or includes the pages
 * (`PUT /v1/sources/{id}/excluded-pages`); publishing waits for an answer.
 */
export interface ExcludedPages {
  first_page: number;
  last_page: number;
  reason: "solutions_appendix";
  status: "pending" | "confirmed" | "included";
}

export type ExcludedPagesDecision = "confirm" | "include";

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
  /** How far the current (or last) run got; poll `GET /v1/sources` every few seconds while `running`. */
  progress?: SourceProgress | null;
  /** Pages left out at upload as the solutions appendix; null when nothing was left out. */
  excluded_pages?: ExcludedPages | null;
  /** The review batch the newest run was staged as; null until a run reaches review. */
  release?: SourceReleaseRef | null;
  /** What to do next, who can fix a failed check, and whether running again is allowed. */
  outcome?: SourceOutcome;
  /** Whether `GET /v1/sources/{id}/authoring` has something to complete (the last run found too few questions). */
  has_authoring?: boolean;
  /** How many questions the partner answered or added so far. */
  authored?: number;
  authored_at?: string | null;
  /** The partner's request for AI-drafted questions; null when none. */
  queued_at: string | null;
  /** When the server picked up the newest run. */
  started_at?: string | null;
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

export const REJECT_REASONS: {
  code: Exclude<ReleaseReason, "accepted_as_is">;
  label: string;
}[] = [
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
  /** The release students see now, when it is not the one under review (a newer run is waiting); null otherwise. */
  live?: ReleaseSummary | null;
  /** Where the review of the chapter's visuals stands: its pictures and the redraws asked for. */
  visual_review?: VisualReviewSummary | null;
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

/** The portal's cap: the backend's own 50 MB limit. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

// ── Completing a chapter's questions (backend ADR 0036; docs/specs/PARTNER_INGESTION_OUTCOME_v1.md) ──

/** A section of the chapter, with its printed text, to write questions about. */
export interface AuthoringSection {
  key: string;
  title: string;
  text: string;
}

/** A concept the run proposed in one section; every question checks exactly one. */
export interface AuthoringConcept {
  key: string;
  section_key: string;
  title: string;
  definition: string;
}

/** A printed question the run removed that the partner's key would rescue. */
export interface RemovedQuestion {
  /** Answer it under this key in `AuthoredQuestions.answers`. */
  item_key: string;
  section_key: string;
  prompt: string;
  /** `answer_check_disagreed` (often a picture question), `not_machine_scorable` (an open question), or another. */
  reason: string;
  /** Printed choices: answer with `correct_option_index`. */
  options: string[];
  /** The key the run read, which the independent check did not reproduce. */
  run_key: string | null;
  /** The run tied it to no concept: name one of its section's in `concept_key`. */
  needs_concept: boolean;
}

/** The partner's key for a removed printed question: exactly one of the three keys. */
export interface PrintedAnswer {
  expected_numeric?: string;
  correct_option_index?: number;
  accepted_answers?: string[];
  concept_key?: string;
}

export type AddedAnswerKind =
  | "mcq"
  | "multi_select"
  | "sequence"
  | "matching"
  | "grouping"
  | "blanks"
  | "numeric"
  | "string_set"
  | "activity";

/** How a learner answers an activity (backend ADR 0048): free writing, free speech, reading a passage aloud, or answering after hearing it. */
export type ActivityMode = "write" | "speak" | "read_aloud" | "listen";

/**
 * A question for one proposed concept, in any format (backend ADR 0045): written by the partner (`partner`) or a model draft the
 * partner accepted, edited or not (`ai_assisted`). `replaces` names the printed question it is an edit of; `entry` places a numeric
 * answer on a number line, so no learner types it.
 */
export interface AddedQuestion {
  id: string;
  section_key: string;
  concept_key: string;
  prompt: string;
  answer_kind: AddedAnswerKind;
  expected_numeric?: string;
  options?: string[];
  correct_option_index?: number;
  accepted_answers?: string[];
  correct_option_indexes?: number[];
  sequence_entries?: string[];
  correct_order?: number[];
  match_left?: string[];
  match_right?: string[];
  match_pairs?: { left: number; right: number }[];
  group_names?: string[];
  group_entries?: string[];
  group_of?: number[];
  blank_answers?: string[][];
  word_bank?: string[];
  entry?: {
    mode: "number_line" | "slider";
    min: string;
    max: string;
    step: string;
  };
  replaces?: string;
  explanation?: string;
  /** An activity's mode (ADR 0048); only for `answer_kind: "activity"`. */
  activity_mode?: ActivityMode;
  /** An activity's optional criteria: what a good answer includes. Learners never see it. */
  rubric?: string;
  /** An activity's optional example of a good answer. Learners never see it. */
  example_answer?: string;
  /** A reading-aloud or listening activity's passage from the chapter: shown to read, or only played to listen to. */
  passage?: string;
  origin: "partner" | "ai_assisted";
}

/** A question the run kept, which the partner may edit; `needs_keyboard` ones pass no step until re-presented (ADR 0045). */
export interface PrintedQuestion {
  item_key: string;
  section_key: string;
  concept_key: string | null;
  prompt: string;
  format: string;
  needs_keyboard: boolean;
  options: string[];
  expected_numeric: string | null;
}

/** Everything the partner completed; `PUT .../authoring` replaces it. */
export interface AuthoredQuestions {
  answers: Record<string, PrintedAnswer>;
  added: AddedQuestion[];
  /** Printed questions (`item_key`) the partner took out of the chapter: reported as rejected. */
  removed?: string[];
  /** The figure a picture question is about, by its `item_key`: one of its `suggestions`. */
  pictures?: Record<string, string>;
}

/** A figure of a picture question's section; `key` is the visual library's target key (`<section key>:<reading order>`). */
export interface PictureFigure {
  key: string;
  page: number | null;
  role: string;
}

/**
 * Why a picture question is left out of the release: `not_identified` (which picture is unknown), `redraw_pending`
 * (its picture's redraw waits for review), `no_redraw` (its picture needs none, so nothing can be shown), or
 * `not_in_step` (a lesson step it is discussed at does not show its picture).
 */
export type PictureReason =
  "not_identified" | "redraw_pending" | "no_redraw" | "not_in_step";

/** A printed question that needs a picture, as the last run decided it. */
export interface PictureQuestion {
  item_key: string;
  section_key: string;
  prompt: string;
  page: number | null;
  status: "shown" | "held" | "removed";
  reason: PictureReason | null;
  figures: string[];
  chosen: string | null;
  /** Its section's figures, nearest page first. */
  suggestions: PictureFigure[];
}

/** How an AI-prepared question's key was checked (backend ADR 0047): by code, by an independent solve, or not yet. */
export type Verification =
  "machine_verified" | "solver_agreed" | "needs_partner_check" | "unverified";

export type RejectionReason =
  | "incorrect"
  | "ambiguous"
  | "off_objective"
  | "too_easy"
  | "too_hard"
  | "duplicate"
  | "unclear_language"
  | "inappropriate"
  | "other";

/** What a reviewer sees beside a bank question (backend `bank_contract.QuestionMeta`). */
export interface BankQuestionMeta {
  obligation_keys: string[];
  evidence_kind: string;
  strength: "strong" | "weak";
  strength_reason: string;
  family_key: string;
  variant_of?: string | null;
  difficulty: "easy" | "medium" | "hard";
  prerequisites?: string[];
  provenance:
    | "textbook_printed"
    | "textbook_adapted"
    | "original_curriculum_aligned"
    | "real_world_external";
  source_basis: string;
  quotes?: string[];
  computation?: string | null;
  distractors?: { option: string; misconception: string }[];
  remediation?: string | null;
  stimulus?: "none" | "passage" | "existing_figure";
  figure_id?: string | null;
  verification: Verification;
  findings?: string[];
}

export interface BankQuestionContent {
  body: AddedQuestion;
  meta: BankQuestionMeta;
}

export interface BankQuestion {
  question_id: string;
  section_key: string;
  concept_key: string;
  state: "draft" | "accepted" | "rejected";
  /** Every decision or edit names this; a stale one is refused (409). */
  version: number;
  revision: number;
  origin: "ai" | "partner" | "imported";
  verification: Verification;
  question: BankQuestionContent;
  concept_in_chapter: boolean;
}

export interface BankObligation {
  key: string;
  statement: string;
  production: boolean;
  draft_families: number;
  approved_families: number;
  draft_covered: boolean;
  approved_covered: boolean;
}

/** Why a family slot is still open, from the latest authoring run (backend `node.gap_reasons`). */
export interface BankOpenSlot {
  slot: string;
  category:
    | "curriculum_issue"
    | "unresolved_correctness"
    | "retries_exhausted"
    | "generation_defect";
  detail: string;
  last_reasons?: string[];
}

export interface BankConcept {
  concept_key: string;
  title: string;
  /** planned; held by the curriculum audit; left out of the plan; or writing/speaking only (backend `bank_completeness`). */
  status: "planned" | "held" | "not_planned" | "capability_gap";
  why: string | null;
  understanding: string | null;
  misconceptions: string[];
  obligations: BankObligation[];
  open_slots: BankOpenSlot[];
}

export interface BankNode {
  section_key: string;
  title: string;
  concepts: BankConcept[];
  quarantined: string[];
  /** Every ingested step is listed; only `ready_for_review` has every checkable objective covered. */
  status: "ready_for_review" | "capability_gap" | "incomplete";
  /** Verified or accepted questions from distinct families, no variants or repeats; ready needs at least `review_floor`. */
  reviewable: number;
  review_floor: number;
  draft_ready: boolean;
  approved_ready: boolean;
  publishable: boolean;
}

export interface BankFinding {
  concept_key: string;
  issue: string;
  evidence: string;
  resolution: "corrected" | "quarantined";
  proposed_definition?: string | null;
  proposed_lo_code?: string | null;
}

export interface BankRun {
  run_id: string;
  scope: "chapter" | "node";
  section_key: string | null;
  state: "queued" | "running" | "ready" | "stopped" | "failed";
  spent_usd: number;
  detail: string | null;
  nodes: {
    section_key: string;
    dropped?: { prompt: string; reasons: string[] }[];
    gaps?: string[];
    bank_issues?: string[];
  }[];
  created_at: string;
}

/** `GET /v1/sources/{id}/bank`: the chapter's AI-prepared assessment package (backend ADR 0047). */
export interface BankPackage {
  version: string;
  findings: BankFinding[];
  nodes: BankNode[];
  questions: BankQuestion[];
  runs: BankRun[];
  summary: {
    nodes: number;
    questions: number;
    accepted: number;
    needs_attention: number;
    draft_ready_nodes: number;
    capability_gap_nodes: number;
    incomplete_nodes: number;
    concepts: Record<BankConcept["status"], number>;
    approved_ready_nodes: number;
    publishable_nodes: number;
    open_issues: number;
    authoring: BankRun["state"] | null;
  };
  /** Bulk acceptance only: questions skipped because an independent check doubts them, and stale ones. */
  skipped?: string[];
  stale?: string[];
}

/** `GET /v1/sources/{id}/authoring`. */
export interface AuthoringResponse {
  sections: AuthoringSection[];
  concepts: AuthoringConcept[];
  removed: RemovedQuestion[];
  /** The questions the run kept (backend ADR 0045); absent from an older backend. */
  printed?: PrintedQuestion[];
  /** Every printed question that needs a picture; absent from an older backend. */
  pictures?: PictureQuestion[];
  authored: AuthoredQuestions;
  authored_at: string | null;
}

/** `GET /v1/sources/books`: a book the partner filed chapters under, for the upload form's book picker. */
export interface PartnerBook {
  book_title: string;
  /** Filled in with the title when the partner picks the book, so one book is never filed under two editions. */
  edition_label: string;
  board: string;
  publisher: string;
  /** The exact catalogue subject name. */
  subject: string;
  grade: number;
  /** How many of the partner's uploads name this book and edition. */
  chapters: number;
  last_used_at: string;
}
