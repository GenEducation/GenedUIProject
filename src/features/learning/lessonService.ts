import { authFetch } from "@/utils/authFetch";
import type {
  AnswerBody,
  AnswerResult,
  ChapterReport,
  InstanceState,
  PresentationManifest,
  RecordedTurn,
  TeacherPayload,
  TurnInterruptOut,
  TurnRequest,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

const instancePath = (instanceId: string) => `${API_BASE_URL}/v1/instances/${encodeURIComponent(instanceId)}`;
const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });
const SSE = { accept: "text/event-stream" };

/**
 * The lesson screen's routes (STUDENT only). `authFetch` throws `ApiRequestError`
 * on any non-OK response, so nothing here checks `response.ok`. The two stream
 * calls return the raw `Response`; read it with `readSseFrames`.
 */
export const lessonService = {
  instance: async (instanceId: string): Promise<InstanceState> =>
    (await authFetch(instancePath(instanceId))).json(),

  /** The active node's session payload (`teacher_node_v5`). */
  teacherPayload: async (instanceId: string): Promise<TeacherPayload> =>
    (await authFetch(`${instancePath(instanceId)}/teacher-payload`)).json(),

  /** Fresh signed URLs for the current payload's pictures; call again when one expires. */
  manifest: async (instanceId: string): Promise<PresentationManifest> =>
    (await authFetch(`${instancePath(instanceId)}/teacher-payload/presentation-manifest`)).json(),

  /** A node's recorded turns (the active node when `instanceNodeId` is omitted). */
  turnHistory: async (instanceId: string, instanceNodeId?: string): Promise<RecordedTurn[]> => {
    const query = instanceNodeId ? `?instance_node_id=${encodeURIComponent(instanceNodeId)}` : "";
    return (await authFetch(`${instancePath(instanceId)}/teacher-turns${query}`)).json();
  },

  /** Starts (or, with the same `turn_id`, rejoins) a turn; the body is its SSE stream. */
  startTurn: (instanceId: string, request: TurnRequest, signal?: AbortSignal): Promise<Response> =>
    authFetch(`${instancePath(instanceId)}/teacher-turns`, { ...json(request), headers: SSE, signal }),

  /** Resumes a turn's stream after `afterSeq`; never re-runs the model. */
  resumeTurn: (instanceId: string, turnId: string, afterSeq: number, signal?: AbortSignal): Promise<Response> =>
    authFetch(
      `${instancePath(instanceId)}/teacher-turns/${encodeURIComponent(turnId)}/events?after_seq=${afterSeq}`,
      { headers: SSE, signal },
    ),

  /** The learner's stop: the transcript ends at the last seq they saw. */
  interruptTurn: async (instanceId: string, turnId: string, visibleSeq: number): Promise<TurnInterruptOut> =>
    (await authFetch(`${instancePath(instanceId)}/teacher-turns/${encodeURIComponent(turnId)}/interrupt`, json({ visible_seq: visibleSeq }))).json(),

  answer: async (instanceId: string, body: AnswerBody): Promise<AnswerResult> =>
    (await authFetch(`${instancePath(instanceId)}/responses`, json(body))).json(),

  /** Records that the learner asked for help on a check; the hint itself comes as a `hint` turn. */
  hint: async (instanceId: string, body: { request_id: string; item_id: string }): Promise<InstanceState> =>
    (await authFetch(`${instancePath(instanceId)}/hints`, json(body))).json(),

  /** The learner's explicit done on the active teach node. */
  done: async (instanceId: string, body: { request_id: string; expected_revision: number }): Promise<InstanceState> =>
    (await authFetch(`${instancePath(instanceId)}/done`, json(body))).json(),

  /** After a failed practice round: a fresh question now, or keep going. */
  choose: async (
    instanceId: string,
    body: { request_id: string; expected_revision: number; choice: "try_now" | "keep_going" },
  ): Promise<InstanceState> => (await authFetch(`${instancePath(instanceId)}/choice`, json(body))).json(),

  report: async (instanceId: string): Promise<ChapterReport> =>
    (await authFetch(`${instancePath(instanceId)}/report`)).json(),

  /** A manifest URL is relative to the API. */
  pictureSrc: (url: string): string => (/^https?:/.test(url) ? url : `${API_BASE_URL}${url}`),
};
