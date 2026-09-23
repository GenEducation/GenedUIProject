import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLessonStore } from "../useLessonStore";
import { lessonService } from "../../services/lessonService";
import { openTeacherTurnStream, resumeTeacherTurnStream } from "../../services/teacherTurnStream";
import type { InstanceState, TeacherPayload, TeacherTurnStreamFrame, TurnRequest } from "../../types/lesson";

vi.mock("../../services/lessonService", () => ({
  lessonService: {
    openInstance: vi.fn(),
    getInstance: vi.fn(),
    getTeacherPayload: vi.fn(),
    submitAnswer: vi.fn(),
    recordEngagement: vi.fn(),
    recordHint: vi.fn(),
    markDone: vi.fn(),
    getReport: vi.fn(),
    getTeacherTurns: vi.fn(),
    interruptTurn: vi.fn(),
  },
}));

vi.mock("../../services/teacherTurnStream", () => ({
  openTeacherTurnStream: vi.fn(),
  resumeTeacherTurnStream: vi.fn(),
}));

const service = vi.mocked(lessonService);
const openStream = vi.mocked(openTeacherTurnStream);
const resumeStream = vi.mocked(resumeTeacherTurnStream);

function activeInstance(overrides: Partial<InstanceState> = {}): InstanceState {
  return {
    id: "inst-1",
    chapter_id: "ch-1",
    plan_version_id: "plan-1",
    revision: 1,
    state: "active",
    nodes_done: 0,
    nodes_total: 3,
    next_action: "learn",
    active_node: {
      instance_node_id: "node-1",
      node_id: "node-1",
      title: "Equal parts",
      type: "teach",
      reason: "canonical",
      engagement_count: 0,
      engagement_required: 2,
      check_item_ids: [],
      answered_item_ids: [],
      round_id: null,
      round_ordinal: null,
    },
    blocked: null,
    ...overrides,
  };
}

const payload: TeacherPayload = {
  node: {
    id: "node-1",
    title: "Equal parts",
    type: "teach",
    teach_only: true,
    sections: [],
    assets: [],
    tools: [],
    check_items: [],
    bloom: "understand",
    est_minutes: 5,
  },
};

/** Captures the handlers a stream-open call was given, so a test can feed it frames directly. */
function captureHandlers(mock: typeof openStream | typeof resumeStream) {
  let handlers: { onFrame: (f: TeacherTurnStreamFrame) => void; onGiveUp?: (e: unknown) => void } | undefined;
  mock.mockImplementation((...args: unknown[]) => {
    handlers = args[args.length - 1] as typeof handlers;
    return { close: vi.fn() };
  });
  return () => handlers!;
}

