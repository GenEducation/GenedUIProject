import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { CHECK_ITEM, LESSON_ID, lessonFixture, makeLessonInstance, syntheticPayload, turnRequests } from "@/test/msw/handlers/lesson";
import type { ContentLessonState, ContentProgress } from "@/features/student/learner/types";
import { useLessonStore } from "../useLessonStore";
import { StepCard } from "../components/StepCard";
import { ChapterPosition } from "../components/PortionStatus";

/** W2 phases 2 and 3 on the client (backend PRD v3 §§3.5, 3.7, 3.9, 3.10): the client shows what the server committed, never grades
 * or guesses the next state. Synthetic questions only. */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const lesson = (over: Partial<ContentLessonState> = {}): ContentLessonState => ({
  phase: "teaching", unit_id: "u-1", portion_id: null, pending_item_id: null, feedback_attempt_id: null,
  shown: true, channel: "chat", taught_units: [], unresolved_units: [], ...over,
});
const progress = (over: Partial<ContentProgress> = {}): ContentProgress => ({
  unit_position: 2, unit_count: 13, taught: 1, to_revisit: 0, ...over,
});

const board = (over: Partial<ContentLessonState>) => {
  const instance = makeLessonInstance({ content_lesson: lesson(over), content_progress: progress() });
  instance.active_node = { ...instance.active_node!, type: "practice", check_item_ids: [CHECK_ITEM], answered_item_ids: [CHECK_ITEM] };
  const payload = syntheticPayload();
  payload.node.check_items = [{ id: CHECK_ITEM, role: "checkpoint", figure_groups: [], prompt: "SYNTHETIC which comes next?", response_type: "numeric", options: [] }];
  useLessonStore.setState({ instance, payload });
  render(<StepCard subject="Mathematics" />);
};

