/**
 * Visual library review types — mirror of the `Visual*` schemas in the
 * backend's `contracts/openapi/api.json` (see
 * `docs/specs/VISUAL_LIBRARY_FRONTEND_HANDOFF_v1.md`). Hand-written, like the
 * placement types; the OpenAPI document wins if the two ever differ.
 */

export type CandidateState = "pending" | "accepted" | "rejected";

export type ReasonCode =
  | "inaccurate"
  | "unclear"
  | "cluttered"
  | "wrong_grade_level"
  | "text_error"
  | "style_inconsistent"
  | "not_helpful"
  | "other";

/** Partner-facing labels for the reject reasons, in display order. */
export const REASON_LABELS: Record<ReasonCode, string> = {
  inaccurate: "Wrong or misleading",
  unclear: "Hard to understand",
  cluttered: "Too busy",
  wrong_grade_level: "Wrong level for this grade",
  text_error: "Spelling or text mistake",
  style_inconsistent: "Doesn't match our style",
  not_helpful: "Doesn't help teach this",
  other: "Something else (explain in the note)",
};

export const REASON_CODES = Object.keys(REASON_LABELS) as ReasonCode[];

/** Max length of the free-text note sent with a reject or regenerate. */
export const NOTE_MAX = 500;

export interface VisualCritique {
  passes: boolean;
  problems: string[];
}

export interface VisualSummary {
  id: string;
  /** Sent back with the decision, so a stale view is rejected with a 409. */
  content_hash: string;
  component_id: string;
  source_id: string;
  subject: string;
  grade: number;
  chapter: string;
  title: string;
  caption: string | null;
  image_sha256: string;
  width: number;
  height: number;
  state: CandidateState;
  /** Set on a regenerated visual: the rejected one it replaces. */
  parent_id: string | null;
  created_at: string;
  /** The AI self-review. Advisory only. */
  critique: VisualCritique;
  /** Relative, signed, public path; expires within 15 minutes. Null when the backend cannot sign. */
  image_url: string | null;
}

export interface VisualSpec {
  title: string;
  purpose: string;
  layout: string;
  caption: string;
  objects: { id: string; what: string; colour: string; position: string; notes: string }[];
  texts: { text: string; role: "title" | "label" | "note" | "caption"; where: string }[];
  /** Which `concept.passages` the picture uses. */
  source_refs: string[];
  /** What the picture should visibly show. */
  checklist: string[];
}

export interface VisualConcept {
  component_id: string;
  source_id: string;
  subject: string;
  grade: number;
  chapter: string;
  section_title: string;
  title: string;
  definition: string;
  /** The textbook text the picture is based on. */
  passages: { ref: string; text: string }[];
  figure_descriptions: string[];
  feedback: null | {
    reason_codes: ReasonCode[];
    note: string | null;
    previous_spec: VisualSpec;
  };
}

export interface VisualDecisionView {
  decision: "accept" | "reject";
  reason_codes: ReasonCode[];
  note: string | null;
  actor_role: string;
  decided_at: string;
}

export type RegenerationState = "queued" | "claimed" | "done" | "failed";

export interface VisualRegenerationView {
  id: string;
  state: RegenerationState;
  attempts: number;
  result_candidate_id: string | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface VisualFamilyMember {
  id: string;
  parent_id: string | null;
  state: CandidateState;
  created_at: string;
}

export interface VisualDetail extends Omit<VisualSummary, "caption"> {
  concept: VisualConcept;
  spec: VisualSpec;
  checks: Record<string, unknown>;
  provenance: Record<string, unknown>;
  decision: VisualDecisionView | null;
  regeneration: VisualRegenerationView | null;
  /** Oldest first. */
  family: VisualFamilyMember[];
}

export interface VisualDecisionIn {
  content_hash: string;
  decision: "accept" | "reject";
  /** Required (≥ 1) for reject; omitted for accept. */
  reason_codes?: ReasonCode[];
  note?: string | null;
  /** Reject only: also ask for a new visual. */
  regenerate?: boolean;
}

export interface VisualDecisionOut {
  id: string;
  state: CandidateState;
  regeneration_id: string | null;
}

export interface VisualRegenerateIn {
  reason_codes: ReasonCode[];
  note?: string | null;
}

export interface VisualRegenerateOut {
  regeneration_id: string;
  state: "queued";
}

export interface VisualListParams {
  state?: CandidateState;
  subject?: string;
  grade?: number;
  source_id?: string;
  component_id?: string;
  /** ISO datetime: the last item's `created_at`, for the next page. */
  before?: string;
  limit?: number;
}
