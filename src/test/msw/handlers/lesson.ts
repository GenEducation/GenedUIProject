import { http, HttpResponse } from "msw";
import type {
  AnswerBody,
  DeliveryBody,
  InstanceState,
  PresentationManifest,
  RecordedTurn,
  ReviewBody,
  RevisitOptions,
  RevisitSection,
  SequencedTurnEvent,
  TeacherPayload,
  TurnRequest,
} from "@/features/learning/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

/**
 * One SYNTHETIC lesson on the new backend (`/v1/instances/*`). Text is labelled
 * SYNTHETIC: the backend's rule is no invented curriculum content, even in UI
 * fixtures. Turns stream real SSE frames (`id: <turn_id>:<seq>`); a script can
 * cut a stream short (`dropAfter`) so tests exercise resume, or hold one open
 * mid-reply (`holdStream`) so tests can move on while the tutor is still talking.
 * The payload and the manifest are per node, as the backend's are: NODE_1 has
 * FIGURE_GROUP (`pic-1`), NODE_2 has FIGURE_GROUP_2 (`pic-2`).
 */
export const LESSON_ID = "22222222-0000-4000-8000-000000000001";
export const NODE_1 = "33333333-0000-4000-8000-000000000001";
export const NODE_2 = "33333333-0000-4000-8000-000000000002";
export const FIGURE_GROUP = "44444444-0000-4000-8000-000000000001";
export const FIGURE_GROUP_2 = "44444444-0000-4000-8000-000000000002";
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

/** Each node's one figure group and picture. */
const NODE_FIGURES: Record<string, { group: string; picture: string; alt: string }> = {
  [NODE_1]: { group: FIGURE_GROUP, picture: "pic-1", alt: "SYNTHETIC figure" },
  [NODE_2]: { group: FIGURE_GROUP_2, picture: "pic-2", alt: "SYNTHETIC figure two" },
};
const figuresOf = (instanceNodeId: string | undefined) => NODE_FIGURES[instanceNodeId ?? NODE_1] ?? NODE_FIGURES[NODE_1];

