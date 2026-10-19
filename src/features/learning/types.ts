/**
 * The lesson screen's contract with the new backend (`feat/visual-library`):
 * - teacher turns: `gened_tutoring/turns/contracts.py` (stream protocol `teacher_turn_stream_v3`);
 * - the session payload: `gened_tutoring/schema_v5.py` (`teacher_node_v5`), only the fields the UI reads;
 * - answers and the report: `gened_learning/routes.py`, `gened_learning/reporting.py`.
 * The UI never decides correctness or progression; it renders what these say.
 */
import type { InstanceState } from "@/features/student/learner/types";

export type { ActiveNode, InstanceState, InstanceNextAction } from "@/features/student/learner/types";

// ── Teacher turns ──────────────────────────────────────────────────────────

export type TurnKind = "opening" | "learner_message" | "result_reaction" | "hint" | "regenerate";
export type VoiceLanguage = "en" | "hi" | "hi-Latn" | "mr" | "pa" | "ta" | "te" | "kn";

/**
 * `POST /v1/instances/{id}/teacher-turns`. The server enforces which fields go with which kind:
 * `learner_message` needs `text` + `latency_ms`; `hint` needs `item_id`; `result_reaction` needs
 * `attempt_id`; `regenerate` needs `regenerates`; `modality: "voice"` needs `language`.
 */
export interface TurnRequest {
  /** Client-made UUID: retrying the same POST resumes the same turn. */
  turn_id: string;
  kind: TurnKind;
  instance_node_id: string;
  text?: string;
  latency_ms?: number;
  attempt_id?: string;
  item_id?: string;
  routing_mode?: "auto" | "conversation_only";
  regenerates?: string;
  /** The turn this one cuts off, and the last seq the learner saw of it. */
  interrupts?: { turn_id: string; visible_seq: number };
  modality?: "text" | "voice";
  language?: VoiceLanguage;
}

export type FailureReason =
  | "first_token_timeout" | "stream_interrupted" | "model_error" | "policy_refused" | "safety_refused"
  | "safety_unavailable" | "prepare_failed" | "record_failed" | "context_drift";

export type InterruptionCause =
  | "learner_stop" | "superseded" | "client_gone" | "deadline" | "server_lost" | "server_shutdown";

interface Sequenced {
  v: 3;
  turn_id: string;
  seq: number;
}

/** Set when a regenerate turn replays its source's committed facts; nothing was recorded again. */
interface Fact extends Sequenced {
  replayed_from?: string | null;
}

export interface TurnStartedEvent extends Sequenced {
  type: "turn_started";
  kind: TurnKind;
  instance_node_id: string;
  session_id?: string | null;
  instance_revision: number;
  protocol: "teacher_turn_stream_v3";
  regenerates?: string | null;
}
export interface SafetyAppliedEvent extends Fact {
  type: "safety_applied";
  response_mode: "constrained" | "safe_template";
}
export interface AnswerRecordedEvent extends Fact {
  type: "answer_recorded";
  attempt_id: string;
  item_id: string;
  outcome: "correct" | "incorrect" | "quarantined";
  correct?: boolean | null;
  round_state: "open" | "passed" | "failed";
}
export interface StateChangedEvent extends Fact {
  type: "state_changed";
  instance: InstanceState;
}
/** No URL: resolve the group against the presentation manifest. At most one per turn. */
export interface FigurePresentedEvent extends Fact {
  type: "figure_presented";
  figure_group_id: string;
}
/** `text` is null exactly when withheld (redacted, or suppressed past the transcript); the seq still counts. */
export interface TextDeltaEvent extends Sequenced {
  type: "text_delta";
  text: string | null;
  redacted?: boolean;
  suppressed?: boolean;
}
export interface TurnCompletedEvent extends Sequenced {
  type: "turn_completed";
  status: "completed" | "incomplete";
  finish_reason: "stop" | "max_tokens" | "blocked" | "other";
  first_token_ms?: number | null;
  duration_ms?: number | null;
}
export interface TurnFailedEvent extends Sequenced {
  type: "turn_failed";
  reason: FailureReason;
  retryable: boolean;
  /** `regenerate` exactly when retryable. */
  retry: "none" | "regenerate";
}
/** The canonical transcript ends at `transcript_through_seq`: drop any text rendered past it. */
export interface TurnInterruptedEvent extends Sequenced {
  type: "turn_interrupted";
  cause: InterruptionCause;
  transcript_through_seq: number;
}
/** Sent after silence; not sequenced, never moves the resume cursor. */
export interface KeepaliveEvent {
  v: 3;
  type: "keepalive";
  turn_id: string;
  committed_through_seq: number;
}

export type SequencedTurnEvent =
  | TurnStartedEvent | SafetyAppliedEvent | AnswerRecordedEvent | StateChangedEvent | FigurePresentedEvent
  | TextDeltaEvent | TurnCompletedEvent | TurnFailedEvent | TurnInterruptedEvent;
