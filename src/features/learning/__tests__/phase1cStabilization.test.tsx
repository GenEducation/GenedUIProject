import { describe, it, expect, beforeEach, vi } from "vitest";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { LESSON_ID, lessonFixture, makeLessonInstance } from "@/test/msw/handlers/lesson";
import type { ContentLessonState } from "@/features/student/learner/types";
import { BookPanel, inActivePortion } from "../components/BookPanel";
import { useLessonStore } from "../useLessonStore";


// A stand-in for MathLive's field that behaves as the real one does: it holds its own value, follows `value` only when that
// prop changes, and reports Enter with the value it holds, which can be ahead of the last render.
vi.mock("../math/MathField", () => ({
  MathField: forwardRef(function FakeMathField(
    { value, onChange, onEnter }: { value: string; onChange: (v: string) => void; onEnter?: (v: string) => void },
    ref,
  ) {
    const el = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => ({
      focus: () => el.current?.focus(),
      insertText: () => {},
      clear: () => { if (el.current) el.current.value = ""; },
    }));
    useEffect(() => { if (el.current && el.current.value !== value) el.current.value = value; }, [value]);
    return (
      <input
        aria-label="Message your tutor"
        ref={el}
        defaultValue={value}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => { if (e.key === "Enter") onEnter?.((e.target as HTMLInputElement).value); }}
      />
    );
  }),
}));

const { ChatInput } = await import("../components/ChatInput");

describe("the chat box", () => {
  it("is empty after Enter even when Enter beat the render of the last keystroke", () => {
    const sent: string[] = [];
    render(<ChatInput replying={false} disabled={false} onSend={(m) => sent.push(m)} onStop={() => {}} subject="Mathematics" />);
    const box = screen.getByLabelText("Message your tutor") as HTMLInputElement;
    box.value = "SYNTHETIC what is a pattern"; // typed, but no input event rendered yet
    fireEvent.keyDown(box, { key: "Enter" });
    expect(sent).toEqual(["SYNTHETIC what is a pattern"]);
    expect(box.value).toBe("");
  });

  it("is empty after Enter in the ordinary case too", () => {
    const sent: string[] = [];
    render(<ChatInput replying={false} disabled={false} onSend={(m) => sent.push(m)} onStop={() => {}} subject="English" />);
    const box = screen.getByLabelText("Message your tutor") as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "SYNTHETIC hello" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(sent).toEqual(["SYNTHETIC hello"]);
    expect(box.value).toBe("");
  });
});