export const syntheticPayload = (title = "SYNTHETIC node 2", instanceNodeId: string = NODE_1): TeacherPayload => ({
  schema_version: "teacher_node_v5",
  node: {
    id: "88888888-0000-4000-8000-000000000001",
    title,
    type: "teach",
    teach_only: false,
    sections: [{ id: "s1", title: "SYNTHETIC section", path: ["SYNTHETIC section"], chunks: [{ id: "c1", text: "SYNTHETIC text.", page: 1 }] }],
    figure_groups: [{
      id: figuresOf(instanceNodeId).group,
      reading_order: 1,
      figures: [{ source: "generated_visual", id: figuresOf(instanceNodeId).picture, width_px: 800, height_px: 600, mime: "image/png", printed_text: "", learner_alt_text: figuresOf(instanceNodeId).alt }],
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

/** The picture's signed URL as the manifest names it; `signature` changes when the fixture re-signs (a later expiry). */
export const pictureUrl = (picture: string, signature = "synthetic") => `/v1/visual-images/${picture}?exp=1&sig=${signature}`;

const syntheticManifest = (instanceNodeId: string | undefined): PresentationManifest => {
  const { group, picture } = figuresOf(instanceNodeId);
  const figures: PresentationManifest["figures"] = state.manifestOmits.has(group)
    ? {}
    : { [picture]: { figure_group_id: group, url: pictureUrl(picture, state.signature), width_px: 800, height_px: 600, mime: "image/png", sha256: "0".repeat(64) } };
  return { expires_at: 4_102_444_800, figures };
};

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
  /** The next N manifest reads fail with a 503. */
  manifestFailures: number;
  /** Figure groups the manifest leaves out (a picture not signed yet). */
  manifestOmits: Set<string>;
  /** The signature on manifest URLs; `resign` changes it, as a new expiry window would. */
  signature: string;
  /** While set, manifest and payload reads wait for it (a slow network). */
  nodeReadGate: Promise<void> | null;
  /** The next N payload reads fail with a 500 (the step's payload cannot be built). */
  payloadFailures: number;
  /** The next N turn POSTs are refused with a 503 before any stream starts. */
  turnFailures: number;
  /** The next turn stream sends this many frames, then waits for `releaseStream` (the tutor still talking). */
  holdAfter: number | null;
}

const state: State = {
  instance: makeLessonInstance(),
  history: [],
  script: replyScript("SYNTHETIC ", "reply."),
  dropAfter: null,
  log: new Map(),
  manifestReads: 0,
  manifestFailures: 0,
  manifestOmits: new Set(),
  signature: "synthetic",
  nodeReadGate: null,
  payloadFailures: 0,
  turnFailures: 0,
  holdAfter: null,
};

/** Releases of held streams, in order. */
const heldStreams: Array<() => void> = [];
/** How many manifest reads have started (including failed ones). */
let manifestAttempts = 0;

/** Every review (or start over) the client asked for, oldest first. */
export const reviewRequests: ReviewBody[] = [];
/** The instance a start over creates. */
export const FRESH_LESSON_ID = "22222222-0000-4000-8000-0000000000ff";
/** What `revisit-options` answers; null: nothing weak (built from the instance). */
let revisit: RevisitOptions | null = null;

/** A SYNTHETIC section of the lesson, finished, with its score. */
export const makeSection = (step: number, overrides: Partial<RevisitSection> = {}): RevisitSection => ({
  instance_node_id: `77777777-0000-4000-8000-${String(step).padStart(12, "0")}`,
  node_id: `88888888-0000-4000-8000-${String(step).padStart(12, "0")}`,
  step,
  title: `SYNTHETIC section ${step}`,
  type: "practice",
  status: "passed",
  scored: 2,
  correct: 2,
  score: 1,
  in_review: false,
  ...overrides,
});

/** Every turn request the client sent, oldest first. */
export const turnRequests: TurnRequest[] = [];
export const answerRequests: AnswerBody[] = [];
/** Every check-delivery confirmation, with the item it named; `deliveryFailures` makes the next N of them fail with a 503. */
export const deliveryRequests: Array<{ itemId: string; body: DeliveryBody }> = [];
let deliveryFailures = 0;
/** Items the server has a confirmation for in the (session, item) sense: an answer without one is refused as not delivered. */
const confirmedDeliveries = new Set<string>();
let requireDelivery = false;
export const interruptRequests: Array<{ turnId: string; visible_seq: number }> = [];
export const resumeRequests: Array<{ turnId: string; afterSeq: number }> = [];
/** What `/interrupt` reports the turn's status as: `interrupted`, or the status it had already closed with (a Stop that lost the race). */
let interruptStatus = "interrupted";
/** Close the next resume stream after this many frames (the resumed connection drops too). */
let dropResumeAfter: number | null = null;
/** `/done` and `/choice` bodies, in order, tagged with their route. */
export const stepRequests: Array<{ route: "done" | "choice"; body: Record<string, unknown> }> = [];

/** Every request that reached a route the lesson screen must not call (R-E5: a hint is only a hint turn). */
export const forbiddenRequests: string[] = [];

/** Text presence beats, in order (`source_id`s), and what the server answers (`active`). */
export const presenceBeats: string[] = [];
export const presence = { active: true };

/** This learner's chapter totals, as `/students/{id}/time/by-chapter` answers. */
export const activity: { chapters: unknown[]; fail: boolean } = {
  chapters: [{ chapter_id: "00000000-0000-4000-8000-000000000001", chapter_name: "SYNTHETIC", subject: "math", total_minutes: 12.4, session_count: 2 }],
  fail: false,
};

export const lessonFixture = {
  reset() {
    state.instance = makeLessonInstance();
    state.history = [];
    state.script = replyScript("SYNTHETIC ", "reply.");
    state.dropAfter = null;
    state.log.clear();
    state.manifestReads = 0;
    state.manifestFailures = 0;
    state.manifestOmits = new Set();
    state.signature = "synthetic";
    state.nodeReadGate = null;
    state.payloadFailures = 0;
    state.turnFailures = 0;
    state.holdAfter = null;
    heldStreams.length = 0;
    manifestAttempts = 0;
    turnRequests.length = 0;
    answerRequests.length = 0;
    deliveryRequests.length = 0;
    deliveryFailures = 0;
    confirmedDeliveries.clear();
    requireDelivery = false;
    interruptRequests.length = 0;
    forbiddenRequests.length = 0;
    presenceBeats.length = 0;
    presence.active = true;
    activity.fail = false;
    resumeRequests.length = 0;
    interruptStatus = "interrupted";
    dropResumeAfter = null;
    stepRequests.length = 0;
    reviewRequests.length = 0;
    revisit = null;
  },
  /** What `revisit-options` answers (`weak` is worked out from `sections` unless given). */
  setRevisitOptions: (options: Partial<RevisitOptions> & { sections: RevisitSection[] }) => {
    const weak = options.sections.filter((s) => (s.status === "below_pass_mark" || s.status === "not_attempted") && !s.in_review);
    revisit = {
      instance_id: state.instance.id,
      state: state.instance.state,
      revision: state.instance.revision ?? 0,
      weak,
      resume: state.instance.state === "active"
        ? { instance_node_id: NODE_1, step: options.sections.length + 1, title: "SYNTHETIC node 2", nodes_done: state.instance.nodes_done, nodes_total: state.instance.nodes_total }
        : null,
      review_in_progress: options.sections.some((s) => s.in_review),
      ...options,
    };
  },
  failNextDeliveries: (n: number) => void (deliveryFailures = n),
  /** Make `/responses` refuse an answer whose (session, item) was never confirmed, as the backend does in `required` mode. */
  requireDelivery: (on: boolean) => void (requireDelivery = on),
  setInstance: (instance: InstanceState) => void (state.instance = instance),
  setHistory: (history: RecordedTurn[]) => void (state.history = history),
  setScript: (script: TurnScript) => void (state.script = script),
  dropAfter: (frames: number | null) => void (state.dropAfter = frames),
  /** Seed a turn's event log, as the server holds it (a turn admitted before this page loaded). */
  setLog: (turnId: string, events: Array<Omit<SequencedTurnEvent, "v" | "turn_id" | "seq">>) =>
    void state.log.set(turnId, events.map((e, i) => ({ ...e, v: 3, turn_id: turnId, seq: i + 1 }) as SequencedTurnEvent)),
  interruptReports: (status: string) => void (interruptStatus = status),
  dropResumeAfter: (frames: number | null) => void (dropResumeAfter = frames),
  get manifestReads() {
    return state.manifestReads;
  },
  /** Every manifest read that reached the server, the failed ones too. */
  get manifestAttempts() {
    return manifestAttempts;
  },
  failNextManifests: (n: number) => void (state.manifestFailures = n),
  omitFromManifest: (...groups: string[]) => void (state.manifestOmits = new Set(groups)),
  resign: (signature: string) => void (state.signature = signature),
  /** Hold the payload and manifest reads until the returned function is called. */
  holdNodeReads: (): (() => void) => {
    let release = () => {};
    state.nodeReadGate = new Promise<void>((resolve) => (release = resolve));
    return () => {
      state.nodeReadGate = null;
      release();
    };
  },
  failNextPayloads: (n: number) => void (state.payloadFailures = n),
  failNextTurns: (n: number) => void (state.turnFailures = n),
  holdStream: (afterFrames: number | null) => void (state.holdAfter = afterFrames),
  /** Let the oldest held stream send the rest of its frames. */
  releaseStream: () => heldStreams.shift()?.(),
};

const frameOf = (e: SequencedTurnEvent) => `id: ${e.turn_id}:${e.seq}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`;

function sse(events: SequencedTurnEvent[]): Response {
  const body = events.map(frameOf).join("");
  return new HttpResponse(body, { headers: { "content-type": "text/event-stream" } });
}

/** A stream that sends `after` frames, then waits to be released (or cancelled by the client) before sending the rest. */
function heldSse(events: SequencedTurnEvent[], after: number): Response {
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  heldStreams.push(release);
  let cancelled = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(events.slice(0, after).map(frameOf).join("")));
      void released.then(() => {
        if (cancelled) return;
        controller.enqueue(encoder.encode(events.slice(after).map(frameOf).join("")));
        controller.close();
      });
    },
    cancel() {
      cancelled = true;
    },
  });
  return new HttpResponse(stream, { headers: { "content-type": "text/event-stream" } });
}

