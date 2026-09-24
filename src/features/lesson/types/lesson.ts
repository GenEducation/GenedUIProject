/**
 * Wire types for `/v1/chapters/{id}/instances` and `/v1/instances/{id}/*`.
 *
 * Mirrors contracts/openapi/api.json and docs/specs/TEACHER_TURN_v1.md,
 * docs/specs/TEXT_STREAMING_TRANSPORT_v1.md in the backend repo. Kept by
 * hand rather than generated because this UI has no OpenAPI codegen step;
 * re-check against `contracts/openapi/api.json` after a backend contract
 * change touches any of these paths.
 */

// ── Lesson state ────────────────────────────────────────────────────────────

export type NodeType = "teach" | "practice" | "assess";
export type NextAction = "learn" | "answer_checks" | "blocked" | "completed";
export type BlockedReason = "content_gap" | "needs_support";
export type InstanceLifecycle = "active" | "completed" | "abandoned";

export interface ActiveNode {
  instance_node_id: string;
  node_id: string;
  title: string;
  type: NodeType;
  reason: string;
  engagement_count: number;
  engagement_required: number;
  check_item_ids: string[];
  answered_item_ids: string[];
  round_id: string | null;
  round_ordinal: number | null;
}

export interface Blocked {
  instance_node_id: string;
  blocked_reason: BlockedReason;
}

export interface InstanceState {
  id: string;
  chapter_id: string;
  plan_version_id: string;
  revision: number;
  state: InstanceLifecycle;
  nodes_done: number;
  nodes_total: number;
  next_action: NextAction;
  active_node: ActiveNode | null;
  blocked: Blocked | null;
}

// ── Teacher payload (teacher_node_v2) ───────────────────────────────────────
// Only the fields the screen renders. The payload also carries mastery,
// misconceptions and routing reasons meant for the model, not the learner —
// those are read by the store for logic (e.g. check rendering) but never
// shown as-is.

export type CheckResponseType = "numeric" | "symbolic" | "string_set" | "mcq" | "sequence" | "matching";
export type CheckRole = "checkpoint" | "formative_probe";

export interface CheckOption {
  id: string;
  text: string;
}

export interface CheckItem {
  id: string;
  prompt: string;
  response_type: CheckResponseType;
  role: CheckRole;
  options: CheckOption[];
}

export interface ToolConfig {
  min: number | null;
  max: number | null;
  denominator: number | null;
  mode: "explore" | "compare" | "locate" | null;
}

export interface LessonTool {
  id: string;
  code: "area_model" | "fraction_comparison" | "number_line";
  version: string;
  component_ids: string[];
  config: ToolConfig;
}

export interface Asset {
  id: string;
  kind: "textbook_extract" | "verified_render";
  sha256: string;
  caption: string;
  alt_text: string;
}

export interface Chunk {
  id: string;
  element_type: string;
  text: string;
  page: number;
}

export interface Section {
  id: string;
  version_id: string;
  title: string;
  path: string[];
  chunks: Chunk[];
}

export interface TeacherPayloadNode {
  id: string;
  title: string;
  type: NodeType;
  teach_only: boolean;
  sections: Section[];
  assets: Asset[];
  tools: LessonTool[];
  check_items: CheckItem[];
  bloom: string;
  est_minutes: number;
}

export interface TeacherPayload {
  node: TeacherPayloadNode;
  [key: string]: unknown;
}

// ── Answers ──────────────────────────────────────────────────────────────
// response_type -> wire kind: numeric -> numeric, mcq -> choice,
// symbolic | string_set -> text, sequence -> ordered, matching -> pairs.
// (backend: domains/assessment/src/gened_assessment/rules.py)

export interface NumericResponse {
  kind: "numeric";
  value: string;
}

export interface ChoiceResponse {
  kind: "choice";
  option_ids: string[];
}

export interface TextResponse {
  kind: "text";
  text: string;
}