describe("the book panel", () => {
  const texts = [{
    id: "p1", title: "SYNTHETIC passage",
    parts: [{ segment: 1, glossary: [], paragraphs: [
      { id: "c1", text: "SYNTHETIC an earlier line that was taught before." },
      { id: "c2", text: "SYNTHETIC the line being taught right now in this part." },
    ] }],
  }];

  it("marks the portion being taught inside the book, and nothing else", () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(<BookPanel texts={texts as never} onClose={() => {}} activeLines={["SYNTHETIC the line being taught right now in this part."]} />);
    const marked = document.querySelectorAll("[data-active-portion]");
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveAttribute("aria-current", "true");
    expect(marked[0].textContent).toContain("being taught right now");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("marks nothing when no portion is being taught", () => {
    render(<BookPanel texts={texts as never} onClose={() => {}} />);
    expect(document.querySelectorAll("[data-active-portion]")).toHaveLength(0);
  });

  it("matches printed text across spacing, never on a stray short fragment", () => {
    expect(inActivePortion("SYNTHETIC  the line\nbeing taught", ["synthetic the line being taught"])).toBe(true);
    expect(inActivePortion("the", ["SYNTHETIC the line being taught"])).toBe(false);
    expect(inActivePortion("anything", [])).toBe(false);
  });
});

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const lesson = (over: Partial<ContentLessonState> = {}): ContentLessonState => ({
  phase: "teaching", unit_id: "u-1", portion_id: "p-1", pending_item_id: null, feedback_attempt_id: null,
  shown: true, channel: "chat", taught_units: [], unresolved_units: [], ...over,
});

describe("delivery receipts (R1)", () => {
  beforeEach(() => {
    lessonFixture.reset();
    useLessonStore.getState().reset();
    localStorage.setItem("gened_auth_token", "token-synthetic");
  });

  it("a receipt refused because another landed first is retried once, at the revision it reads again", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const progress = { unit_position: 1, unit_count: 2, taught: 0, to_revisit: 0 };
    lessonFixture.setInstance(makeLessonInstance({ revision: 7, content_lesson: lesson(), content_progress: progress }));
    lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
    server.use(
      http.post(`${BASE}/v1/instances/:id/content/turns/:turn/delivered`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        bodies.push(body);
        if (bodies.length === 1) {
          // Another receipt landed between this one's send and its arrival: the revision moved on.
          lessonFixture.setInstance(makeLessonInstance({ revision: 9, content_lesson: lesson(), content_progress: progress }));
          return HttpResponse.json({ code: "stale_revision" }, { status: 409 });
        }
        return HttpResponse.json({ revision: 10, lesson: lesson(), source: [] });
      }),
    );
    await useLessonStore.getState().load(LESSON_ID);
    await act(() => useLessonStore.getState().send("SYNTHETIC I read it."));
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1].expected_revision).toBe(9);
    expect(bodies[0].request_id).not.toBe(bodies[1].request_id);
    expect(bodies[1]).toMatchObject({ channel: "chat", boundary: "text_rendered", terminal_seq: bodies[0].terminal_seq });
  });

  const feedbackOwed = () => {
    const progress = { unit_position: 4, unit_count: 13, taught: 3, to_revisit: 0 };
    lessonFixture.setInstance(makeLessonInstance({
      revision: 12,
      content_lesson: lesson({ phase: "feedback", portion_id: null, feedback_attempt_id: "attempt-synthetic", pending_item_id: "item-synthetic" }),
      content_progress: progress,
    }));
  };
  const receipts = () => {
    const seen: Array<{ turn: string; body: Record<string, unknown> }> = [];
    server.use(http.post(`${BASE}/v1/instances/:id/content/turns/:turn/delivered`, async ({ params, request }) => {
      seen.push({ turn: String(params.turn), body: (await request.json()) as Record<string, unknown> });
      return HttpResponse.json({ revision: 13, lesson: lesson(), source: [] });
    }));
    return seen;
  };

  it("a reload while the feedback reply is still streaming follows it to its end and acknowledges it", async () => {
    feedbackOwed();
    const seen = receipts();
    lessonFixture.setHistory([
      { turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] },
      { turn_id: "t-feedback", kind: "result_reaction", status: "open", created_at: "y", figure_group_ids: [] } as never,
    ]);
    lessonFixture.setLog("t-feedback", [
      { type: "turn_started", kind: "result_reaction", instance_node_id: "n", instance_revision: 12, protocol: "teacher_turn_stream_v3" } as never,
      { type: "text_delta", text: "SYNTHETIC thank you for answering." } as never,
      { type: "turn_completed", status: "completed", finish_reason: "stop" } as never,
    ]);
    await useLessonStore.getState().load(LESSON_ID);
    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].turn).toBe("t-feedback");
    expect(seen[0].body).toMatchObject({ channel: "chat", boundary: "text_rendered", terminal_seq: 3 });
  });

  it("a reload after the feedback reply finished but before its receipt is attached to that reply, shown once, and acknowledged", async () => {
    feedbackOwed();
    const seen = receipts();
    lessonFixture.setHistory([
      { turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] },
      { turn_id: "t-feedback", kind: "result_reaction", status: "completed", created_at: "y", figure_group_ids: [], teacher_text: "SYNTHETIC thank you for answering.", transcript_through_seq: 3 } as never,
    ]);
    // The server attaches the resumed request to the existing reaction and replays it under that reaction's id.
    server.use(http.post(`${BASE}/v1/instances/:id/teacher-turns`, () => new HttpResponse(
      [
        { v: 3, turn_id: "t-feedback", seq: 1, type: "turn_started", kind: "result_reaction", instance_node_id: "n", instance_revision: 12, protocol: "teacher_turn_stream_v3" },
        { v: 3, turn_id: "t-feedback", seq: 2, type: "text_delta", text: "SYNTHETIC thank you for answering." },
        { v: 3, turn_id: "t-feedback", seq: 3, type: "turn_completed", status: "completed", finish_reason: "stop" },
      ].map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""),
      { headers: { "content-type": "text/event-stream" } },
    )));
    await useLessonStore.getState().load(LESSON_ID);
    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].turn).toBe("t-feedback");
    const shown = useLessonStore.getState().turns.filter((t) => t.kind === "result_reaction");
    expect(shown).toHaveLength(1);
    expect(shown[0].turnId).toBe("t-feedback");
  });
});

