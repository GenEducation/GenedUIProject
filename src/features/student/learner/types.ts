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
  choice?: { options: Array<"try_now" | "keep_going">; recommended: "try_now" | "keep_going" } | null;
  pending_reading?: { item_id: string; original: string; suggestion: string } | null;
}

/** One student's run through a chapter's lesson plan. */
export interface InstanceState {
  id: string;
  chapter_id: string;
  state: "active" | "completed" | "abandoned";
  next_action: InstanceNextAction;
  nodes_done: number;
  nodes_total: number;
  /** The finished parts, in plan order, with their titles (absent from an older backend). */
  completed_nodes?: Array<{ instance_node_id: string; title: string }>;
  // The lesson screen's fields. Optional so the chapter list's fixtures stay small.
  plan_version_id?: string;
  /** Every answer, done or engagement names it as `expected_revision`; a stale one is a 409 (CORE_3103). */
  revision?: number;
  active_node?: ActiveNode | null;
}
