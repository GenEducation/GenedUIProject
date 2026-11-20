/**
 * The student's chapter routes on the new backend (ADR 0014 decision 9, ADR 0016).
 * Shapes mirror `LearnerChaptersOut` and `InstanceState` in the backend's
 * `contracts/openapi/api.json`; only the fields the app reads are typed.
 */

/** A chapter's accepted cover card: a signed, relative image URL (about 1 h). */
export interface ChapterCard {
  image_url: string;
  width: number;
  height: number;
}

export interface LearnerChapter {
  /** Open it with `POST /v1/chapters/{chapter_id}/instances`. */
  chapter_id: string;
  source_id: string;
  number: number;
  title: string;
  book_title: string;
  /** `'<subject>:<0-5>'`: the card palette, for the gradient while there's no card. */
  palette: string;
  card: ChapterCard | null;
}

/**
 * One of the chapters a student last worked on (`GET /v1/learner/recent-chapters`): the chapter and its newest
 * lesson instance in one entry, most recently active first.
 */
export interface RecentChapter {
  chapter_id: string;
  chapter_title: string;
  chapter_number: number;
  book_title: string;
  /** The subject's code, e.g. `mathematics`, `social_science` (not the display name). */
  subject: string;
  /** The newest lesson instance for this chapter: resume it at `/student/lesson/{instance_id}`. */
  instance_id: string;
  state: "active" | "completed" | "abandoned";
  nodes_done: number;
  nodes_total: number;
  started_at: string;
  completed_at: string | null;
  last_active_at: string;
  /** The learner has completed this chapter at least once (in any session). A completed chapter stays completed. */
  completed_once?: boolean;
  /** Completed once and open again: reviewing sections, or started over. */
  revisiting?: boolean;
  /** `'<subject>:<n>'`: the card palette, for the gradient while there's no card. */
  palette: string;
  card: ChapterCard | null;
}

export interface RecentChaptersOut {
  chapters: RecentChapter[];
}

export interface LearnerChaptersOut {
  subject: string;
  grade: number;
  /** Published chapters with a lesson plan, by book then number; every one opens. */
  chapters: LearnerChapter[];
}

export type InstanceNextAction = "learn" | "answer_checks" | "choose" | "confirm_reading" | "completed" | "blocked";

export interface LessonActivity {
  item_id: string;
  prompt: string;
  mode: "write" | "speak" | "read_aloud" | "listen";
  passage: string | null;
  attempted: boolean;
}

/** The node the learner is on (`ActiveNode` in the backend's `gened_learning/views.py`). */
export interface ActiveNode {
  instance_node_id: string;
  node_id: string;
  title: string;
  type: "teach" | "practice" | "assess";
  reason: string;
  engagement_count: number;
  engagement_required: number;
  round_id: string | null;
  round_ordinal: number | null;
  answered_item_ids: string[];
  check_item_ids: string[];
  activities?: LessonActivity[];
  /** The backend currently accepts `/done`; false on evidence-driven teach nodes. */
  done_available: boolean;
  /** The deterministic re-teaching step after a failed teach round. */
  teach_step: "s1" | "s2" | "s3" | null;
  /**
   * Whether the node's check is on the learner's screen. On a W2 (content-led) lesson only while its question is open or in feedback,
   * and then `check_item_ids` names exactly that question. A legacy lesson shows its checks as before. Absent from an older backend: shown.
   */
  check_presented?: boolean;
  choice?: { options: Array<"try_now" | "keep_going">; recommended: "try_now" | "keep_going" } | null;
  pending_reading?: { item_id: string; original: string; suggestion: string } | null;
}

/** One student's run through a chapter's lesson plan. */
export interface ContentLessonState {
  phase: string;
  unit_id: string | null;
  portion_id: string | null;
  pending_item_id: string | null;
  feedback_attempt_id: string | null;
  shown: boolean;
  channel: "chat" | "voice";
  taught_units: string[];
  unresolved_units: string[];
  /** The question's rung after a wrong answer (backend PRD v3 §3.5). Absent from an older server. */
  stage?: "first" | "retry" | "return" | "guided";
  /** In `feedback`: what happens to the question when the tutor's reply ends. */
  after_feedback?: "resolve" | "retry" | "set_aside" | "guided" | "same" | null;
  /** The question set aside after two wrong tries, coming back after re-teaching. */
  set_aside_item_id?: string | null;
  warmup?: boolean;
  owed_check?: boolean;
  /** The chapter is finished except for ideas with nothing to ask now. */
  come_back_later?: boolean;
}

/** Chapter-first progress of a content-led lesson: units of the book, never replies or turns. */
export interface ContentProgress {
  unit_position: number;
  unit_count: number;
  taught: number;
  to_revisit: number;
  /** The active step's ideas covered so far, and how many it has (covered concepts only, never credit). */
  ideas_covered?: number;
  ideas_total?: number;
  /** Ideas of the chapter still owed: "We'll come back to these". */
  owed_ideas?: number;
  /** Opening the lesson starts a reply: the first open, or a return after 30 minutes or more. */
  opening_due?: boolean;
  /** Where each activity of the active step belongs now (absent from an older server: all shown). */
  activities?: Array<{ item_id: string; status: "open" | "done" | "not_yet" | "unrelated" }>;
}

export interface InstanceState {
  content_lesson?: ContentLessonState | null;
  content_progress?: ContentProgress | null;
  id: string;
  chapter_id: string;
  state: "active" | "completed" | "abandoned";
  next_action: InstanceNextAction;
  nodes_done: number;
  nodes_total: number;
  /** The finished parts, in plan order, with their titles (absent from an older backend). */
  completed_nodes?: Array<{ instance_node_id: string; title: string; activities?: LessonActivity[] }>;
  // The lesson screen's fields. Optional so the chapter list's fixtures stay small.
  plan_version_id?: string;
  /** Every answer, done or engagement names it as `expected_revision`; a stale one is a 409 (CORE_3103). */
  revision?: number;
  active_node?: ActiveNode | null;
  /** When this session first completed. It stays set while the learner reviews sections of it, so it stays finished. */
  first_completed_at?: string | null;
}
