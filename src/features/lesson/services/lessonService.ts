import { authFetch } from "@/utils/authFetch";
import type {
  AnswerBody,
  AnswerResult,
  ChapterReport,
  DoneBody,
  EngagementBody,
  HintBody,
  InstanceState,
  RecordedTurnOut,
  TeacherPayload,
  TurnInterruptOut,
  TurnInterruptRequest,
} from "../types/lesson";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

const INSTANCES_BASE = `${API_BASE_URL}/v1/instances`;
const CHAPTERS_BASE = `${API_BASE_URL}/v1/chapters`;

/**
 * Every call here goes through the gateway (`authFetch`), which attaches
 * the learner's JWT and drops any identity header the caller sets — the
 * gateway alone establishes `x-user-id` (AGENTS.md rule 4).
 *
 * `authFetch` already throws `ApiRequestError` on a non-2xx response, so
 * there are no manual `!response.ok` checks below. Callers narrow on
 * `error.error_code`, e.g. `stale_node` (409) after `instance_node_id`
 * drifted, by reloading `getInstance`.
 */
export const lessonService = {
  /** Opens the chapter's lesson, or resumes the learner's active one. */
  openInstance: async (chapterId: string): Promise<InstanceState> => {
    const response = await authFetch(`${CHAPTERS_BASE}/${chapterId}/instances`, { method: "POST" });
    return response.json();
  },

  getInstance: async (instanceId: string): Promise<InstanceState> => {
    const response = await authFetch(`${INSTANCES_BASE}/${instanceId}`);
    return response.json();
  },

  /**
   * The active node's full teach content — must be fetched before any
   * answer on that node, or the teacher's `result_reaction` turn 409s with
   * `reaction_context_unavailable` (TEACHER_TURN_v1 §1).
   */
  getTeacherPayload: async (instanceId: string): Promise<TeacherPayload> => {
    const response = await authFetch(`${INSTANCES_BASE}/${instanceId}/teacher-payload`);
    return response.json();
  },

  submitAnswer: async (instanceId: string, body: AnswerBody): Promise<AnswerResult> => {
    const response = await authFetch(`${INSTANCES_BASE}/${instanceId}/responses`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.json();
  },

  /** Every learner chat message counts as one engagement (ADR 0006 D3). */
  recordEngagement: async (instanceId: string, body: EngagementBody): Promise<InstanceState> => {
    const response = await authFetch(`${INSTANCES_BASE}/${instanceId}/engagement`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.json();
  },

  /** Marks the learner's next answer to `item_id` as assisted. */
  recordHint: async (instanceId: string, body: HintBody): Promise<InstanceState> => {
    const response = await authFetch(`${INSTANCES_BASE}/${instanceId}/hints`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.json();
  },

  markDone: async (instanceId: string, body: DoneBody): Promise<InstanceState> => {
    const response = await authFetch(`${INSTANCES_BASE}/${instanceId}/done`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.json();
  },

  getReport: async (instanceId: string): Promise<ChapterReport> => {
    const response = await authFetch(`${INSTANCES_BASE}/${instanceId}/report`);
    return response.json();
  },

  /**
   * The recorded transcript of one instance node, oldest first — used to
   * rebuild the chat after a page reload. Defaults to the active node.
   */
  getTeacherTurns: async (instanceId: string, instanceNodeId: string): Promise<RecordedTurnOut[]> => {
    const url = new URL(`${INSTANCES_BASE}/${instanceId}/teacher-turns`);
    url.searchParams.set("instance_node_id", instanceNodeId);
    const response = await authFetch(url.toString());
    return response.json();
  },

  /** A learner's stop. `visibleSeq` is the highest seq they saw rendered. */
  interruptTurn: async (
    instanceId: string,
    turnId: string,
    body: TurnInterruptRequest,
  ): Promise<TurnInterruptOut> => {
    const response = await authFetch(`${INSTANCES_BASE}/${instanceId}/teacher-turns/${turnId}/interrupt`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.json();
  },
};
