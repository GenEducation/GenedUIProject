import { http, HttpResponse } from "msw";
import type {
  AnswerBody,
  InstanceState,
  PresentationManifest,
  RecordedTurn,
  SequencedTurnEvent,
  TeacherPayload,
  TurnRequest,
} from "@/features/learning/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

/**
 * One SYNTHETIC lesson on the new backend (`/v1/instances/*`). Text is labelled
 * SYNTHETIC: the backend's rule is no invented curriculum content, even in UI
 * fixtures. Turns stream real SSE frames (`id: <turn_id>:<seq>`); a script can
 * cut a stream short (`dropAfter`) so tests exercise resume.
 */
export const LESSON_ID = "22222222-0000-4000-8000-000000000001";
export const NODE_1 = "33333333-0000-4000-8000-000000000001";
export const NODE_2 = "33333333-0000-4000-8000-000000000002";
export const FIGURE_GROUP = "44444444-0000-4000-8000-000000000001";
export const CHECK_ITEM = "55555555-0000-4000-8000-000000000001";
export const OPTION_A = "66666666-0000-4000-8000-00000000000a";

export function makeLessonInstance(overrides: Partial<InstanceState> = {}): InstanceState {
  return {
    id: LESSON_ID,
    chapter_id: "00000000-0000-4000-8000-000000000001",
    plan_version_id: "77777777-0000-4000-8000-000000000001",
    state: "active",
    revision: 4,
    next_action: "learn",
    nodes_done: 1,
    nodes_total: 5,
    active_node: {
      instance_node_id: NODE_1,
      node_id: "88888888-0000-4000-8000-000000000001",
      title: "SYNTHETIC node 2",
      type: "teach",
      reason: "canonical",
      engagement_count: 0,
      engagement_required: 1,
      round_id: null,
      round_ordinal: null,
      answered_item_ids: [],
      check_item_ids: [CHECK_ITEM],
    },
    ...overrides,
  };
}

export const syntheticPayload = (title = "SYNTHETIC node 2"): TeacherPayload => ({
  schema_version: "teacher_node_v5",
  node: {
    id: "88888888-0000-4000-8000-000000000001",
    title,
    type: "teach",
    teach_only: false,
    sections: [{ id: "s1", title: "SYNTHETIC section", path: ["SYNTHETIC section"], chunks: [{ id: "c1", text: "SYNTHETIC text.", page: 1 }] }],
    figure_groups: [{
      id: FIGURE_GROUP,
      reading_order: 1,
      figures: [{ source: "generated_visual", id: "pic-1", width_px: 800, height_px: 600, mime: "image/png", printed_text: "", learner_alt_text: "SYNTHETIC figure" }],
    }],
    check_items: [{
      id: CHECK_ITEM,
      prompt: "SYNTHETIC check?",
      response_type: "mcq",
      role: "formative_probe",
      options: [{ id: OPTION_A, text: "SYNTHETIC A" }, { id: "66666666-0000-4000-8000-00000000000b", text: "SYNTHETIC B" }],
      figure_groups: [],
    }],
    est_minutes: 5,
  },
  student_context: { next_nodes: [{ node_id: "n3", title: "SYNTHETIC node 3", type: "practice" }] },
});

const syntheticManifest = (): PresentationManifest => ({
  expires_at: 4_102_444_800,
  figures: {
    "pic-1": { figure_group_id: FIGURE_GROUP, url: "/v1/visual-images/pic-1?exp=1&sig=synthetic", width_px: 800, height_px: 600, mime: "image/png", sha256: "0".repeat(64) },
  },
});

/** What the server streams for a turn: the events after `turn_started`, numbered from seq 2. */
export type TurnScript = (request: TurnRequest) => Array<Omit<SequencedTurnEvent, "v" | "turn_id" | "seq">>;

export const replyScript = (...texts: string[]): TurnScript => () => [
  ...texts.map((text) => ({ type: "text_delta" as const, text })),
  { type: "turn_completed" as const, status: "completed" as const, finish_reason: "stop" as const },
];

interface State {
  instance: InstanceState;
  history: RecordedTurn[];
  script: TurnScript;
  /** Close the POST stream after this many frames (a dropped connection); resume serves the rest. */
  dropAfter: number | null;
  log: Map<string, SequencedTurnEvent[]>;
  manifestReads: number;
}

const state: State = {
  instance: makeLessonInstance(),
  history: [],
  script: replyScript("SYNTHETIC ", "reply."),
  dropAfter: null,
  log: new Map(),
  manifestReads: 0,
};

/** Every turn request the client sent, oldest first. */
export const turnRequests: TurnRequest[] = [];
export const answerRequests: AnswerBody[] = [];
export const interruptRequests: Array<{ turnId: string; visible_seq: number }> = [];
export const resumeRequests: Array<{ turnId: string; afterSeq: number }> = [];
/** `/done`, `/choice` and `/hints` bodies, in order, tagged with their route. */
export const stepRequests: Array<{ route: "done" | "choice" | "hints"; body: Record<string, unknown> }> = [];