describe("useLessonStore", () => {
  beforeEach(() => {
    useLessonStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    useLessonStore.getState().reset();
  });

  it("opens a chapter, loads the payload, and opens a teacher turn for a node with no transcript", async () => {
    const instance = activeInstance();
    service.openInstance.mockResolvedValue(instance);
    service.getTeacherPayload.mockResolvedValue(payload);
    service.getTeacherTurns.mockResolvedValue([]);
    const getHandlers = captureHandlers(openStream);

    await useLessonStore.getState().loadChapter("ch-1");

    expect(service.openInstance).toHaveBeenCalledWith("ch-1");
    expect(useLessonStore.getState().phase).toBe("ready");
    expect(useLessonStore.getState().payload).toEqual(payload);
    expect(openStream).toHaveBeenCalledTimes(1);
    const [instanceId, request] = openStream.mock.calls[0] as [string, TurnRequest, unknown];
    expect(instanceId).toBe("inst-1");
    expect(request.kind).toBe("opening");
    expect(useLessonStore.getState().openTurnId).toBe(request.turn_id);

    // Streaming text_delta frames append to the transcript in seq order.
    getHandlers().onFrame({
      v: 2,
      type: "text_delta",
      turn_id: request.turn_id,
      seq: 1,
      text: "Hi there. ",
      redacted: false,
      suppressed: false,
    });
    getHandlers().onFrame({
      v: 2,
      type: "turn_completed",
      turn_id: request.turn_id,
      seq: 2,
      status: "completed",
      finish_reason: "stop",
      first_token_ms: 10,
      duration_ms: 20,
    });

    expect(useLessonStore.getState().transcript[0].teacherText).toBe("Hi there. ");
    expect(useLessonStore.getState().transcript[0].status).toBe("completed");
    expect(useLessonStore.getState().openTurnId).toBeNull();
  });

  it("reattaches to a still-open turn recorded on reload instead of opening a new one", async () => {
    const instance = activeInstance();
    service.openInstance.mockResolvedValue(instance);
    service.getTeacherPayload.mockResolvedValue(payload);
    service.getTeacherTurns.mockResolvedValue([
      {
        turn_id: "open-turn",
        kind: "opening",
        status: "streaming",
        created_at: "2026-01-01T00:00:00Z",
        closed_at: null,
        learner_text: null,
        teacher_text: "Partial reply",
        attempt_id: null,
        item_id: null,
        outcome: null,
        correct: null,
        route: null,
        redacted: false,
        committed_through_seq: 2,
        transcript_through_seq: null,
        learner_visible_through_seq: null,
        visibility_source: null,
      },
    ]);

    await useLessonStore.getState().loadChapter("ch-1");

    expect(openStream).not.toHaveBeenCalled();
    expect(resumeStream).toHaveBeenCalledWith("inst-1", "open-turn", 2, expect.anything());
    expect(useLessonStore.getState().openTurnId).toBe("open-turn");
    expect(useLessonStore.getState().transcript[0].teacherText).toBe("Partial reply");
  });

  it("sends a learner message as engagement, then opens a learner_message turn interrupting the open one", async () => {
    const instance = activeInstance();
    service.openInstance.mockResolvedValue(instance);
    service.getTeacherPayload.mockResolvedValue(payload);
    service.getTeacherTurns.mockResolvedValue([]);
    service.recordEngagement.mockResolvedValue({ ...instance, revision: 2 });
    const getHandlers = captureHandlers(openStream);
    await useLessonStore.getState().loadChapter("ch-1");
    const openingTurnId = useLessonStore.getState().openTurnId!;

    getHandlers().onFrame({
      v: 2,
      type: "text_delta",
      turn_id: openingTurnId,
      seq: 1,
      text: "Partial",
      redacted: false,
      suppressed: false,
    });

    await useLessonStore.getState().sendMessage("why is that?");

    expect(service.recordEngagement).toHaveBeenCalledWith(
      "inst-1",
      expect.objectContaining({ expected_revision: 1, source: "student_text" }),
    );
    expect(useLessonStore.getState().instance?.revision).toBe(2);

    const [, secondRequest] = openStream.mock.calls[1] as [string, TurnRequest, unknown];
    expect(secondRequest.kind).toBe("learner_message");
    expect(secondRequest.text).toBe("why is that?");
    expect(secondRequest.interrupts).toEqual({ turn_id: openingTurnId, visible_seq: 1 });
  });

  it("calls interruptTurn with the visible seq on stopTeacher", async () => {
    const instance = activeInstance();
    service.openInstance.mockResolvedValue(instance);
    service.getTeacherPayload.mockResolvedValue(payload);
    service.getTeacherTurns.mockResolvedValue([]);
    service.interruptTurn.mockResolvedValue({
      turn_id: "t",
      status: "interrupted",
      transcript_through_seq: 1,
      learner_visible_through_seq: 1,
      visibility_source: "learner_reported",
    });
    const getHandlers = captureHandlers(openStream);
    await useLessonStore.getState().loadChapter("ch-1");
    const turnId = useLessonStore.getState().openTurnId!;
    getHandlers().onFrame({
      v: 2,
      type: "text_delta",
      turn_id: turnId,
      seq: 1,
      text: "Hi",
      redacted: false,
      suppressed: false,
    });

    await useLessonStore.getState().stopTeacher();

    expect(service.interruptTurn).toHaveBeenCalledWith("inst-1", turnId, { visible_seq: 1 });
  });

  it("submits an answer, then opens a result_reaction turn carrying the attempt id", async () => {
    const instance = activeInstance();
    service.openInstance.mockResolvedValue(instance);
    service.getTeacherPayload.mockResolvedValue(payload);
    service.getTeacherTurns.mockResolvedValue([]);
    service.submitAnswer.mockResolvedValue({
      attempt_id: "attempt-1",
      outcome: "correct",
      correct: true,
      eligibility_reason: null,
      round_id: "round-1",
      round_state: "passed",
      replayed: false,
      instance,
    });
    captureHandlers(openStream);
    await useLessonStore.getState().loadChapter("ch-1");
    openStream.mockClear();

    await useLessonStore.getState().submitAnswer("item-1", { kind: "numeric", value: "1/2" }, 500);

    expect(service.submitAnswer).toHaveBeenCalledWith(
      "inst-1",
      expect.objectContaining({ item_id: "item-1", channel: "typed", response: { kind: "numeric", value: "1/2" } }),
    );
    expect(useLessonStore.getState().lastAnswerFeedback).toEqual({
      itemId: "item-1",
      attemptId: "attempt-1",
      outcome: "correct",
      correct: true,
      roundState: "passed",
    });
    const [, reactionRequest] = openStream.mock.calls[0] as [string, TurnRequest, unknown];
    expect(reactionRequest.kind).toBe("result_reaction");
    expect(reactionRequest.attempt_id).toBe("attempt-1");
  });

  it("sends channel 'choice' for an mcq answer, never 'typed' (backend 422s CORE_3105 otherwise)", async () => {
    const instance = activeInstance();
    service.openInstance.mockResolvedValue(instance);
    service.getTeacherPayload.mockResolvedValue(payload);
    service.getTeacherTurns.mockResolvedValue([]);
    service.submitAnswer.mockResolvedValue({
      attempt_id: "attempt-2",
      outcome: "correct",
      correct: true,
      eligibility_reason: null,
      round_id: "round-1",
      round_state: "passed",
      replayed: false,
      instance,
    });
    captureHandlers(openStream);
    await useLessonStore.getState().loadChapter("ch-1");

    await useLessonStore.getState().submitAnswer("item-2", { kind: "choice", option_ids: ["opt-1"] }, 500);

    expect(service.submitAnswer).toHaveBeenCalledWith(
      "inst-1",
      expect.objectContaining({ channel: "choice", response: { kind: "choice", option_ids: ["opt-1"] } }),
    );
  });

  it("reloads the whole chapter on a stale_node error from sendMessage", async () => {
    const instance = activeInstance();
    service.openInstance.mockResolvedValue(instance);
    service.getTeacherPayload.mockResolvedValue(payload);
    service.getTeacherTurns.mockResolvedValue([]);
    captureHandlers(openStream);
    await useLessonStore.getState().loadChapter("ch-1");

    service.recordEngagement.mockRejectedValue(Object.assign(new Error("stale"), { error_code: "stale_node" }));
    service.openInstance.mockClear();

    await useLessonStore.getState().sendMessage("hi");

    expect(service.openInstance).toHaveBeenCalledWith("ch-1");
  });

  it("marks the open turn failed when the stream gives up", async () => {
    const instance = activeInstance();
    service.openInstance.mockResolvedValue(instance);
    service.getTeacherPayload.mockResolvedValue(payload);
    service.getTeacherTurns.mockResolvedValue([]);
    const getHandlers = captureHandlers(openStream);
    await useLessonStore.getState().loadChapter("ch-1");
    const turnId = useLessonStore.getState().openTurnId!;

    getHandlers().onGiveUp?.(new Error("gave up"));

    expect(useLessonStore.getState().transcript.find((t) => t.turnId === turnId)?.status).toBe("failed");
    expect(useLessonStore.getState().openTurnId).toBeNull();
  });
});
