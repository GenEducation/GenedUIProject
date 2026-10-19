import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import {
  FIGURE_GROUP, LESSON_ID, interruptRequests, lessonFixture, makeLessonInstance, replyScript, turnRequests,
} from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";

import { ChatPanel } from "../ChatPanel";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const box = () => screen.getByRole("textbox", { name: "Message your tutor" });
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });
const enter = (shiftKey = false) => fireEvent.keyDown(box(), { key: "Enter", shiftKey });

async function open(onShowFigure = vi.fn()) {
  await useLessonStore.getState().load(LESSON_ID);
  render(<ChatPanel onShowFigure={onShowFigure} />);
  return onShowFigure;
}

beforeEach(() => {
  lessonFixture.reset();
  useLessonStore.getState().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  // Start each test mid-lesson, so no opening turn runs.
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", teacher_text: "SYNTHETIC **welcome**.", created_at: "2026-10-09T10:24:00Z", figure_group_ids: [] }]);
});

describe("ChatPanel", () => {
  it("renders history as Markdown", async () => {
    await open();
    expect(screen.getByText("welcome").tagName).toBe("STRONG");
  });

  it("Enter sends and clears; the message and the streamed reply appear", async () => {
    await open();
    lessonFixture.setScript(replyScript("SYNTHETIC ", "answer."));
    type("SYNTHETIC question");
    enter();
    expect(box()).toHaveValue("");
    expect(await screen.findByText("SYNTHETIC answer.")).toBeInTheDocument();
    expect(screen.getByText("SYNTHETIC question")).toBeInTheDocument();
    expect(turnRequests.at(-1)).toMatchObject({ kind: "learner_message", text: "SYNTHETIC question" });
  });

  it("Shift+Enter is a new line, and an empty message can't be sent", async () => {
    await open();
    enter(true);
    type("   ");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    enter();
    expect(turnRequests).toEqual([]);
  });

  it("while the tutor replies, Send becomes Stop, and Stop interrupts", async () => {
    server.use(http.post(`${BASE}/v1/instances/:id/teacher-turns`, async ({ request }) => {
      const { turn_id } = (await request.json()) as { turn_id: string };
      const frame = (seq: number, body: object) => `id: ${turn_id}:${seq}\ndata: ${JSON.stringify({ v: 3, turn_id, seq, ...body })}\n\n`;
      const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(frame(1, { type: "turn_started" }) + frame(2, { type: "text_delta", text: "SYNTHETIC partial" }))); } });
      return new HttpResponse(stream, { headers: { "content-type": "text/event-stream" } });
    }));
    await open();
    type("SYNTHETIC question");
    enter();
    fireEvent.click(await screen.findByRole("button", { name: "Stop the reply" }));
    await waitFor(() => expect(interruptRequests).toHaveLength(1));
    expect(await screen.findByText("Stopped")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("a retryable failure offers Try again, which regenerates", async () => {
    await open();
    lessonFixture.setScript(() => [{ type: "turn_failed", reason: "model_error", retryable: true, retry: "regenerate" }]);
    type("SYNTHETIC question");
    enter();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your tutor couldn't answer just now.");
    lessonFixture.setScript(replyScript("SYNTHETIC second try."));
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("SYNTHETIC second try.")).toBeInTheDocument();
    expect(turnRequests.at(-1)?.kind).toBe("regenerate");
  });

  it("a turn the backend refuses shows the backend's reason, not a dropped connection", async () => {
    server.use(http.post(`${BASE}/v1/instances/:id/teacher-turns`, () =>
      HttpResponse.json({ status: "error", error_code: "TUTR_1503", message: "The teacher is not available right now.", request_id: "r", retryable: false, details: {} }, { status: 503 }),
    ));
    await open();
    type("SYNTHETIC question");
    enter();
    expect(await screen.findByRole("alert")).toHaveTextContent("The teacher is not available right now.");
  });

  it("a presented figure shows as a thumbnail that opens on the whiteboard", async () => {
    const onShowFigure = await open();
    lessonFixture.setScript(() => [
      { type: "figure_presented", figure_group_id: FIGURE_GROUP },
      { type: "text_delta", text: "SYNTHETIC look." },
      { type: "turn_completed", status: "completed", finish_reason: "stop" },
    ]);
    type("show me");
    enter();
    fireEvent.click(await screen.findByRole("button", { name: "Show this figure on the whiteboard" }));
    expect(onShowFigure).toHaveBeenCalledWith(FIGURE_GROUP);
  });

  it("can't send once the lesson is finished", async () => {
    lessonFixture.setInstance(makeLessonInstance({ state: "completed", next_action: "completed", active_node: null }));
    await open();
    expect(box()).toBeDisabled();
  });
});
