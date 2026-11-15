import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { LESSON_ID, lessonFixture, makeLessonInstance, turnRequests } from "@/test/msw/handlers/lesson";
import type { ContentLessonState, InstanceState } from "@/features/student/learner/types";
import { ContentPortion, rendersExactly } from "../components/ContentPortion";
import { useLessonStore } from "../useLessonStore";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const PORTION = "77777777-0000-4000-8000-000000000001";
const LINES = ["SYNTHETIC first printed line.", "SYNTHETIC second printed line."];

const lesson = (over: Partial<ContentLessonState> = {}): ContentLessonState => ({
  phase: "teaching", unit_id: "u-1", portion_id: null, pending_item_id: null, feedback_attempt_id: null,
  shown: false, channel: "chat", taught_units: [], unresolved_units: [], ...over,
});
const contentInstance = (over: Partial<ContentLessonState> = {}, progress = { unit_position: 3, unit_count: 13, taught: 0, to_revisit: 0 }): InstanceState =>
  makeLessonInstance({ revision: 7, content_lesson: lesson(over), content_progress: progress });

const store = () => useLessonStore.getState();
let assignments: Array<Record<string, unknown> | null>;
let shown: Array<{ portion: string; body: Record<string, unknown> }>;
let delivered: Array<{ turn: string; body: Record<string, unknown> }>;

beforeEach(() => {
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  assignments = [];
  shown = [];
  delivered = [];
  server.use(
    http.get(`${BASE}/v1/instances/:id/content/assignment`, () => {
      assignments.push(null);
      return HttpResponse.json({ revision: 7, lesson: lesson({ portion_id: PORTION }), source: LINES });
    }),
    http.post(`${BASE}/v1/instances/:id/content/assignment`, async ({ request }) => {
      assignments.push((await request.json()) as Record<string, unknown>);
      const assigned = contentInstance({ portion_id: PORTION });
      lessonFixture.setInstance({ ...assigned, revision: 8 });
      return HttpResponse.json({ revision: 8, lesson: lesson({ portion_id: PORTION }), source: LINES });
    }),
    http.post(`${BASE}/v1/instances/:id/content/portions/:portion/shown`, async ({ params, request }) => {
      shown.push({ portion: String(params.portion), body: (await request.json()) as Record<string, unknown> });
      return HttpResponse.json({ revision: 9, lesson: lesson({ portion_id: PORTION, shown: true }), source: [] });
    }),
    http.post(`${BASE}/v1/instances/:id/content/turns/:turn/delivered`, async ({ params, request }) => {
      delivered.push({ turn: String(params.turn), body: (await request.json()) as Record<string, unknown> });
      return HttpResponse.json({ revision: 10, lesson: lesson({ portion_id: PORTION, shown: true }), source: [] });
    }),
  );
});

describe("rendersExactly", () => {
  it("accepts only the assigned portion with every printed line, in order", () => {
    const el = document.createElement("div");
    el.dataset.portionId = PORTION;
    el.innerHTML = LINES.map((l) => `<p data-source-line>${l}</p>`).join("");
    expect(rendersExactly(el, PORTION, LINES)).toBe(true);
    expect(rendersExactly(el, "another-portion", LINES)).toBe(false);
    expect(rendersExactly(el, PORTION, [LINES[0]])).toBe(false);
    expect(rendersExactly(el, PORTION, [...LINES].reverse())).toBe(false);
    expect(rendersExactly(null, PORTION, LINES)).toBe(false);
  });
});