export const lessonFixture = {
  reset() {
    state.instance = makeLessonInstance();
    state.history = [];
    state.script = replyScript("SYNTHETIC ", "reply.");
    state.dropAfter = null;
    state.log.clear();
    state.manifestReads = 0;
    turnRequests.length = 0;
    answerRequests.length = 0;
    interruptRequests.length = 0;
    resumeRequests.length = 0;
    stepRequests.length = 0;
  },
  setInstance: (instance: InstanceState) => void (state.instance = instance),
  setHistory: (history: RecordedTurn[]) => void (state.history = history),
  setScript: (script: TurnScript) => void (state.script = script),
  dropAfter: (frames: number | null) => void (state.dropAfter = frames),
  get manifestReads() {
    return state.manifestReads;
  },
};

function sse(events: SequencedTurnEvent[]): Response {
  const body = events.map((e) => `id: ${e.turn_id}:${e.seq}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
  return new HttpResponse(body, { headers: { "content-type": "text/event-stream" } });
}

const ours = (id: unknown) => String(id) === state.instance.id;

export const lessonHandlers = [
  // Falls through (returns undefined) for the chapter list's own instances.
  http.get(`${BASE}/v1/instances/:instanceId`, ({ params }) => (ours(params.instanceId) ? HttpResponse.json(state.instance) : undefined)),

  http.get(`${BASE}/v1/instances/:instanceId/teacher-payload`, () => HttpResponse.json(syntheticPayload(state.instance.active_node?.title))),

  http.get(`${BASE}/v1/instances/:instanceId/teacher-payload/presentation-manifest`, () => {
    state.manifestReads += 1;
    return HttpResponse.json(syntheticManifest());
  }),

  http.get(`${BASE}/v1/instances/:instanceId/teacher-turns`, () => HttpResponse.json(state.history)),

  http.post(`${BASE}/v1/instances/:instanceId/teacher-turns`, async ({ request }) => {
    const body = (await request.json()) as TurnRequest;
    turnRequests.push(body);
    const events: SequencedTurnEvent[] = [
      { v: 3, turn_id: body.turn_id, seq: 1, type: "turn_started", kind: body.kind, instance_node_id: body.instance_node_id, instance_revision: state.instance.revision ?? 0, protocol: "teacher_turn_stream_v3" },
      ...state.script(body).map((e, i) => ({ ...e, v: 3, turn_id: body.turn_id, seq: i + 2 }) as SequencedTurnEvent),
    ];
    for (const e of events) if (e.type === "state_changed") state.instance = e.instance;
    state.log.set(body.turn_id, events);
    return sse(state.dropAfter === null ? events : events.slice(0, state.dropAfter));
  }),

  http.get(`${BASE}/v1/instances/:instanceId/teacher-turns/:turnId/events`, ({ params, request }) => {
    const turnId = String(params.turnId);
    const afterSeq = Number(new URL(request.url).searchParams.get("after_seq") ?? 0);
    resumeRequests.push({ turnId, afterSeq });
    return sse((state.log.get(turnId) ?? []).filter((e) => e.seq > afterSeq));
  }),

  http.post(`${BASE}/v1/instances/:instanceId/teacher-turns/:turnId/interrupt`, async ({ params, request }) => {
    const { visible_seq } = (await request.json()) as { visible_seq: number };
    interruptRequests.push({ turnId: String(params.turnId), visible_seq });
    return HttpResponse.json({ turn_id: params.turnId, status: "interrupted", transcript_through_seq: visible_seq });
  }),

  http.post(`${BASE}/v1/instances/:instanceId/responses`, async ({ request }) => {
    const body = (await request.json()) as AnswerBody;
    answerRequests.push(body);
    if (body.expected_revision !== state.instance.revision) {
      return HttpResponse.json(
        { status: "error", error_code: "CORE_3103", message: "This lesson has moved on.", request_id: "r", retryable: false, details: {} },
        { status: 409 },
      );
    }
    const correct = body.response?.kind === "choice" && body.response.option_ids.includes(OPTION_A);
    state.instance = { ...state.instance, revision: (state.instance.revision ?? 0) + 1 };
    return HttpResponse.json({
      attempt_id: "99999999-0000-4000-8000-000000000001",
      outcome: correct ? "correct" : "incorrect",
      correct,
      eligibility_reason: null,
      round_id: null,
      round_state: "open",
      replayed: false,
      instance: state.instance,
    });
  }),

  ...(["done", "choice", "hints"] as const).map((route) =>
    http.post(`${BASE}/v1/instances/:instanceId/${route}`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      stepRequests.push({ route, body });
      if ("expected_revision" in body && body.expected_revision !== state.instance.revision) {
        return HttpResponse.json(
          { status: "error", error_code: "CORE_3103", message: "This lesson has moved on.", request_id: "r", retryable: false, details: {} },
          { status: 409 },
        );
      }
      // A done or a choice moves the lesson on one step; a hint only records the request.
      if (route !== "hints") {
        state.instance = {
          ...state.instance,
          revision: (state.instance.revision ?? 0) + 1,
          nodes_done: state.instance.nodes_done + (route === "done" ? 1 : 0),
          next_action: "learn",
          active_node: state.instance.active_node && { ...state.instance.active_node, choice: null },
        };
      }
      return HttpResponse.json(state.instance);
    }),
  ),

  http.get(`${BASE}/v1/instances/:instanceId/report`, () =>
    HttpResponse.json({
      instance_id: state.instance.id, chapter_id: state.instance.chapter_id, completed: state.instance.state === "completed",
      nodes_done: state.instance.nodes_done, nodes_total: state.instance.nodes_total, outcomes: [], keep_practising: [],
      answers: { answered: 1, correct: 1 },
    })),
];
