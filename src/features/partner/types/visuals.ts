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

/** What a recorded decision can say: a partner's reasons, or one the backend records on their behalf. */
export type DecisionReason = ReasonCode | "accepted_as_is" | "recropped";

export const DECISION_REASON_LABELS: Record<DecisionReason, string> = {
  ...REASON_LABELS,
  accepted_as_is: "As it was",
  recropped: "Replaced by a new crop",
};

/** Max length of the free-text note sent with a reject or regenerate. */
export const NOTE_MAX = 500;

export interface VisualCritique {
  passes: boolean;
  problems: string[];
  /** One per problem: `content` changes what the picture says (a colour, count, label, position), else `style`.
   * A textbook-figure redraw reaches you even with content problems: compare it with the original. */
  kinds?: ("content" | "style")[];
}

/** `drawn`: a picture the model drew; `textbook_crop`: the figure as printed, cut from its textbook page. */
export type VisualOrigin = "drawn" | "textbook_crop";

export interface VisualSummary {
  id: string;
  /** `figure`: a textbook figure (redrawn, or its crop); `node`: a lesson step; `card`: the chapter cover. */
  kind: "node" | "figure" | "card";
  origin: VisualOrigin;
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
  title: string | null;
  purpose: string;
  layout: string;
  caption: string | null;
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
  figure_descriptions?: string[];
  feedback: null | {
    reason_codes: ReasonCode[];
    note: string | null;
    /** Null when a textbook crop was sent for a redraw: it had no spec. */
    previous_spec: VisualSpec | null;
  };
}

export interface VisualDecisionView {
  decision: "accept" | "reject";
  reason_codes: DecisionReason[];
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
  /** Null when the visual has no generation spec: a textbook crop, cut from the page rather than drawn from a spec. */
  spec: VisualSpec | null;
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
  /**
   * The last item's `id`, sent with `before`. One run's visuals share a
   * `created_at` (one transaction), so the cursor is the `(created_at, id)` pair.
   */
  before_id?: string;
  limit?: number;
}

/** A box on a page in thousandths of its height and width: [ymin, xmin, ymax, xmax]. */
export type CropBox = [number, number, number, number];

/** Most boxes one re-crop may cut; they are joined top to bottom into one picture. */
export const CROP_MAX_BOXES = 6;

export interface CropPage {
  /** The PDF page number. */
  page: number;
  width: number;
  height: number;
  /** Relative, signed, public path, like `image_url`. */
  image_url: string | null;
}

/** What the crop editor opens on: the figure's pages and its current crops, in the order the picture shows them. */
export interface VisualCrop {
  pages: CropPage[];
  boxes: { page: number; box: CropBox }[];
}

export interface VisualRecropIn {
  content_hash: string;
  boxes: { page: number; box: CropBox }[];
}

/** The new textbook crop, pending review; `created` is false when the same crop already existed. */
export interface VisualRecropOut {
  id: string;
  created: boolean;
}