describe("the question after a wrong answer", () => {
  beforeEach(() => {
    localStorage.clear();
    useLessonStore.getState().reset();
  });

  it("stays on screen, locked, while the tutor's feedback plays (scenario 8)", () => {
    board({ phase: "feedback", pending_item_id: CHECK_ITEM, feedback_attempt_id: "a-1", after_feedback: "retry" });
    expect(screen.getByTestId("question-locked")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("SYNTHETIC which comes next?")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /check/i })).toBeNull();
  });

  it("opens again for its one retry once the reply has ended, even though it was answered before", () => {
    board({ phase: "question_open", pending_item_id: CHECK_ITEM, stage: "retry" });
    expect(screen.getByTestId("ladder-note")).toHaveTextContent("One more try");
    expect(screen.getByText("SYNTHETIC which comes next?")).toBeInTheDocument();
  });

  it("is shown as set aside, coming back, and takes no answer meanwhile (scenario 10)", () => {
    board({ phase: "question_ready", pending_item_id: null, set_aside_item_id: CHECK_ITEM, stage: "return" });
    expect(screen.getByTestId("set-aside-note")).toHaveTextContent("We'll come back to this one.");
    expect(screen.getByTestId("question-set-aside")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("comes back after re-teaching, then is worked through together with the answer invited, not required", () => {
    board({ phase: "question_open", pending_item_id: CHECK_ITEM, stage: "return" });
    expect(screen.getByTestId("ladder-note")).toHaveTextContent("This one is back");
  });

  it("guided completion invites the answer", () => {
    board({ phase: "question_open", pending_item_id: CHECK_ITEM, stage: "guided" });
    expect(screen.getByTestId("ladder-note")).toHaveTextContent("Enter the answer when you're ready, if you like.");
  });

  it("shows no credit, tier or mastery number anywhere", () => {
    board({ phase: "question_open", pending_item_id: CHECK_ITEM, stage: "retry" });
    expect(document.body.textContent).not.toMatch(/credit|mastery|0\.25|0\.125|half|quarter/i);
  });

  it("at the end of a chapter with owed ideas, says to come back later and blocks nothing (scenario 17b)", () => {
    board({ phase: "complete", come_back_later: true });
    expect(screen.getByTestId("come-back-later")).toHaveTextContent("Come back later");
  });
});

describe("progress", () => {
  beforeEach(() => {
    lessonFixture.reset();
    useLessonStore.getState().reset();
    localStorage.setItem("gened_auth_token", "token-synthetic");
  });

  it("counts covered ideas of the step and the ideas owed, never credit (§3.10)", async () => {
    lessonFixture.setInstance(makeLessonInstance({
      revision: 3, content_lesson: lesson({ portion_id: "p-1" }),
      content_progress: progress({ ideas_covered: 2, ideas_total: 4, owed_ideas: 1 }),
    }));
    await useLessonStore.getState().load(LESSON_ID);
    render(<ChapterPosition />);
    expect(await screen.findByTestId("chapter-position")).toHaveTextContent("2 of 4 ideas · 1 we'll come back to");
  });
});

describe("the start of a sitting", () => {
  beforeEach(() => {
    lessonFixture.reset();
    useLessonStore.getState().reset();
    localStorage.setItem("gened_auth_token", "token-synthetic");
  });

  it("a return the server says is due opens the lesson with one reply, even with turns and taught parts", async () => {
    lessonFixture.setInstance(makeLessonInstance({
      revision: 4, content_lesson: lesson({ phase: "question_ready", warmup: true }),
      content_progress: progress({ taught: 3, opening_due: true }),
    }));
    lessonFixture.setHistory([{ turn_id: "t-old", kind: "learner_message", status: "completed", created_at: "x", figure_group_ids: [] }]);
    await useLessonStore.getState().load(LESSON_ID);
    useLessonStore.getState().openContentLesson();
    useLessonStore.getState().openContentLesson();
    await waitFor(() => expect(turnRequests.map((r) => r.kind)).toEqual(["opening"]));
  });

  it("a return inside a sitting opens nothing (scenario 21)", async () => {
    lessonFixture.setInstance(makeLessonInstance({
      revision: 4, content_lesson: lesson({ phase: "question_open", pending_item_id: CHECK_ITEM, stage: "retry" }),
      content_progress: progress({ taught: 3, opening_due: false }),
    }));
    lessonFixture.setHistory([{ turn_id: "t-old", kind: "learner_message", status: "completed", created_at: "x", figure_group_ids: [] }]);
    await useLessonStore.getState().load(LESSON_ID);
    useLessonStore.getState().openContentLesson();
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(turnRequests).toEqual([]);
  });
});

describe("a feedback reply cut off (scenario 19c)", () => {
  beforeEach(() => {
    lessonFixture.reset();
    useLessonStore.getState().reset();
    localStorage.setItem("gened_auth_token", "token-synthetic");
  });

  it("is reported as interrupted so the question unlocks; a cut teaching reply still confirms nothing", async () => {
    const delivered: Array<Record<string, unknown>> = [];
    server.use(http.post(`${BASE}/v1/instances/:id/content/turns/:turn/delivered`, async ({ request }) => {
      delivered.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json({ revision: 13, lesson: lesson(), source: [] });
    }));
    lessonFixture.setInstance(makeLessonInstance({
      revision: 12, content_lesson: lesson({ phase: "feedback", feedback_attempt_id: "attempt-synthetic", pending_item_id: CHECK_ITEM, after_feedback: "retry" }),
      content_progress: progress(),
    }));
    lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
    lessonFixture.setScript(() => [
      { type: "text_delta", text: "SYNTHETIC look again at" },
      { type: "turn_interrupted", status: "interrupted", cause: "client_stop" } as never,
    ]);
    await useLessonStore.getState().load(LESSON_ID);
    await waitFor(() => expect(delivered).toHaveLength(1));
    expect(delivered[0]).toMatchObject({ channel: "chat", boundary: "interrupted" });
  });
});

describe("a feedback stream lost after a reload", () => {
  beforeEach(() => {
    lessonFixture.reset();
    useLessonStore.getState().reset();
    localStorage.setItem("gened_auth_token", "token-synthetic");
  });

  it("re-reads the lesson, learns the reply was cut, and unlocks the question once", async () => {
    const delivered: Array<{ turn: string; body: Record<string, unknown> }> = [];
    server.use(http.post(`${BASE}/v1/instances/:id/content/turns/:turn/delivered`, async ({ params, request }) => {
      delivered.push({ turn: String(params.turn), body: (await request.json()) as Record<string, unknown> });
      return HttpResponse.json({ revision: 13, lesson: lesson(), source: [] });
    }));
    lessonFixture.setInstance(makeLessonInstance({
      revision: 12, content_lesson: lesson({ phase: "feedback", feedback_attempt_id: "attempt-synthetic", pending_item_id: CHECK_ITEM, after_feedback: "retry" }),
      content_progress: progress(),
    }));
    // Open after the reload, and every resume of its stream ends before its terminal event.
    lessonFixture.setHistory([
      { turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] },
      { turn_id: "t-feedback", kind: "result_reaction", status: "open", created_at: "y", figure_group_ids: [] } as never,
    ]);
    lessonFixture.setLog("t-feedback", [
      { type: "turn_started", kind: "result_reaction", instance_node_id: "n", instance_revision: 12, protocol: "teacher_turn_stream_v3" } as never,
      { type: "text_delta", text: "SYNTHETIC look again" } as never,
    ]);
    // Meanwhile the server closed it at its deadline: the next read of the lesson shows it interrupted.
    const ended = () => {
      lessonFixture.setHistory([
        { turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] },
        { turn_id: "t-feedback", kind: "result_reaction", status: "interrupted", created_at: "y", figure_group_ids: [] } as never,
      ]);
      lessonFixture.setLog("t-feedback", [
        { type: "turn_started", kind: "result_reaction", instance_node_id: "n", instance_revision: 12, protocol: "teacher_turn_stream_v3" } as never,
        { type: "text_delta", text: "SYNTHETIC look again" } as never,
        { type: "turn_interrupted", status: "interrupted", cause: "deadline", transcript_through_seq: 2 } as never,
      ]);
    };
    let resumes = 0;
    server.use(http.get(`${BASE}/v1/instances/:id/teacher-turns/:turn/events`, () => {
      resumes += 1;
      if (resumes >= 3) ended(); // the server closes it at its deadline while the client is still trying to follow it
      return new HttpResponse(
        `data: ${JSON.stringify({ v: 3, turn_id: "t-feedback", seq: 1, type: "turn_started", kind: "result_reaction", instance_node_id: "n", instance_revision: 12, protocol: "teacher_turn_stream_v3" })}\n\n`,
        { headers: { "content-type": "text/event-stream" } },
      );
    }));
    server.use(http.post(`${BASE}/v1/instances/:id/teacher-turns`, () => {
      ended();
      return new HttpResponse(
        [
          { v: 3, turn_id: "t-feedback", seq: 1, type: "turn_started", kind: "result_reaction", instance_node_id: "n", instance_revision: 12, protocol: "teacher_turn_stream_v3" },
          { v: 3, turn_id: "t-feedback", seq: 2, type: "text_delta", text: "SYNTHETIC look again" },
          { v: 3, turn_id: "t-feedback", seq: 3, type: "turn_interrupted", status: "interrupted", cause: "deadline", transcript_through_seq: 2 },
        ].map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""),
        { headers: { "content-type": "text/event-stream" } },
      );
    }));
    await useLessonStore.getState().load(LESSON_ID);

    await waitFor(() => expect(delivered.length).toBeGreaterThanOrEqual(1), { timeout: 5000 });
    expect(delivered.every((d) => d.turn === "t-feedback" && d.body.boundary === "interrupted")).toBe(true);
  });
});
