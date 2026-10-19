/**
 * Wire types for `/api/onboarding/placement/*`.
 *
 * Mirrors docs/merged-onboarding-frontend-integration.md. The backend now
 * batches by subject block rather than by item — `start` and the block POST
 * both hand back a whole subject's worth of items at once, graded together.
 *
 * Two invariants from the contract are encoded here rather than left to
 * convention:
 *
 *  - No in-form type carries `answer_key` or `explanation`. Those exist only on
 *    `PlacementResultItem`, i.e. only after the form is COMPLETED. The backend
 *    has a test asserting the item model has no such fields; don't add them.
 *  - Nothing in the block-submit response carries `is_correct`. This is a
 *    placement test, not practice — telling a child mid-form that some
 *    answers were wrong changes how they answer the rest. Correctness is
 *    revealed once, on the result screen. Do not infer it client-side.
 */

export type PlacementItemType =
  | "mcq"
  | "true_false"
  | "multi_select"
  | "numeric"
  | "fill_blank"
  | "match"
  | "order"
  | "map_point"
  | "chart";

/**
 * A batch's slot names are `<family>_<ordinal>` (`mcq_1`, `mcq_2`,
 * `true_false_1`, `visual_1`, `flex_1`, and ordinals climb when a batch
 * backfills — `mcq_3`). Kept as an opaque string rather than a closed union
 * because the ordinal is unbounded; the item screen's own layout doesn't
 * key off it (a CSS multi-column masonry, see `PlacementBoard.tsx`).
 */
export type PlacementSlot = string;

export interface PlacementOption {
  id: string;
  text: string;
}

export interface PlacementChartBar {
  id: string;
  label: string;
  value: number;
}

/** `block_spec`, discriminated by the item's `item_type`. */
export type BlockSpec =
  | { options: PlacementOption[] }                                  // mcq, multi_select
  | { statement: string }                                           // true_false
  | { input: "integer" | "fraction"; unit?: string }                // numeric
  | { input: "word" }                                               // fill_blank
  | { left: PlacementOption[]; right: PlacementOption[] }           // match
  | { items: PlacementOption[] }                                    // order
  | {                                                                // map_point
      image: string;
      width: number;
      height: number;
      /** A radius, in the same pixel space, for sizing an honest hit target — never the target itself. */
      tolerance: number;
      /** Licence attribution for the vendored image. */
      source_url: string;
      /** Drift guard against the vendored file — see MapPointItem.tsx. */
      sha256: string;
    }
  | { chart_type: "bar"; data: PlacementChartBar[]; y_label?: string; target_label?: string }; // chart

export interface PlacementItem {
  item_id: string;
  index: number;
  subject: string;
  strand: string;
  item_type: PlacementItemType;
  slot: PlacementSlot;
  prompt: string;
  block_spec: BlockSpec;
  /** "en" | "hi" — Hindi items are authored in Devanagari. Never transliterate. */
  item_language: string;
  /** An authoring estimate for pacing. NOT a limit — never build a countdown. */
  expected_time_sec?: number;
}

/** The answer payload, one shape per item type. */
export type PlacementResponse =
  | { choice: string }              // mcq, true_false
  | { selected: string[] }          // multi_select — order-independent; chart — single-select, one id
  | { value: number }               // numeric, input: "integer"
  | { text: string }                // fill_blank, and numeric input: "fraction"
  | { pairs: [string, string][] }   // match — order-independent
  | { order: string[] }             // order — an exact sequence
  | { point: { x: number; y: number } }; // map_point — block_spec pixel space

/**
 * The rail entry for one batch — no item content, just enough to draw
 * progress. A batch mixes several subjects (see `item.subject`) and carries
 * no subject of its own. `answered` is non-zero when the student abandoned
 * this batch half-way and is now resuming it.
 */
export interface PlacementBlockSummary {
  block_index: number;
  item_count: number;
  start_index: number;
  answered: number;
  /** Ordered slots the bank filled for this block — never padded. */
  slots: PlacementSlot[];
}

/** A full block, items included — the thing that actually renders. */
export interface PlacementBlockContent extends PlacementBlockSummary {
  items: PlacementItem[];
}

export type PlacementAttemptStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export interface PlacementStartResponse {
  attempt_id: string;
  student_id: string;
  board: string;
  grade: number;
  bank_version: string;
  status: Exclude<PlacementAttemptStatus, "NOT_STARTED">;
  current_index: number;
  total_items: number;
  total_blocks: number;
  /** The rail: every block, in order, no item content. */
  blocks: PlacementBlockSummary[];
  /** The block to render now. Null only when `is_complete`. */
  current_block: PlacementBlockContent | null;
  is_complete: boolean;
}

export interface PlacementBlockAnswer {
  item_id: string;
  response: PlacementResponse;
  /** Optional and advisory — feeds item statistics later. */
  elapsed_ms?: number;
}

export interface PlacementBlockAnswerRequest {
  answers: PlacementBlockAnswer[];
}

export interface PlacementBlockAnswerResponse {
  /** How many answers were newly recorded — a replayed block returns 0. */
  accepted: number;
  current_index: number;
  total_items: number;
  is_complete: boolean;
  /** The next subject. Null only when `is_complete`. */
  next_block: PlacementBlockContent | null;
}

export interface PlacementScore {
  correct: number;
  total: number;
  /** correct / total, 0–1. Show this one, as a percentage. */
  normalized_score: number;
  /** The same figure on the platform's 0–4 mastery scale. */
  raw_score: number;
}

export interface PlacementSubjectScore extends PlacementScore {
  subject: string;
}

export interface PlacementSkillScore extends PlacementScore {
  skill_ref: string;
  subject: string;
  strand: string;
}

export interface PlacementResultItem {
  item_id: string;
  subject: string;
  strand: string;
  prompt: string;
  response: PlacementResponse;
  is_correct: boolean;
  answer_key: PlacementResponse;
  explanation: string;
}

export interface PlacementResult extends PlacementScore {
  attempt_id: string;
  board: string;
  grade: number;
  bank_version: string;
  subjects: PlacementSubjectScore[];
  skills: PlacementSkillScore[];
  /** Per-item review, in form order. */
  items: PlacementResultItem[];
}

export interface PlacementStatus {
  board: string;
  grade: number;
  attempt_status: PlacementAttemptStatus;
  current_index: number;
  total_items: number;
  /** Enumerated from the question bank, not the LO taxonomy. */
  subjects: { subject: string; status: "PENDING" | "COMPLETED" }[];
}

/**
 * Error codes the placement endpoints return in `error_code`.
 * See PLACEMENT_ERROR_COPY / the store for how each is handled.
 */
export const PLACEMENT_ERROR = {
  /** Malformed student_id / attempt_id — a bug on our side. */
  BAD_ID: "ONBD_1101",
  /** The student record has no grade. */
  NO_GRADE: "ONBD_1102",
  /** No form for this board+grade (ICSE, or outside grades 3–9). Skip silently. */
  NO_FORM: "ONBD_1104",
  /** Attempt not found, or not yours. Restart from `start`. */
  NO_ATTEMPT: "ONBD_1105",
  /** Block not in this form / read-ahead / the student's grade changed. */
  BAD_ITEM: "ONBD_1106",
  /** Asked for results mid-form. */
  IN_PROGRESS: "ONBD_1107",
} as const;

export type PlacementErrorCode = (typeof PLACEMENT_ERROR)[keyof typeof PLACEMENT_ERROR];