describe("ContentPortion", () => {
  it("asks for a portion only when none is assigned, shows it exactly, marks it, and confirms it once", async () => {
    lessonFixture.setInstance(contentInstance());
    await store().load(LESSON_ID);
    render(<ContentPortion instanceId={LESSON_ID} />);
    await waitFor(() => expect(screen.getByTestId("current-portion")).toBeInTheDocument());
    // One assignment, at the revision the learner saw; after it, the state is only read again.
    expect(assignments.filter(Boolean)).toEqual([{ request_id: expect.any(String), expected_revision: 7, channel: "chat" }]);
    const panel = screen.getByTestId("current-portion");
    expect(panel).toHaveAttribute("aria-current", "true");
    expect(panel).toHaveAttribute("data-portion-id", PORTION);
    expect(Array.from(panel.querySelectorAll("p")).map((p) => p.textContent)).toEqual(LINES);
    await waitFor(() => expect(shown).toHaveLength(1));
    expect(shown[0]).toMatchObject({ portion: PORTION, body: { channel: "chat" } });
    expect(screen.getByTestId("chapter-position")).toHaveTextContent("Part 3 of 13 of the chapter");
  });

  it("an already assigned portion is read, never assigned again", async () => {
    lessonFixture.setInstance(contentInstance({ portion_id: PORTION }));
    await store().load(LESSON_ID);
    render(<ContentPortion instanceId={LESSON_ID} />);
    await waitFor(() => expect(screen.getByTestId("current-portion")).toBeInTheDocument());
    expect(assignments).toEqual([null]);
  });

  it("confirms nothing while the tab is hidden", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    lessonFixture.setInstance(contentInstance({ portion_id: PORTION }));
    await store().load(LESSON_ID);
    render(<ContentPortion instanceId={LESSON_ID} />);
    await waitFor(() => expect(screen.getByTestId("current-portion")).toBeInTheDocument());
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(shown).toEqual([]);
    visibility.mockRestore();
  });

  it("shows how many parts are to come back to", async () => {
    lessonFixture.setInstance(contentInstance({ portion_id: PORTION }, { unit_position: 5, unit_count: 13, taught: 3, to_revisit: 1 }));
    await store().load(LESSON_ID);
    render(<ContentPortion instanceId={LESSON_ID} />);
    expect(await screen.findByTestId("chapter-position")).toHaveTextContent("Part 5 of 13 of the chapter · 1 to come back to");
  });
});

describe("content-led turns", () => {
  it("loading never starts a reply by itself; the first open starts one opening after its portion is assigned", async () => {
    lessonFixture.setInstance(contentInstance());
    await store().load(LESSON_ID);
    expect(turnRequests).toEqual([]);
    render(<ContentPortion instanceId={LESSON_ID} />);
    await waitFor(() => expect(turnRequests.map((r) => r.kind)).toEqual(["opening"]));
    await act(() => new Promise((r) => setTimeout(r, 50)));
    store().openContentLesson();
    expect(turnRequests).toHaveLength(1);
  });

  it("a lesson already under way opens nothing: a step change is folded into the learner's next action", async () => {
    lessonFixture.setInstance(contentInstance({ portion_id: PORTION }, { unit_position: 4, unit_count: 13, taught: 3, to_revisit: 0 }));
    await store().load(LESSON_ID);
    render(<ContentPortion instanceId={LESSON_ID} />);
    await waitFor(() => expect(screen.getByTestId("current-portion")).toBeInTheDocument());
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(turnRequests).toEqual([]);
  });

  it("a completed text reply is acknowledged once, at the revision it was admitted on, after it was rendered", async () => {
    lessonFixture.setInstance(contentInstance({ portion_id: PORTION, shown: true }));
    lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
    await store().load(LESSON_ID);
    await store().send("SYNTHETIC I read it.");
    await waitFor(() => expect(delivered).toHaveLength(1));
    const turn = store().turns.at(-1)!;
    expect(delivered[0]).toEqual({
      turn: turn.turnId,
      body: { request_id: expect.any(String), expected_revision: 7, channel: "chat", terminal_seq: turn.lastSeq, boundary: "text_rendered" },
    });
    const turnsBefore = turnRequests.length;
    await store().refreshContent();
    expect(turnRequests).toHaveLength(turnsBefore); // a refresh re-reads state and starts no reply
  });

  it("an interrupted reply is never acknowledged", async () => {
    lessonFixture.setInstance(contentInstance({ portion_id: PORTION, shown: true }));
    lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
    await store().load(LESSON_ID);
    lessonFixture.setScript(() => [
      { type: "text_delta", text: "SYNTHETIC half" },
      { type: "turn_interrupted", status: "interrupted", cause: "client_stop" } as never,
    ]);
    await store().send("SYNTHETIC wait");
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(delivered).toEqual([]);
  });

  it("a reload while feedback is owed resumes that answer's feedback reply once, and acknowledges it", async () => {
    lessonFixture.setInstance(contentInstance({ phase: "feedback", feedback_attempt_id: "attempt-synthetic", pending_item_id: "item-synthetic", shown: true }));
    lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
    await store().load(LESSON_ID);
    await waitFor(() => expect(delivered).toHaveLength(1));
    expect(turnRequests.map((r) => [r.kind, r.attempt_id])).toEqual([["result_reaction", "attempt-synthetic"]]);
    expect(delivered[0].body).toMatchObject({ channel: "chat", boundary: "text_rendered" });
  });

  it("a reload with nothing owed starts no reply", async () => {
    lessonFixture.setInstance(contentInstance({ phase: "question_open", pending_item_id: "item-synthetic", shown: true }));
    lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
    await store().load(LESSON_ID);
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(turnRequests).toEqual([]);
  });
});