export interface OrderedResponse {
  kind: "ordered";
  items: string[];
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface PairsResponse {
  kind: "pairs";
  pairs: MatchPair[];
}

export type AnswerResponse = NumericResponse | ChoiceResponse | TextResponse | OrderedResponse | PairsResponse;

export interface AnswerBody {
  request_id: string;
  item_id: string;
  expected_revision: number;
  channel: "typed" | "choice" | "voice";
  latency_ms: number;
  response?: AnswerResponse | null;
  transcript?: string | null;
  assisted?: boolean;
}

export type AnswerOutcome = "correct" | "incorrect" | "unscorable" | "quarantined";
export type RoundState = "open" | "passed" | "failed";

export interface AnswerResult {
  attempt_id: string;
  outcome: AnswerOutcome;
  correct: boolean | null;
  eligibility_reason: string | null;
  round_id: string;
  round_state: RoundState;
  replayed: boolean;
  instance: InstanceState;
}

// ── Engagement, hints, done ─────────────────────────────────────────────────

export type EngagementSource = "student_text" | "student_voice" | "widget_interaction";

export interface EngagementBody {
  request_id: string;
  expected_revision: number;
  source: EngagementSource;
}

export interface HintBody {
  request_id: string;
  item_id: string;
}

export interface DoneBody {
  request_id: string;
  expected_revision: number;
}

// ── Report ───────────────────────────────────────────────────────────────

export type OutcomeStatus = "measured" | "not_fully_measurable" | "uncovered";

export interface ComponentCoverage {
  component_id: string;
  status: OutcomeStatus;
}

export interface OutcomeRollup {
  lo_id: string;
  code: string;
  title: string;
  status: OutcomeStatus;
  measurement_coverage: number | null;
  mastered: boolean;
  components: ComponentCoverage[];
}

export interface ChapterReport {
  instance_id: string;
  chapter_id: string;
  plan_version_id: string;
  completed: boolean;
  nodes_done: number;
  nodes_total: number;
  outcomes: OutcomeRollup[];
}

// ── Teacher turns ────────────────────────────────────────────────────────

export type TurnKind = "opening" | "learner_message" | "result_reaction" | "hint" | "regenerate";
export type RoutingMode = "auto" | "conversation_only";

export interface TurnInterrupt {
  turn_id: string;
  visible_seq: number;
}

export interface TurnRequest {
  turn_id: string;
  kind: TurnKind;
  instance_node_id: string;
  text?: string | null;
  latency_ms?: number | null;
  attempt_id?: string | null;
  item_id?: string | null;
  regenerates?: string | null;
  interrupts?: TurnInterrupt | null;
  routing_mode?: RoutingMode;
}

export type RecordedTurnKind = "opening" | "learner_message" | "result_reaction" | "hint" | "regenerate";
export type RecordedTurnRoute = "opening" | "answer" | "doubt" | "engagement" | "result_reaction" | "hint" | "safety";

export interface RecordedTurnOut {
  turn_id: string;
  kind: RecordedTurnKind;
  status: string;
  created_at: string;
  closed_at: string | null;
  learner_text: string | null;
  teacher_text: string | null;
  attempt_id: string | null;
  item_id: string | null;
  outcome: "correct" | "incorrect" | "quarantined" | null;
  correct: boolean | null;
  route: RecordedTurnRoute | null;
  redacted: boolean;
  committed_through_seq: number;
  transcript_through_seq: number | null;
  learner_visible_through_seq: number | null;
  visibility_source: "learner_reported" | "unknown" | null;
}

export interface TurnInterruptRequest {
  visible_seq: number;
}

export interface TurnInterruptOut {
  turn_id: string;
  status: string;
  transcript_through_seq: number | null;
  learner_visible_through_seq: number | null;
  visibility_source: "learner_reported" | "unknown" | null;
}

// ── Stream events (teacher_turn_stream_v2) ──────────────────────────────────
// docs/specs/TEXT_STREAMING_TRANSPORT_v1.md §4. Every sequenced frame carries
// v, type, turn_id, seq; a keepalive carries no seq/id and must never move
// Last-Event-ID.

export interface TurnStartedEvent {
  v: 2;
  type: "turn_started";
  turn_id: string;
  seq: number;
  kind: TurnKind;
  instance_node_id: string;
  session_id: string | null;
  instance_revision: number;
  protocol: string;
  regenerates: string | null;
}

export interface SafetyAppliedEvent {
  v: 2;
  type: "safety_applied";
  turn_id: string;
  seq: number;
  replayed_from: string | null;
  response_mode: "constrained" | "safe_template";
}

export interface AnswerRecordedEvent {
  v: 2;
  type: "answer_recorded";
  turn_id: string;
  seq: number;
  replayed_from: string | null;
  attempt_id: string;
  item_id: string;
  outcome: AnswerOutcome;
  correct: boolean | null;
  round_state: RoundState;
}

export interface StateChangedEvent {
  v: 2;
  type: "state_changed";
  turn_id: string;
  seq: number;
  replayed_from: string | null;
  instance: InstanceState;
}

export interface TextDeltaEvent {
  v: 2;
  type: "text_delta";
  turn_id: string;
  seq: number;
  text: string | null;
  redacted: boolean;
  suppressed: boolean;
}

export type TurnFailedReason =
  | "first_token_timeout"
  | "stream_interrupted"
  | "model_error"
  | "policy_refused"
  | "safety_refused"
  | "safety_unavailable"
  | "prepare_failed"
  | "record_failed"
  | "context_drift";

export interface TurnCompletedEvent {
  v: 2;
  type: "turn_completed";
  turn_id: string;
  seq: number;
  status: "completed" | "incomplete";
  finish_reason: string | null;
  first_token_ms: number | null;
  duration_ms: number | null;
}

export interface TurnFailedEvent {
  v: 2;
  type: "turn_failed";
  turn_id: string;
  seq: number;
  reason: TurnFailedReason;
  retryable: boolean;
  retry: "regenerate" | null;
}

export type TurnInterruptedCause =
  | "learner_stop"
  | "superseded"
  | "client_gone"
  | "deadline"
  | "server_lost"
  | "server_shutdown";

export interface TurnInterruptedEvent {
  v: 2;
  type: "turn_interrupted";
  turn_id: string;
  seq: number;
  cause: TurnInterruptedCause;
  transcript_through_seq: number;
}

export interface KeepaliveEvent {
  v: 2;
  type: "keepalive";
  turn_id: string;
  committed_through_seq: number;
}

export type SequencedTeacherTurnEvent =
  | TurnStartedEvent
  | SafetyAppliedEvent
  | AnswerRecordedEvent
  | StateChangedEvent
  | TextDeltaEvent
  | TurnCompletedEvent
  | TurnFailedEvent
  | TurnInterruptedEvent;

export type TeacherTurnStreamFrame = SequencedTeacherTurnEvent | KeepaliveEvent;

export function isKeepalive(frame: TeacherTurnStreamFrame): frame is KeepaliveEvent {
  return frame.type === "keepalive";
}

export function isTerminal(
  frame: TeacherTurnStreamFrame,
): frame is TurnCompletedEvent | TurnFailedEvent | TurnInterruptedEvent {
  return frame.type === "turn_completed" || frame.type === "turn_failed" || frame.type === "turn_interrupted";
}