const ours = (id: unknown) => String(id) === state.instance.id;

export const lessonHandlers = [
  // Falls through (returns undefined) for the chapter list's own instances.
  http.get(`${BASE}/v1/instances/:instanceId`, ({ params }) => (ours(params.instanceId) ? HttpResponse.json(state.instance) : undefined)),

  http.get(`${BASE}/v1/instances/:instanceId/teacher-payload`, async () => {
    const node = state.instance.active_node;
    if (state.nodeReadGate) await state.nodeReadGate;
    if (state.payloadFailures > 0) {
      state.payloadFailures -= 1;
      return HttpResponse.json(
        { status: "error", error_code: "CORE_9000", message: "Something went wrong.", request_id: "r", retryable: false, details: {} },
        { status: 500 },
      );
    }
    return HttpResponse.json(syntheticPayload(node?.title, node?.instance_node_id));
  }),

  http.get(`${BASE}/v1/instances/:instanceId/teacher-payload/presentation-manifest`, async () => {
    const node = state.instance.active_node?.instance_node_id;
    manifestAttempts += 1;
    if (state.nodeReadGate) await state.nodeReadGate;
    if (state.manifestFailures > 0) {
      state.manifestFailures -= 1;
      return HttpResponse.json(
        { status: "error", error_code: "CORE_9999", message: "Unavailable.", request_id: "r", retryable: true, details: {} },
        { status: 503 },
      );
    }
    state.manifestReads += 1;
    return HttpResponse.json(syntheticManifest(node));
  }),

  http.get(`${BASE}/v1/instances/:instanceId/teacher-turns`, () => HttpResponse.json(state.history)),

  http.post(`${BASE}/v1/instances/:instanceId/teacher-turns`, async ({ request }) => {
    const body = (await request.json()) as TurnRequest;
    turnRequests.push(body);
    if (state.turnFailures > 0) {
      state.turnFailures -= 1;
      return HttpResponse.json(
        { status: "error", error_code: "TUTR_1503", message: "The teacher is not available right now.", request_id: "r", retryable: false, details: {} },
        { status: 503 },
      );
    }
    const events: SequencedTurnEvent[] = [
      { v: 3, turn_id: body.turn_id, seq: 1, type: "turn_started", kind: body.kind, instance_node_id: body.instance_node_id, instance_revision: state.instance.revision ?? 0, protocol: "teacher_turn_stream_v3" },
      ...state.script(body).map((e, i) => ({ ...e, v: 3, turn_id: body.turn_id, seq: i + 2 }) as SequencedTurnEvent),
    ];
    for (const e of events) if (e.type === "state_changed") state.instance = e.instance;
    state.log.set(body.turn_id, events);
    if (state.holdAfter !== null) {
      const after = state.holdAfter;
      state.holdAfter = null;
      return heldSse(events, after);
    }
    return sse(state.dropAfter === null ? events : events.slice(0, state.dropAfter));
  }),

  http.get(`${BASE}/v1/instances/:instanceId/teacher-turns/:turnId/events`, ({ params, request }) => {
    const turnId = String(params.turnId);
    const afterSeq = Number(new URL(request.url).searchParams.get("after_seq") ?? 0);
    resumeRequests.push({ turnId, afterSeq });
    const events = (state.log.get(turnId) ?? []).filter((e) => e.seq > afterSeq);
    if (state.holdAfter !== null) {
      const after = state.holdAfter;
      state.holdAfter = null;
      return heldSse(events, after);
    }
    if (dropResumeAfter !== null) {
      const after = dropResumeAfter;
      dropResumeAfter = null;
      return sse(events.slice(0, after));
    }
    return sse(events);
  }),

  http.post(`${BASE}/v1/instances/:instanceId/teacher-turns/:turnId/interrupt`, async ({ params, request }) => {
    const { visible_seq } = (await request.json()) as { visible_seq: number };
    interruptRequests.push({ turnId: String(params.turnId), visible_seq });
    // A turn already closed keeps its whole transcript; the report is only recorded (backend `stop`).
    const closed = interruptStatus !== "interrupted";
    const through = closed ? (state.log.get(String(params.turnId))?.at(-1)?.seq ?? visible_seq) : visible_seq;
    return HttpResponse.json({ turn_id: params.turnId, status: interruptStatus, transcript_through_seq: through });
  }),

  http.post(`${BASE}/v1/instances/:instanceId/responses`, async ({ request }) => {
    const body = (await request.json()) as AnswerBody;
    answerRequests.push(body);
    if (requireDelivery && !confirmedDeliveries.has(`${body.session_id}|${body.item_id}`)) {
      return HttpResponse.json(
        { status: "error", error_code: "CORE_3106", message: "The request is invalid.", request_id: "r", retryable: false, details: { reason: "check_not_delivered" } },
        { status: 409 },
      );
    }
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

  http.post(`${BASE}/v1/instances/:instanceId/checks/:itemId/delivered`, async ({ params, request }) => {
    const body = (await request.json()) as DeliveryBody;
    deliveryRequests.push({ itemId: String(params.itemId), body });
    if (deliveryFailures > 0) {
      deliveryFailures -= 1;
      return HttpResponse.json(
        { status: "error", error_code: "CORE_9999", message: "Unavailable.", request_id: "r", retryable: true, details: {} },
        { status: 503 },
      );
    }
    confirmedDeliveries.add(`${body.session_id}|${params.itemId}`);
    return HttpResponse.json({ item_id: params.itemId, round_ordinal: 1, replayed: false });
  }),

  ...(["done", "choice"] as const).map((route) =>
    http.post(`${BASE}/v1/instances/:instanceId/${route}`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      stepRequests.push({ route, body });
      if ("expected_revision" in body && body.expected_revision !== state.instance.revision) {
        return HttpResponse.json(
          { status: "error", error_code: "CORE_3103", message: "This lesson has moved on.", request_id: "r", retryable: false, details: {} },
          { status: 409 },
        );
      }
      // A done or a choice moves the lesson on one step.
      state.instance = {
        ...state.instance,
        revision: (state.instance.revision ?? 0) + 1,
        nodes_done: state.instance.nodes_done + (route === "done" ? 1 : 0),
        next_action: "learn",
        active_node: state.instance.active_node && { ...state.instance.active_node, choice: null },
      };
      return HttpResponse.json(state.instance);
    }),
  ),

  http.get(`${BASE}/v1/instances/:instanceId/revisit-options`, ({ params }) => {
    if (!ours(params.instanceId)) return undefined;
    return HttpResponse.json(
      revisit ?? {
        instance_id: state.instance.id, state: state.instance.state, revision: state.instance.revision ?? 0,
        sections: [], weak: [], resume: null, review_in_progress: false,
      },
    );
  }),

  http.post(`${BASE}/v1/instances/:instanceId/review`, async ({ request }) => {
    const body = (await request.json()) as ReviewBody;
    reviewRequests.push(body);
    if (body.start_over) {
      return HttpResponse.json(makeLessonInstance({ id: FRESH_LESSON_ID, nodes_done: 0, revision: 0 }));
    }
    // The first chosen section is now the active node, a replay of it; the plan's progress does not move.
    const section = revisit?.sections.find((s) => s.instance_node_id === body.section_ids?.[0]);
    state.instance = {
      ...state.instance,
      state: "active",
      revision: (state.instance.revision ?? 0) + 1,
      next_action: "answer_checks",
      active_node: {
        ...makeLessonInstance().active_node!,
        instance_node_id: "99999999-0000-4000-8000-000000000001",
        title: section?.title ?? "SYNTHETIC section",
        reason: "revisit_review",
      },
    };
    revisit = revisit && {
      ...revisit,
      sections: revisit.sections.map((s) => (body.section_ids?.includes(s.instance_node_id) ? { ...s, in_review: true } : s)),
      weak: revisit.weak.filter((s) => !body.section_ids?.includes(s.instance_node_id)),
      review_in_progress: true,
    };
    return HttpResponse.json(state.instance);
  }),

  http.post(`${BASE}/v1/instances/:instanceId/hints`, ({ request }) => {
    forbiddenRequests.push(new URL(request.url).pathname);
    return HttpResponse.json({}, { status: 410 });
  }),

  http.get(`${BASE}/students/:studentId/time/by-chapter`, () =>
    activity.fail ? HttpResponse.json({}, { status: 500 }) : HttpResponse.json(activity.chapters),
  ),

  http.post(`${BASE}/v1/instances/:instanceId/presence`, async ({ request }) => {
    const body = (await request.json()) as { source_id: string };
    presenceBeats.push(body.source_id);
    return HttpResponse.json({ active: presence.active });
  }),

  http.get(`${BASE}/v1/instances/:instanceId/report`, () =>
    HttpResponse.json({
      instance_id: state.instance.id, chapter_id: state.instance.chapter_id, completed: state.instance.state === "completed",
      nodes_done: state.instance.nodes_done, nodes_total: state.instance.nodes_total, outcomes: [], keep_practising: [],
      answers: { answered: 1, correct: 1 },
    })),
];