export type TurnStreamFrame = SequencedTurnEvent | KeepaliveEvent;

export const TERMINAL_EVENT_TYPES = ["turn_completed", "turn_failed", "turn_interrupted"] as const;

/** `GET /v1/instances/{id}/teacher-turns`: a node's recorded turns, oldest first. */
export interface RecordedTurn {
  turn_id: string;
  kind: TurnKind;
  status: string;
  route?: "opening" | "answer" | "doubt" | "engagement" | "result_reaction" | "hint" | "safety" | "confirm_reading" | null;
  learner_text?: string | null;
  teacher_text?: string | null;
  attempt_id?: string | null;
  created_at: string;
  closed_at?: string | null;
  redacted?: boolean;
  item_id?: string | null;
  outcome?: "correct" | "incorrect" | "quarantined" | null;
  correct?: boolean | null;
  failure_reason?: FailureReason | null;
  committed_through_seq?: number;
  transcript_through_seq?: number | null;
  figure_group_ids: string[];
}

export interface TurnInterruptOut {
  turn_id: string;
  status: string;
  transcript_through_seq?: number | null;
}

// ── Session payload and pictures ───────────────────────────────────────────

/** One picture. Show `learner_alt_text`; `tutor_description` is the tutor's, never the learner's. */
export interface FigureCrop {
  source: "generated_visual" | "textbook_crop";
  id: string;
  width_px: number;
  height_px: number;
  mime: string;
  printed_text: string;
  learner_alt_text: string;
}

export interface FigureGroup {
  id: string;
  reading_order: number;
  after_chunk_id?: string | null;
  figures: FigureCrop[];
}

export interface CheckOption {
  id: string;
  text: string;
}

export interface CheckItem {
  id: string;
  prompt: string;
  response_type: "numeric" | "numeric_set" | "symbolic" | "string_set" | "mcq" | "sequence" | "matching";
  role: "checkpoint" | "formative_probe";
  options: CheckOption[];
  figure_groups: FigureGroup[];
}

export interface NodeOutline {
  node_id: string;
  title: string;
  type: "teach" | "practice" | "assess";
}

/** `GET /v1/instances/{id}/teacher-payload` (`teacher_node_v5`), narrowed to what the screen reads. */
export interface TeacherPayload {
  schema_version: "teacher_node_v5";
  node: {
    id: string;
    title: string;
    type: "teach" | "practice" | "assess";
    teach_only: boolean;
    sections: Array<{ id: string; title: string; path: string[]; chunks: Array<{ id: string; text: string; page: number }> }>;
    figure_groups: FigureGroup[];
    check_items: CheckItem[];
    est_minutes: number;
  };
  student_context: {
    /** Up to 3 upcoming nodes: the progress rail's look-ahead (the backend has no full plan list yet). */
    next_nodes: NodeOutline[];
  };
}

/** One picture's signed URL (relative to the API; it expires at `expires_at`). */
export interface ManifestFigure {
  figure_group_id: string;
  url: string;
  width_px: number;
  height_px: number;
  mime: string;
  sha256: string;
}

/** `GET …/teacher-payload/presentation-manifest`: keyed by picture id, the current node's pictures only. */
export interface PresentationManifest {
  /** Unix seconds. */
  expires_at: number;
  figures: Record<string, ManifestFigure>;
}

// ── Answers and the report ─────────────────────────────────────────────────

export type AnswerResponse =
  | { kind: "numeric"; value: string }
  | { kind: "choice"; option_ids: string[] }
  | { kind: "text"; text: string }
  | { kind: "ordered"; items: unknown[] }
  | { kind: "pairs"; pairs: unknown[] };

/** `POST /v1/instances/{id}/responses`. */
export interface AnswerBody {
  request_id: string;
  item_id: string;
  expected_revision: number;
  channel: "typed" | "choice" | "voice";
  latency_ms: number;
  assisted?: boolean;
  response?: AnswerResponse;
  transcript?: string;
  confirmed_reading?: boolean;
}

/** `needs_confirmation`: nothing was committed; `reading` holds a "did you mean …?" to resubmit. */
export interface AnswerResult {
  attempt_id: string | null;
  outcome: "correct" | "incorrect" | "unscorable" | "quarantined" | "needs_confirmation";
  correct: boolean | null;
  eligibility_reason: string | null;
  round_id: string | null;
  round_state: "open" | "passed" | "failed" | null;
  replayed: boolean;
  instance: InstanceState;
  reading?: { item_id: string; original: string; suggestion: string } | null;
}

/** `GET /v1/instances/{id}/report`. */
export interface ChapterReport {
  instance_id: string;
  chapter_id: string;
  completed: boolean;
  nodes_done: number;
  nodes_total: number;
  outcomes: Array<{ lo_id: string; code: string; title: string; status: string; mastered: boolean }>;
  keep_practising: Array<{ component_id: string; title: string; status: string; needs_adult_support: boolean }>;
  answers: { answered: number; correct: number };
}
